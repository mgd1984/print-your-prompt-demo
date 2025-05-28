"use client";

import { useState } from "react";
import Image from "next/image";
import { api } from "@/trpc/react";
import { formatDistanceToNow } from "date-fns";

type GalleryItem = {
  id: number;
  text: string;
  username?: string | null;
  imageUrl?: string | null;
  createdAt: Date;
};

/**
 * Normalize image URL for Next.js Image component
 */
function normalizeImageUrl(url: string | null | undefined): string {
  if (!url) {
    return createPlaceholderDataUrl();
  }
  
  // Handle placeholder cases
  if (url === "placeholder-will-use-direct-openai-url" || 
      url.includes("placeholder") || 
      url.includes("undefined")) {
    return createPlaceholderDataUrl();
  }

  // Handle relative paths that use @/ format (module imports)
  if (url.startsWith('@/')) {
    return url.replace('@/', '/');
  }
  
  // If it's a URL without protocol, add https
  if (url.match(/^\/\//) && !url.startsWith('http')) {
    return `https:${url}`;
  }
  
  // Already absolute URL or relative path, return as is
  if (url.startsWith('http') || url.startsWith('/') || url.startsWith('data:')) {
    return url;
  }
  
  // Default prepend slash if it doesn't have one
  return `/${url}`;
}

/**
 * Create a simple SVG placeholder as data URL
 */
function createPlaceholderDataUrl(): string {
  const svg = `
    <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="400" fill="#f8fafc" />
      <circle cx="200" cy="180" r="40" fill="#e2e8f0" />
      <rect x="160" y="240" width="80" height="8" rx="4" fill="#e2e8f0" />
      <rect x="170" y="260" width="60" height="6" rx="3" fill="#f1f5f9" />
      <text x="50%" y="320" font-family="Arial" font-size="14" fill="#64748b" text-anchor="middle">
        No Image Available
      </text>
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

export default function GalleryDisplay() {
  const [selectedImage, setSelectedImage] = useState<GalleryItem | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [useHighQuality, setUseHighQuality] = useState(true);

  const galleryQuery = api.prompt.getGallery.useQuery(
    { limit: 50 },
    { refetchInterval: 30000 } // Refresh every 30 seconds
  );

  // Add printer mutation
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

  const handleImageClick = (item: GalleryItem) => {
    setSelectedImage(item);
  };

  const closeModal = () => {
    setSelectedImage(null);
    setIsPrinting(false);
  };

  const handlePrintImage = () => {
    if (!selectedImage?.imageUrl) return;
    
    setIsPrinting(true);
    printImage.mutate({ 
      imageUrl: selectedImage.imageUrl,
      useHighQuality
    });
  };

  const galleryItems = galleryQuery.data?.gallery || [];

  return (
    <div className="w-full">
      {galleryQuery.isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-[#4285f4] animate-bounce"></div>
            <div className="w-3 h-3 rounded-full bg-[#4285f4] animate-bounce" style={{ animationDelay: "0.2s" }}></div>
            <div className="w-3 h-3 rounded-full bg-[#4285f4] animate-bounce" style={{ animationDelay: "0.4s" }}></div>
          </div>
        </div>
      ) : galleryItems.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
            <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Images Yet</h3>
          <p className="text-[#3b82f6] text-sm">Generated images will appear here once prompts are processed.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {galleryItems.map((item) => (
            <div 
              key={item.id}
              className="bg-white rounded-lg shadow-sm border border-[#e5e7eb] overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleImageClick(item)}
            >
              <div className="relative aspect-square">
                <Image
                  src={normalizeImageUrl(item.imageUrl)}
                  alt={item.text}
                  fill
                  className="object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (target) {
                      target.src = createPlaceholderDataUrl();
                    }
                  }}
                  unoptimized // Bypass image optimization that may cause issues
                />
              </div>
              
              <div className="p-4">
                <p className="text-[#1e3a8a] font-medium line-clamp-2 mb-2">
                  {item.text}
                </p>
                <div className="flex justify-between items-center">
                  {item.username ? (
                    <span className="text-xs font-medium text-[#3b82f6] bg-[#4285f4]/10 px-2 py-0.5 rounded-full">
                      {item.username}
                    </span>
                  ) : (
                    <span className="text-xs text-[#3b82f6]/50">Anonymous</span>
                  )}
                  <span className="text-xs text-[#3b82f6]/60">
                    {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Image modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <div 
            className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-[#e5e7eb] flex justify-between items-center">
              <h3 className="font-medium text-[#1e3a8a]">Image Details</h3>
              <button 
                onClick={closeModal}
                className="text-[#3b82f6] hover:text-[#1e3a8a]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="relative max-h-[60vh] min-h-[300px]">
              <Image
                src={normalizeImageUrl(selectedImage.imageUrl)}
                alt={selectedImage.text}
                fill
                className="object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (target) {
                    target.src = createPlaceholderDataUrl();
                  }
                }}
                unoptimized // Bypass image optimization that may cause issues
              />
            </div>
            
            <div className="p-4">
              <p className="text-[#1e3a8a] font-medium mb-4">{selectedImage.text}</p>
              
              <div className="mb-4 border-t border-[#e5e7eb] pt-4">
                <div className="flex items-center mb-3">
                  <input
                    type="checkbox"
                    id="high-quality-gallery"
                    checked={useHighQuality}
                    onChange={() => setUseHighQuality(!useHighQuality)}
                    className="mr-2 h-4 w-4 rounded border-[#e5e7eb] text-[#4285f4] focus:ring-[#4285f4]"
                  />
                  <label htmlFor="high-quality-gallery" className="text-sm text-[#1e3a8a]">
                    Use high-quality printing
                  </label>
                </div>
                
                <button
                  onClick={handlePrintImage}
                  disabled={isPrinting}
                  className="w-full py-2 bg-[#4285f4] hover:bg-[#3b7bf2] text-white font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPrinting ? "Printing..." : "Send to Print"}
                </button>
              </div>
              
              <div className="flex justify-between items-center mt-2">
                {selectedImage.username ? (
                  <span className="text-sm font-medium text-[#3b82f6] bg-[#4285f4]/10 px-2 py-0.5 rounded-full">
                    {selectedImage.username}
                  </span>
                ) : (
                  <span className="text-sm text-[#3b82f6]/50">Anonymous</span>
                )}
                <span className="text-sm text-[#3b82f6]/60">
                  {formatDistanceToNow(new Date(selectedImage.createdAt), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 