"use client";

import { useState, useEffect } from "react";
import { api } from "@/trpc/react";
import { getCookie, setCookie } from "cookies-next";
import type { TRPCClientErrorLike } from "@trpc/client";
import Link from "next/link";

type Prompt = {
  id: number;
  text: string;
  username?: string;
  votes: number;
  status: string;
  createdAt: Date;
};

export default function PromptVoting() {
  const [prompt, setPrompt] = useState("");
  const [username, setUsername] = useState("");
  const [voterId, setVoterId] = useState<string | null>(null);
  const [timer, setTimer] = useState<number>(120);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Check if mobile on mount
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Get or create a voter ID for this user
  const voterIdQuery = api.prompt.getVoterId.useQuery(undefined, {
    enabled: !voterId,
  });
  
  // Set voter ID when the query returns
  useEffect(() => {
    if (voterIdQuery.data?.voterId) {
      const id = voterIdQuery.data.voterId;
      setCookie("voterId", id, { maxAge: 60 * 60 * 24 });
      setVoterId(id);
    }
  }, [voterIdQuery.data]);
  
  // Get existing voterId from cookie
  useEffect(() => {
    const existingVoterId = getCookie("voterId");
    if (existingVoterId && typeof existingVoterId === "string") {
      setVoterId(existingVoterId);
    }
  }, []);
  
  // Fetch prompts periodically
  const promptsQuery = api.prompt.getAll.useQuery(
    { seconds: 3600, limit: 50 },
    { 
      refetchInterval: 30000, // Always refresh every 30 seconds, even when voting is inactive
      refetchIntervalInBackground: true,
    }
  );
  
  // Timer countdown
  useEffect(() => {
    if (!isActive) return;
    
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prevTimer) => prevTimer - 1);
      }, 1000);
      
      return () => clearInterval(interval);
    } else {
      setIsActive(false);
      // Make sure we get one final refresh of the prompts
      promptsQuery.refetch();
    }
  }, [timer, isActive, promptsQuery]);
  
  // Submit a prompt
  const submitPrompt = api.prompt.submit.useMutation({
    onSuccess: () => {
      setPrompt("");
      setIsSubmitting(false);
      promptsQuery.refetch();
    },
    onError: (error) => {
      setIsSubmitting(false);
      console.error("Error submitting prompt:", error);
      alert("Failed to submit prompt: " + error.message);
    }
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt || !voterId || !isActive) return;
    
    setIsSubmitting(true);
    submitPrompt.mutate({
      text: prompt,
      voter: voterId,
      username: username.trim() || undefined,
    });
  };
  
  const handleVote = (promptId: number) => {
    if (!voterId || !isActive) return;
    
    const promptToVoteFor = promptsQuery.data?.prompts.find(p => p.id === promptId);
    if (!promptToVoteFor) return;
    
    setIsSubmitting(true);
    submitPrompt.mutate({
      text: promptToVoteFor.text,
      voter: voterId,
      username: username.trim() || undefined,
    });
  };
  
  const promptList = promptsQuery.data?.prompts || [];
  
  // Sort prompts by vote count (descending)
  const sortedPrompts = [...promptList].sort((a, b) => b.votes - a.votes);
  const topPrompt = sortedPrompts.length > 0 ? sortedPrompts[0] : null;
  
  return (
    <div className="w-full flex flex-col lg:flex-row gap-4 sm:gap-6">
      {/* Left side - Submit prompt or Results */}
      <div className="w-full lg:w-7/12">
        {isActive ? (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-[#e5e7eb] h-full">
            <div className="p-4 sm:p-5 border-b border-[#e5e7eb]">
              <h3 className="text-lg sm:text-xl font-semibold text-[#1e3a8a]">Submit Your Prompt</h3>
            </div>
            
            <div className="p-4 sm:p-6">
              <p className="text-sm mb-3 text-[#3b82f6]">
                Time remaining: <span className="font-medium text-[#1e3a8a]">{timer}s</span>
              </p>
              <div className="w-full bg-[#e6f0ff] rounded-full h-2.5 mb-6">
                <div 
                  className="bg-[#4285f4] h-2.5 rounded-full transition-all duration-1000 ease-linear" 
                  style={{ width: `${(timer / 120) * 100}%` }}
                />
              </div>
              
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Your name (optional)"
                    className="w-full rounded-md border border-[#e5e7eb] bg-white p-4 text-[#1e3a8a] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#4285f4] focus:border-transparent text-base min-h-[48px] transition-all duration-200"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    maxLength={50}
                    disabled={!isActive || isSubmitting}
                  />
                </div>
                
                <div className="relative">
                  <textarea
                    placeholder={isMobile ? "Describe your creative image idea..." : "A [adjective] [subject] [action] | style: [medium/artist] | lighting: [condition] | mood: [emotion] | palette: [colors] | angle: [viewpoint] | avoid: [exclusions], etc."}
                    className="w-full rounded-md border border-[#e5e7eb] bg-white p-4 text-[#1e3a8a] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#4285f4] focus:border-transparent min-h-[140px] sm:min-h-[180px] text-base resize-none transition-all duration-200"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      // Submit form when Enter is pressed without Shift key
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e);
                      }
                    }}
                    rows={6}
                    maxLength={500}
                    required
                    disabled={!isActive || isSubmitting}
                  />
                  <div className="absolute bottom-3 right-3 text-xs text-[#3b82f6]/60 bg-white/90 px-2 py-1 rounded backdrop-blur-sm">
                    {prompt.length}/500
                  </div>
                </div>
                
                <button
                  type="submit"
                  className="w-full py-4 bg-[#4285f4] hover:bg-[#3b7bf2] active:bg-[#2563eb] text-white font-medium rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-base min-h-[52px] touch-manipulation shadow-sm hover:shadow-md active:scale-[0.98]"
                  disabled={!prompt || isSubmitting || !isActive}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </span>
                  ) : "Submit Prompt"
                  }
                </button>
              </form>
              
              <div className="mt-6">
                <p className="text-sm text-[#3b82f6] leading-relaxed">
                  <span className="font-medium text-[#1e3a8a]">Tip:</span> Be creative! Your prompt will be used to generate an AI image.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-[#e5e7eb] h-full">
            <div className="p-4 sm:p-4 border-b border-[#e5e7eb]">
              <h3 className="text-lg font-semibold text-[#1e3a8a]">Results</h3>
            </div>
            
            <div className="p-4 sm:p-6 text-center">
              <h4 className="text-xl font-semibold text-[#1e3a8a] mb-6">Voting has ended!</h4>
              {topPrompt ? (
                <div className="space-y-4">
                  <p className="mb-3 text-[#3b82f6]/80">The winning prompt is:</p>
                  {topPrompt.username && (
                    <p className="text-sm font-medium text-[#3b82f6] mb-3">
                      by <span className="inline-block bg-[#4285f4]/10 px-3 py-1 rounded-full">{topPrompt.username}</span>
                    </p>
                  )}
                  <p className="text-lg sm:text-xl font-bold text-[#4285f4] mb-6 px-2 leading-relaxed">
                    "{topPrompt.text}"
                  </p>
                  <p className="text-sm text-[#3b82f6]/80">
                    with {topPrompt.votes} vote{topPrompt.votes !== 1 ? "s" : ""}
                  </p>
                </div>
              ) : (
                <p className="text-[#3b82f6]/80">No prompts were submitted.</p>
              )}
              
              <div className="mt-8">
                <Link
                  href="/gallery"
                  className="text-[#4285f4] hover:text-[#1e3a8a] transition-colors flex items-center justify-center py-2 px-4 rounded-lg hover:bg-[#4285f4]/5 min-h-[44px] touch-manipulation"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                  </svg>
                  View gallery of past images
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Right side - Prompts list */}
      <div className="w-full lg:w-5/12">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-[#e5e7eb] h-full flex flex-col">
          <div className="p-4 sm:p-5 border-b border-[#e5e7eb]">
            <h3 className="text-lg sm:text-xl font-semibold text-[#1e3a8a]">{isActive ? "Current Prompts" : "All Prompts"}</h3>
          </div>
          
          <div className="flex-1 overflow-hidden">
            {promptsQuery.isLoading ? (
              <div className="p-6 flex justify-center items-center h-full min-h-[200px]">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-[#4285f4] animate-bounce"></div>
                  <div className="w-3 h-3 rounded-full bg-[#4285f4] animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                  <div className="w-3 h-3 rounded-full bg-[#4285f4] animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                </div>
              </div>
            ) : promptList.length === 0 ? (
              <div className="p-6 text-center min-h-[200px] flex items-center justify-center">
                <p className="text-[#3b82f6] py-4">No prompts submitted yet. Be the first!</p>
              </div>
            ) : (
              <div className="p-3 sm:p-4 overflow-y-auto max-h-[400px] sm:max-h-[500px] scrollbar-thin scrollbar-thumb-[#e5e7eb] scrollbar-track-transparent">
                <ul className="space-y-3">
                  {sortedPrompts.map((prompt) => (
                    <li 
                      key={prompt.id} 
                      className={`flex flex-col p-4 rounded-md border border-[#e5e7eb] bg-[#f8fafc] min-h-[60px] ${isActive ? 'hover:border-[#4285f4]/40 hover:bg-[#f0f7ff] cursor-pointer transition-colors group touch-manipulation' : ''}`}
                      onClick={isActive ? () => handleVote(prompt.id) : undefined}
                    >
                      {prompt.username && (
                        <div className="flex items-center mb-2">
                          <span className="text-xs font-medium text-[#3b82f6] bg-[#4285f4]/10 px-2 py-1 rounded-full">
                            {prompt.username}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-start gap-3">
                        <span className="text-[#1e3a8a] text-sm leading-relaxed flex-1">{prompt.text}</span>
                        <span className={`bg-[#4285f4]/10 text-[#4285f4] px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap flex-shrink-0 ${isActive ? 'group-hover:bg-[#4285f4]/20' : ''}`}>
                          {prompt.votes} vote{prompt.votes !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          <div className="p-4 border-t border-[#e5e7eb] bg-[#f8fafc]">
            <p className="text-xs text-center text-[#3b82f6]/80 leading-relaxed">
              {isActive ? "Tap on a prompt to vote for it" : "These prompts were submitted during the voting period"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 