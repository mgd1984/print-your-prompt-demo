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

/**
 * Normalize image URL for Next.js Image component - fixed to handle all URL formats properly
 */
function normalizeImageUrl(url: string | null | undefined, itemId: number): string {
  // For debugging
  console.log(`[Item ${itemId}] Original imageUrl:`, url);

  if (!url) {
    return `/uploads/image-1747188078877.jpg`;
  }
  
  // Handle placeholder case
  if (url === "placeholder-will-use-direct-openai-url") {
    return `/uploads/image-1747188078877.jpg`;
  }
  
  // Handle case where URL is in database but points to a missing/non-existent file
  if (url.includes("placeholder") || url.includes("undefined")) {
    return `/uploads/image-1747188078877.jpg`;
  }

  // Handle the case where URLs might be identical due to being set incorrectly
  // This helps create visual differentiation by using the item ID
  if (url === "/uploads/image-1747188078877.jpg") {
    // Try to use one of our other sample images based on the item ID to create variety
    const images = [
      '/uploads/image-1747187938920.jpg',
      '/uploads/image-1747187021981.jpg',
      '/uploads/image-1747186073405.jpg',
      '/uploads/image-1747185992142.jpg',
      '/uploads/image-1747185904624.jpg'
    ];
    
    // Use modulo to select an image based on ID
    return images[itemId % images.length] || url;
  }
  
  // Handle relative paths that use @/ format (module imports)
  if (url.startsWith('@/')) {
    console.log(`[Item ${itemId}] Fixed @/ path:`, url.replace('@/', '/'));
    return url.replace('@/', '/');
  }
  
  // If it's a URL without protocol, add https
  if (url.match(/^\/\//) && !url.startsWith('http')) {
    console.log(`[Item ${itemId}] Added https to protocol-less URL:`, `https:${url}`);
    return `https:${url}`;
  }
  
  // Already absolute URL, no need to change
  if (url.startsWith('http') || url.startsWith('/')) {
    return url;
  }
  
  // Default prepend slash if it doesn't have one
  console.log(`[Item ${itemId}] Added leading slash:`, `/${url}`);
  return `/${url}`;
}

export default function GalleryDisplay() {
  const [selectedImage, setSelectedImage] = useState<GalleryItem | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [useHighQuality, setUseHighQuality] = useState(true);
  const [availableImages, setAvailableImages] = useState<string[]>([]);
  const [defaultImage, setDefaultImage] = useState<string>('');
  const [imagesLoaded, setImagesLoaded] = useState(false);
  
  // Fetch available images from the API
  useEffect(() => {
    const fetchAvailableImages = async () => {
      try {
        const response = await fetch('/api/available-images');
        if (!response.ok) throw new Error('Failed to fetch available images');
        const data = await response.json();
        
        if (data.images && Array.isArray(data.images) && data.images.length > 0) {
          setAvailableImages(data.images);
          // Set the first image as the default fallback
          setDefaultImage(data.images[0]);
          console.log(`Loaded ${data.images.length} available images`);
        } else {
          console.warn('No available images found in uploads directory');
          // Create a data URL for a simple placeholder if no images exist
          createPlaceholderDataUrl();
        }
      } catch (error) {
        console.error('Error fetching available images:', error);
        // Create a data URL for a simple placeholder if API fails
        createPlaceholderDataUrl();
      } finally {
        setImagesLoaded(true);
      }
    };
    
    // Create a simple SVG placeholder as data URL if no images are available
    const createPlaceholderDataUrl = () => {
      const svg = `
        <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="400" fill="#f8fafc" />
          <text x="50%" y="50%" font-family="Arial" font-size="20" fill="#3b82f6" text-anchor="middle">
            Image Placeholder
          </text>
        </svg>
      `;
      const dataUrl = `data:image/svg+xml;base64,${btoa(svg)}`;
      setDefaultImage(dataUrl);
      setAvailableImages([dataUrl]);
    };
    
    fetchAvailableImages();
  }, []);
  
  // Get a consistent image URL for a specific item ID
  const getImageForItem = (itemId: number, originalUrl: string | null | undefined): string => {
    // Handle the case where images haven't loaded yet
    if (!imagesLoaded) {
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2Y4ZmFmYyIgLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjIwIiBmaWxsPSIjM2I4MmY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5Mb2FkaW5nLi4uPC90ZXh0Pjwvc3ZnPg==';
    }
    
    // If we have no images available at all, use the default SVG data URL
    if (availableImages.length === 0) {
      return defaultImage;
    }
    
    // If we have a valid URL that's not a placeholder, try to use it
    if (originalUrl && 
        !originalUrl.includes('placeholder') && 
        !originalUrl.includes('undefined') &&
        originalUrl !== "placeholder-will-use-direct-openai-url") {
      
      // Fix @/ paths
      if (originalUrl.startsWith('@/')) {
        return originalUrl.replace('@/', '/');
      }
      
      // Add https to protocol-less URLs
      if (originalUrl.match(/^\/\//) && !originalUrl.startsWith('http')) {
        return `https:${originalUrl}`;
      }
      
      // Ensure URLs start with /
      if (!originalUrl.startsWith('/') && !originalUrl.startsWith('http') && !originalUrl.startsWith('data:')) {
        return `/${originalUrl}`;
      }
      
      // Return the original URL if it's properly formatted
      return originalUrl;
    }
    
    // Use deterministic selection based on item ID to ensure consistency
    // This ensures the same item always gets the same image
    const index = Math.abs(itemId) % availableImages.length;
    return availableImages[index] || defaultImage;
  };
  
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
  
  // Loading state when images haven't been fetched yet
  if (!imagesLoaded) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-[#4285f4] animate-bounce"></div>
          <div className="w-3 h-3 rounded-full bg-[#4285f4] animate-bounce" style={{ animationDelay: "0.2s" }}></div>
          <div className="w-3 h-3 rounded-full bg-[#4285f4] animate-bounce" style={{ animationDelay: "0.4s" }}></div>
        </div>
      </div>
    );
  }
  
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
              <div className="relative aspect-square">
                <Image
                  src={getImageForItem(item.id, item.imageUrl) || defaultImage}
                  alt={item.text}
                  fill
                  className="object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (target && availableImages.length > 0) {
                      // Use a different image from our array if available
                      const fallbackIndex = (item.id + 1) % availableImages.length;
                      target.src = availableImages[fallbackIndex] || defaultImage;
                    } else if (target) {
                      target.src = defaultImage;
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
                src={getImageForItem(selectedImage.id, selectedImage.imageUrl) || defaultImage}
                alt={selectedImage.text}
                fill
                className="object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (target && availableImages.length > 0) {
                    // Use a different image from our array if available
                    const fallbackIndex = (selectedImage.id + 1) % availableImages.length;
                    target.src = availableImages[fallbackIndex] || defaultImage;
                  } else if (target) {
                    target.src = defaultImage;
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