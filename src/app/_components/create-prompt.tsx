"use client";

import { useState } from "react";
import Image from "next/image";
import { api } from "@/trpc/react";
import type { TRPCClientErrorLike } from "@trpc/client";
import type { AppRouter } from "@/server/api/root";

interface GenerateImageResponse {
  imageUrl: string;
  filePath: string;
}

export function CreatePrompt() {
  const [prompt, setPrompt] = useState("");
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const generateImage = api.image.generate.useMutation({
    onSuccess: (data: GenerateImageResponse) => {
      setIsGenerating(false);
      if (data.imageUrl) {
        setImageSrc(data.imageUrl);
      }
    },
    onError: (error: TRPCClientErrorLike<AppRouter>) => {
      setIsGenerating(false);
      console.error("Error generating image:", error);
      alert("Failed to generate image: " + error.message);
    },
  });

  const printImage = api.printer.print.useMutation({
    onSuccess: () => {
      setIsPrinting(false);
      alert("Image sent to printer!");
    },
    onError: (error: TRPCClientErrorLike<AppRouter>) => {
      setIsPrinting(false);
      console.error("Error printing image:", error);
      alert("Failed to print image: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt) return;
    
    setIsGenerating(true);
    generateImage.mutate({ prompt });
  };

  const handlePrint = () => {
    if (!imageSrc) return;
    setIsPrinting(true);
    printImage.mutate({ imageUrl: imageSrc });
  };

  return (
    <div className="flex flex-col gap-4">
      <form className="flex flex-col gap-2" onSubmit={handleSubmit}>
        <textarea
          placeholder="Enter your prompt here..."
          className="w-full rounded-md border-2 border-gray-300 bg-white/10 p-2 text-white"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          required
        />
        <button
          type="submit"
          className="rounded-full bg-white/10 px-10 py-3 font-semibold text-white no-underline transition hover:bg-white/20 disabled:opacity-50"
          disabled={isGenerating || !prompt}
        >
          {isGenerating ? "Generating..." : "Generate Image"}
        </button>
      </form>

      {imageSrc && (
        <div className="flex flex-col items-center gap-4 mt-4">
          <div className="relative w-full aspect-square max-w-md mx-auto">
            <Image
              src={imageSrc}
              alt="Generated image"
              fill
              className="object-contain rounded-md"
            />
          </div>
          <button
            onClick={handlePrint}
            className="rounded-full bg-[hsl(280,100%,70%)]/80 px-10 py-3 font-semibold text-white no-underline transition hover:bg-[hsl(280,100%,70%)]"
            disabled={isPrinting}
          >
            {isPrinting ? "Printing..." : "Print Image"}
          </button>
        </div>
      )}
    </div>
  );
} 