"use client";

import { useState, useEffect } from "react";
import { api } from "@/trpc/react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import PrintSettingsPanel from "./print-settings-panel";

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
  const [countdown, setCountdown] = useState<number>(0);
  const [selectedPrompt, setSelectedPrompt] = useState<PromptWithVotes | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [useHighQuality, setUseHighQuality] = useState(true);
  
  const router = useRouter();
  
  // Get all prompts for admin (shows all prompts, not just current session)
  const promptsQuery = api.prompt.getAllForAdmin.useQuery(
    { hours: 24, limit: 100 },
    { 
      refetchInterval: 5000, // Match voting page refresh rate
      refetchIntervalInBackground: true,
    }
  );
  
  // Use the session data from the API response
  const hasActiveSession = !!promptsQuery.data?.hasActiveSession;
  const sessionStartedAt = promptsQuery.data?.sessionStartedAt;
  
  // Update countdown based on actual session timing
  useEffect(() => {
    const data = promptsQuery.data;
    if (!data || !data.hasActiveSession || !data.sessionStartedAt) {
      setCountdown(0);
      return;
    }
    
    // Calculate elapsed time since session started
    const startTime = new Date(data.sessionStartedAt).getTime();
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - startTime) / 1000);
    const sessionDuration = 120; // 2 minutes total - same as voting page
    const remainingTime = Math.max(0, sessionDuration - elapsedSeconds);
    
    setCountdown(remainingTime);
  }, [promptsQuery.data]);
  
  // Timer countdown - only runs when active
  useEffect(() => {
    if (!hasActiveSession || countdown <= 0) return;
    
    const interval = setInterval(() => {
      setCountdown((prevTimer) => {
        const newTimer = prevTimer - 1;
        if (newTimer <= 0) {
          // Auto-end session when timer expires
          endSession.mutate();
          getWinner.mutate();
        }
        return Math.max(0, newTimer);
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [countdown, hasActiveSession]);
  
  // Start a new session
  const startSession = api.prompt.startSession.useMutation({
    onSuccess: () => {
      promptsQuery.refetch();
      // Don't set countdown here - let the useEffect handle it from API data
    },
  });
  
  // End the current session
  const endSession = api.prompt.endSession.useMutation({
    onSuccess: () => {
      promptsQuery.refetch();
      setCountdown(0);
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
                {countdown !== 0
                  ? `Running - ${countdown}s remaining`
                  : "Not running"}
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleStartSession}
                className="rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 px-4 py-2 font-medium text-white disabled:opacity-50 text-sm transition-all duration-200 shadow-lg"
                disabled={countdown !== 0}
              >
                Start New Session
              </button>
              
              <button
                onClick={handleEndSession}
                className="rounded-lg bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 px-4 py-2 font-medium text-white disabled:opacity-50 text-sm transition-all duration-200 shadow-lg"
                disabled={countdown === 0}
              >
                End Session
              </button>
            </div>
          </div>
          
          <div className="mt-4">
            <Link 
              href="/poll" 
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
            <h3 className="text-lg font-semibold text-white">Prompt Management</h3>
            <p className="text-sm text-slate-400 mt-1">All prompts from the last 24 hours</p>
          </div>
          
          <div className="p-6">
            {hasActiveSession && (
              <div className="mb-4 bg-green-500/10 border border-green-400/30 rounded-lg p-3">
                <p className="text-sm text-green-300">✓ Active session running - new prompts will appear here</p>
              </div>
            )}
            
            {!hasActiveSession && promptList.length > 0 && (
              <div className="mb-4 bg-blue-500/10 border border-blue-400/30 rounded-lg p-3">
                <p className="text-sm text-blue-300">Session not active. Select any prompt to generate an image.</p>
              </div>
            )}
            
            {promptsQuery.isLoading ? (
              <p className="text-slate-300 text-center py-8">Loading prompts...</p>
            ) : sortedPrompts.length === 0 ? (
              <p className="text-slate-300 text-center py-8">
                No prompts found in the last 24 hours.
                {hasActiveSession && (
                  <span className="block text-sm text-slate-400 mt-2">
                    New prompts from the active session will appear here.
                  </span>
                )}
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
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium rounded-lg shadow-lg">
                          Configure & Print
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col">
                        <DialogHeader className="flex-shrink-0">
                          <DialogTitle>Print Settings</DialogTitle>
                          <DialogDescription>
                            Configure print settings for: {selectedPrompt.text.slice(0, 50)}...
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex-1 overflow-y-auto">
                          <PrintSettingsPanel 
                            imageUrl={imageSrc}
                            onPrintStart={() => {}}
                            onPrintComplete={(result) => {
                              console.log("Print completed:", result);
                            }}
                            onPrintError={(error) => {
                              console.error("Print error:", error);
                            }}
                            className="border-0 shadow-none bg-transparent"
                          />
                        </div>
                      </DialogContent>
                    </Dialog>
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