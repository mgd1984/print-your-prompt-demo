import Link from "next/link";
import { QRCodeDisplay } from "@/app/_components/qr-code";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#e6f0ff] py-10">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header with title */}
        <div className="mb-10 text-center">
          <h1 className="text-5xl lg:text-6xl font-bold">
            <span className="text-[#1e3a8a]">Lightning</span> <span className="text-[#4285f4]">Prints</span>
          </h1>
          <p className="mt-3 text-lg text-[#3b82f6]">
            Create, vote, and print AI-generated images from text prompts in real-time
          </p>
        </div>
        
        {/* QR Code section */}
        <div className="flex justify-center mb-8">
          <div className="w-full max-w-md bg-white rounded-lg border-2 border-[#4285f4] p-6">
            <QRCodeDisplay 
              size={600} 
              showNetworkInfo={false} 
              className="bg-white border-0 p-0 rounded-none" 
            />
          </div>
        </div>
        
        {/* Open voting button */}
        <div className="flex justify-center mb-8">
          <Link 
            href="/live"
            className="block w-full max-w-md py-4 bg-[#4285f4] hover:bg-[#3b7bf2] text-white text-center font-semibold text-xl rounded-md transition-colors"
          >
            Open voting page
          </Link>
        </div>
        
        {/* Gallery link */}
        <div className="flex justify-center mb-12">
          <Link 
            href="/gallery"
            className="text-[#4285f4] hover:text-[#1e3a8a] transition-colors flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
            View past generated images
          </Link>
        </div>
        
        {/* How it works section */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold text-[#1e3a8a] mb-6">How it works</h2>
          
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#4285f4] text-white flex items-center justify-center font-medium text-lg">1</div>
              <div>
                <h3 className="text-[#1e3a8a] font-medium text-lg">Submit your prompt</h3>
                <p className="text-[#3b82f6] mt-1">
                  Create a text prompt for an image or vote for existing prompts in real-time
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#4285f4] text-white flex items-center justify-center font-medium text-lg">2</div>
              <div>
                <h3 className="text-[#1e3a8a] font-medium text-lg">AI generates the image</h3>
                <p className="text-[#3b82f6] mt-1">
                  The winning prompt is sent to an AI system that creates a unique image
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#4285f4] text-white flex items-center justify-center font-medium text-lg">3</div>
              <div>
                <h3 className="text-[#1e3a8a] font-medium text-lg">Print and share</h3>
                <p className="text-[#3b82f6] mt-1">
                  The generated image is printed and can be shared with participants
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Admin link at bottom */}
        <div className="mt-8 text-center">
          <Link
            href="/admin"
            className="text-sm text-[#4285f4] hover:text-[#1e3a8a] transition-colors"
          >
            Admin dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
