"use client";

import { useState, useEffect } from "react";
import { api } from "@/trpc/react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

type PromptWithVotes = {
  id: number;
  text: string;
  votes: number;
  status: string;
  createdAt: Date;
};

type WinnerData = {
  winner: {
    id: number;
    text: string;
    votes: number;
  };
};

export default function AdminPanel() {
  const [generatingImage, setGeneratingImage] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<PromptWithVotes | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [useHighQuality, setUseHighQuality] = useState(true);
  
  const router = useRouter();
  
  // Get all prompts
  const promptsQuery = api.prompt.getAll.useQuery(
    { seconds: 3600, limit: 100 },
    { 
      refetchInterval: 30000, // Always refresh every 30 seconds
      refetchIntervalInBackground: true,
    }
  );
  
  // Use the hasActiveSession flag from the API response
  const hasActiveSession = !!promptsQuery.data?.hasActiveSession;
  
  // Start a new session
  const startSession = api.prompt.startSession.useMutation({
    onSuccess: () => {
      promptsQuery.refetch();
      setCountdown(30);
    },
  });
  
  // End the current session
  const endSession = api.prompt.endSession.useMutation({
    onSuccess: () => {
      promptsQuery.refetch();
      setCountdown(null);
    },
  });
  
  // Get the winning prompt
  const getWinner = api.prompt.getWinner.useMutation({
    onSuccess: (data: WinnerData) => {
      if (data.winner) {
        const winningPrompt = promptsQuery.data?.prompts.find(p => p.id === data.winner.id);
        if (winningPrompt) {
          setSelectedPrompt(winningPrompt);
        }
      }
    },
  });
  
  // Generate image from selected prompt
  const generateImage = api.image.generate.useMutation({
    onSuccess: (data) => {
      setGeneratingImage(false);
      if (data.imageUrl && selectedPrompt) {
        console.log("Image generated successfully:", data);
        
        // Ensure the image URL is valid
        if (typeof data.imageUrl !== 'string' || data.imageUrl.trim() === '') {
          console.error("Invalid image URL received:", data.imageUrl);
          alert("Failed to generate a valid image URL");
          return;
        }
        
        setImageSrc(data.imageUrl);
        
        // Save the image URL to the prompt
        console.log("Generated image with URL:", data.imageUrl);
        console.log("Updating prompt with ID:", selectedPrompt.id);
        
        updatePromptImage.mutate({
          promptId: selectedPrompt.id,
          imageUrl: data.imageUrl,
        });
      } else {
        console.error("Missing image URL or selected prompt:", 
          { imageUrl: data.imageUrl, promptId: selectedPrompt?.id });
      }
    },
    onError: (error) => {
      setGeneratingImage(false);
      console.error("Error generating image:", error);
      alert("Failed to generate image: " + error.message);
    },
  });
  
  // Update prompt with image URL
  const updatePromptImage = api.prompt.updatePromptImage.useMutation({
    onSuccess: (data) => {
      promptsQuery.refetch();
      console.log("Successfully saved image URL to prompt:", data);
    },
    onError: (error) => {
      console.error("Error saving image URL to prompt:", error);
    },
  });
  
  // Print the generated image
  const printImage = api.printer.print.useMutation({
    onSuccess: (data) => {
      setIsPrinting(false);
      alert(`Image sent to printer! ${data.highQuality ? '(High-quality TIFF)' : '(Standard quality)'}`);
    },
    onError: (error) => {
      setIsPrinting(false);
      console.error("Error printing image:", error);
      alert("Failed to print image: " + error.message);
    },
  });
  
  // Countdown timer
  useEffect(() => {
    // Update to also consider the hasActiveSession flag from the API
    if (countdown === null && !hasActiveSession) return;
    
    if (countdown !== null && countdown > 0) {
      const interval = setInterval(() => {
        setCountdown((prevCountdown) => (prevCountdown !== null ? prevCountdown - 1 : null));
      }, 1000);
      
      return () => clearInterval(interval);
    } else if (countdown === 0) {
      endSession.mutate();
      getWinner.mutate();
    }
  }, [countdown, endSession, getWinner, hasActiveSession]);
  
  const handleStartSession = () => {
    startSession.mutate();
  };
  
  const handleEndSession = () => {
    endSession.mutate();
    getWinner.mutate();
  };
  
  const handleGenerateImage = () => {
    if (!selectedPrompt) return;
    
    setGeneratingImage(true);
    generateImage.mutate({ prompt: selectedPrompt.text });
  };
  
  const handlePrintImage = () => {
    if (!imageSrc) return;
    
    setIsPrinting(true);
    printImage.mutate({ 
      imageUrl: imageSrc,
      useHighQuality
    });
  };
  
  const promptList = promptsQuery.data?.prompts || [];
  const sortedPrompts = [...promptList].sort((a, b) => b.votes - a.votes);
  
  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white">Session Control</h3>
        </div>
        
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-base font-medium text-white">Voting Session</h4>
              <p className="text-sm text-slate-300">
                {countdown !== null
                  ? `Running - ${countdown}s remaining`
                  : "Not running"}
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleStartSession}
                className="rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 px-4 py-2 font-medium text-white disabled:opacity-50 text-sm transition-all duration-200 shadow-lg"
                disabled={countdown !== null}
              >
                Start New Session
              </button>
              
              <button
                onClick={handleEndSession}
                className="rounded-lg bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 px-4 py-2 font-medium text-white disabled:opacity-50 text-sm transition-all duration-200 shadow-lg"
                disabled={countdown === null}
              >
                End Session
              </button>
            </div>
          </div>
          
          <div className="mt-4">
            <Link 
              href="/live" 
              className="text-blue-400 hover:text-blue-300 transition-colors text-sm inline-flex items-center space-x-2"
              target="_blank"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              <span>Open voting page (public URL)</span>
            </Link>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <h3 className="text-lg font-semibold text-white">All Prompts</h3>
          </div>
          
          <div className="p-6">
            {countdown === null && promptList.length > 0 && (
              <div className="mb-4 bg-blue-500/10 border border-blue-400/30 rounded-lg p-3">
                <p className="text-sm text-blue-300">Session not active. Select a prompt to generate an image.</p>
              </div>
            )}
            
            {promptsQuery.isLoading ? (
              <p className="text-slate-300 text-center py-8">Loading prompts...</p>
            ) : sortedPrompts.length === 0 ? (
              <p className="text-slate-300 text-center py-8">
                {hasActiveSession 
                  ? "No prompts submitted yet in this session." 
                  : "No prompts available. Start a new session to collect prompts."}
              </p>
            ) : (
              <div className="max-h-96 overflow-y-auto pr-2">
                <ul className="space-y-3">
                  {sortedPrompts.map((prompt) => (
                    <li 
                      key={prompt.id} 
                      className={`flex justify-between items-center p-4 rounded-lg border transition-all duration-200 cursor-pointer ${
                        selectedPrompt?.id === prompt.id
                          ? "border-blue-400/50 bg-blue-500/10 shadow-lg"
                          : "border-white/10 bg-white/5 hover:border-blue-400/30 hover:bg-blue-500/5"
                      }`}
                      onClick={() => setSelectedPrompt(prompt)}
                    >
                      <span className="text-sm text-white mr-3 flex-1">{prompt.text}</span>
                      <span className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-xs font-medium border border-blue-400/30">
                        {prompt.votes} vote{prompt.votes !== 1 ? "s" : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <h3 className="text-lg font-semibold text-white">Image Generation</h3>
          </div>
          
          <div className="p-6">
            {selectedPrompt ? (
              <div className="flex flex-col gap-4">
                <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                  <h4 className="text-sm font-medium text-slate-300 mb-2">Selected Prompt:</h4>
                  <p className="text-white">{selectedPrompt.text}</p>
                </div>
                
                <button
                  onClick={handleGenerateImage}
                  className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                  disabled={generatingImage}
                >
                  {generatingImage ? (
                    <span className="flex items-center justify-center space-x-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Generating...</span>
                    </span>
                  ) : "Generate Image"}
                </button>
                
                {imageSrc && (
                  <div className="flex flex-col gap-4 mt-2">
                    <div className="relative w-full aspect-square border border-white/10 rounded-lg overflow-hidden bg-white/5">
                      <Image
                        src={imageSrc}
                        alt="Generated image"
                        fill
                        className="object-contain"
                      />
                    </div>
                    
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="high-quality"
                          checked={useHighQuality}
                          onChange={() => setUseHighQuality(!useHighQuality)}
                          className="mr-3 h-4 w-4 rounded border-white/20 bg-white/10 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                        />
                        <label htmlFor="high-quality" className="text-sm text-slate-300">
                          Use high-quality printing
                        </label>
                      </div>
                      
                      <button
                        onClick={handlePrintImage}
                        className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                        disabled={isPrinting}
                      >
                        {isPrinting ? (
                          <span className="flex items-center justify-center space-x-2">
                            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-6a2 2 0 00-2 2v6a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            <span>Printing...</span>
                          </span>
                        ) : "Print Image"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-slate-300 text-center py-12">
                Select a prompt from the list to generate an image
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 