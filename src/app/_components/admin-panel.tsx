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
    <div className="grid grid-cols-1 gap-4">
      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-[#e5e7eb]">
        <div className="p-4 border-b border-[#e5e7eb]">
          <h3 className="text-lg font-semibold text-[#1e3a8a]">Session Control</h3>
        </div>
        
        <div className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-base font-medium text-[#1e3a8a]">Voting Session</h4>
              <p className="text-sm text-[#3b82f6]/80">
                {countdown !== null
                  ? `Running - ${countdown}s remaining`
                  : "Not running"}
              </p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handleStartSession}
                className="rounded-md bg-[#4caf50] px-4 py-2 font-medium text-white hover:bg-[#43a047] disabled:opacity-50 text-sm transition-colors"
                disabled={countdown !== null}
              >
                Start New Session
              </button>
              
              <button
                onClick={handleEndSession}
                className="rounded-md bg-[#f44336] px-4 py-2 font-medium text-white hover:bg-[#e53935] disabled:opacity-50 text-sm transition-colors"
                disabled={countdown === null}
              >
                End Session
              </button>
            </div>
          </div>
          
          <div className="mt-4">
            <Link 
              href="/live" 
              className="text-[#4285f4] hover:text-[#1e3a8a] transition-colors text-sm"
              target="_blank"
            >
              Open voting page (public URL)
            </Link>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-[#e5e7eb]">
          <div className="p-4 border-b border-[#e5e7eb]">
            <h3 className="text-lg font-semibold text-[#1e3a8a]">All Prompts</h3>
          </div>
          
          <div className="p-4">
            {countdown === null && promptList.length > 0 && (
              <div className="mb-3 bg-[#f0f7ff] border border-[#4285f4]/30 rounded-md p-2">
                <p className="text-sm text-[#3b82f6]">Session not active. Select a prompt to generate an image.</p>
              </div>
            )}
            
            {promptsQuery.isLoading ? (
              <p className="text-[#3b82f6]/80 text-center py-4">Loading prompts...</p>
            ) : sortedPrompts.length === 0 ? (
              <p className="text-[#3b82f6]/80 text-center py-4">
                {hasActiveSession 
                  ? "No prompts submitted yet in this session." 
                  : "No prompts available. Start a new session to collect prompts."}
              </p>
            ) : (
              <div className="max-h-96 overflow-y-auto pr-2">
                <ul className="space-y-2">
                  {sortedPrompts.map((prompt) => (
                    <li 
                      key={prompt.id} 
                      className={`flex justify-between items-center p-3 rounded-md border ${
                        selectedPrompt?.id === prompt.id
                          ? "border-[#4285f4] bg-[#f0f7ff]"
                          : "border-[#e5e7eb] bg-[#f8fafc] hover:border-[#4285f4]/40 hover:bg-[#f0f7ff]"
                      } cursor-pointer transition-colors`}
                      onClick={() => setSelectedPrompt(prompt)}
                    >
                      <span className="text-sm text-[#1e3a8a] mr-2">{prompt.text}</span>
                      <span className="bg-[#4285f4]/10 text-[#4285f4] px-2 py-1 rounded text-xs font-medium">
                        {prompt.votes} vote{prompt.votes !== 1 ? "s" : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-[#e5e7eb]">
          <div className="p-4 border-b border-[#e5e7eb]">
            <h3 className="text-lg font-semibold text-[#1e3a8a]">Image Generation</h3>
          </div>
          
          <div className="p-4">
            {selectedPrompt ? (
              <div className="flex flex-col gap-4">
                <div className="bg-[#f8fafc] p-3 rounded-md border border-[#e5e7eb]">
                  <h4 className="text-sm font-medium text-[#1e3a8a] mb-1">Selected Prompt:</h4>
                  <p className="text-[#4285f4]">{selectedPrompt.text}</p>
                </div>
                
                <button
                  onClick={handleGenerateImage}
                  className="w-full py-2 bg-[#4285f4] hover:bg-[#3b7bf2] text-white font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={generatingImage}
                >
                  {generatingImage ? "Generating..." : "Generate Image"}
                </button>
                
                {imageSrc && (
                  <div className="flex flex-col gap-4 mt-2">
                    <div className="relative w-full aspect-square border border-[#e5e7eb] rounded-md overflow-hidden bg-[#f8fafc]">
                      <Image
                        src={imageSrc}
                        alt="Generated image"
                        fill
                        className="object-contain"
                      />
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="high-quality"
                          checked={useHighQuality}
                          onChange={() => setUseHighQuality(!useHighQuality)}
                          className="mr-2 h-4 w-4 rounded border-[#e5e7eb] text-[#4285f4] focus:ring-[#4285f4]"
                        />
                        <label htmlFor="high-quality" className="text-sm text-[#1e3a8a]">
                          Use high-quality printing
                        </label>
                      </div>
                      
                      <button
                        onClick={handlePrintImage}
                        className="w-full py-2 bg-[#4285f4] hover:bg-[#3b7bf2] text-white font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isPrinting}
                      >
                        {isPrinting ? "Printing..." : "Print Image"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[#3b82f6]/80 text-center py-8">
                Select a prompt from the list to generate an image
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 