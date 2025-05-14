import PromptVoting from "@/app/_components/prompt-voting";
import Link from "next/link";

export default function LivePage() {
  return (
    <main className="min-h-screen bg-[#e6f0ff] text-[#1e3a8a]">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-4xl font-bold text-[#1e3a8a]">
              Print Your <span className="text-[#4285f4]">Prompt</span>
            </h1>
            <Link
              href="/"
              className="text-[#4285f4] hover:text-[#1e3a8a] transition-colors text-sm flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Back to home
            </Link>
          </div>
          <p className="text-[#3b82f6] text-lg">
            Submit a prompt or vote for your favorite!
          </p>
        </div>
        
        {/* Voting component */}
        <div className="max-w-7xl mx-auto">
          <PromptVoting />
        </div>
      </div>
    </main>
  );
} 