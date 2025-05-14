"use client";

import { useState, useEffect } from "react";
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
  
  // Add logging when gallery data changes
  useEffect(() => {
    if (galleryQuery.data) {
      console.log("Gallery data fetched:", galleryQuery.data);
      console.log("Number of items with images:", 
        galleryQuery.data.gallery.filter(item => item.imageUrl).length);
      
      // Log each item's image URL for debugging
      galleryQuery.data.gallery.forEach((item, index) => {
        console.log(`Gallery item ${index} (ID: ${item.id}):`, 
          item.imageUrl ? `Has image: ${item.imageUrl}` : "No image URL");
      });
    }
  }, [galleryQuery.data]);
  
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
          <p className="text-[#3b82f6] text-lg">No generated images yet. Check back later!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {galleryItems.map((item) => (
            <div 
              key={item.id}
              className="bg-white rounded-lg shadow-sm border border-[#e5e7eb] overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleImageClick(item)}
            >
              {item.imageUrl ? (
                <div className="relative aspect-square">
                  <Image
                    src={item.imageUrl}
                    alt={item.text}
                    fill
                    className="object-cover"
                    onError={(e) => {
                      console.error(`Failed to load image: ${item.imageUrl}`, e);
                      // Try to load as a more detailed message
                      const target = e.target as HTMLImageElement;
                      if (target) {
                        console.error("Image element error details:", {
                          src: target.src,
                          naturalWidth: target.naturalWidth,
                          naturalHeight: target.naturalHeight,
                          complete: target.complete
                        });
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="bg-[#f8fafc] aspect-square flex items-center justify-center">
                  <p className="text-[#3b82f6]/50">Image not available</p>
                </div>
              )}
              
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
              {selectedImage.imageUrl ? (
                <Image
                  src={selectedImage.imageUrl}
                  alt={selectedImage.text}
                  fill
                  className="object-contain"
                />
              ) : (
                <div className="bg-[#f8fafc] h-full flex items-center justify-center">
                  <p className="text-[#3b82f6]/50">Image not available</p>
                </div>
              )}
            </div>
            
            <div className="p-4">
              <p className="text-[#1e3a8a] font-medium mb-4">{selectedImage.text}</p>
              
              {selectedImage.imageUrl && (
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
                    disabled={isPrinting || !selectedImage.imageUrl}
                    className="w-full py-2 bg-[#4285f4] hover:bg-[#3b7bf2] text-white font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPrinting ? "Printing..." : "Send to Print"}
                  </button>
                </div>
              )}
              
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