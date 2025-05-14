import Link from "next/link";
import GalleryDisplay from "@/app/_components/gallery-display";

export default function GalleryPage() {
  return (
    <main className="min-h-screen bg-[#e6f0ff] py-10">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">
              <span className="text-[#1e3a8a]">Lightning</span> <span className="text-[#4285f4]">Gallery</span>
            </h1>
            <p className="text-[#3b82f6]">
              Browse AI-generated images from past prompt submissions
            </p>
          </div>
          
          <Link
            href="/"
            className="text-[#4285f4] hover:text-[#1e3a8a] transition-colors flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to home
          </Link>
        </div>
        
        {/* Gallery */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <GalleryDisplay />
        </div>
        
        {/* Additional links */}
        <div className="flex justify-center gap-4">
          <Link
            href="/live"
            className="text-[#4285f4] hover:text-[#1e3a8a] transition-colors"
          >
            Go to voting page
          </Link>
          <span className="text-[#3b82f6]/30">|</span>
          <Link
            href="/admin"
            className="text-[#4285f4] hover:text-[#1e3a8a] transition-colors"
          >
            Admin dashboard
          </Link>
        </div>
      </div>
    </main>
  );
} 