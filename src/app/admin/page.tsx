import AdminPanel from "@/app/_components/admin-panel";
import { QRCodeDisplay } from "@/app/_components/qr-code";
import Link from "next/link";

export default function AdminPage() {
  return (
    <main className="min-h-screen flex flex-col items-center bg-[#e6f0ff] text-[#1e3a8a]">
      <div className="w-full max-w-3xl px-4 py-8 flex flex-col items-center">
        {/* Header */}
        <div className="w-full text-center mb-6">
          <h1 className="text-4xl font-bold text-[#1e3a8a] sm:text-5xl">
            <span className="text-[#4285f4]">Admin</span> Panel
          </h1>
        </div>
        
        {/* QR code section */}
        <div className="w-full bg-white rounded-lg shadow-sm overflow-hidden border border-[#e5e7eb] mb-6">
          <div className="p-4 border-b border-[#e5e7eb]">
            <h2 className="text-lg font-semibold text-[#1e3a8a]">Share QR Code</h2>
          </div>
          
          <div className="p-4 flex flex-wrap gap-4 items-center">
            <div className="bg-[#f8fafc] p-3 rounded border border-[#e5e7eb]">
              <QRCodeDisplay 
                size={150} 
                showNetworkInfo={true}
                networkName={process.env.NEXT_PUBLIC_WIFI_NAME || "iPhone-Hotspot"}
                networkPassword={process.env.NEXT_PUBLIC_WIFI_PASSWORD || "demopass"}
              />
            </div>
            
            <div className="flex-1 min-w-[200px]">
              <p className="text-[#1e3a8a] font-medium mb-2">Share this QR code with your audience</p>
              <p className="text-sm text-[#3b82f6]/80">It links directly to the voting page</p>
              <p className="text-xs text-[#3b82f6]/80 mt-2">
                Edit network info in <code className="bg-[#f1f5f9] px-1 py-0.5 rounded text-[#3b82f6]">.env</code> file
              </p>
            </div>
          </div>
        </div>
        
        {/* Admin panel */}
        <div className="w-full">
          <AdminPanel />
        </div>
        
        {/* Home link */}
        <div className="mt-6 text-sm">
          <Link
            href="/"
            className="text-[#4285f4] hover:text-[#1e3a8a] transition-colors"
          >
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
} 