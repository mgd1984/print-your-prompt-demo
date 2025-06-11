"use client";

import { useEffect, useState } from "react";
import QRCode from "react-qr-code";

interface QRCodeDisplayProps {
  size?: number;
  className?: string;
  showNetworkInfo?: boolean;
  networkName?: string;
  networkPassword?: string;
}

export function QRCodeDisplay({ 
  size = 256, 
  className = "",
  showNetworkInfo = false,
  networkName = "iPhone-Hotspot",
  networkPassword = "demopass"
}: QRCodeDisplayProps) {
  const [url, setUrl] = useState<string>("");
  
  useEffect(() => {
    // Set the URL to the current host + /poll
    const baseUrl = window.location.origin;
    setUrl(`${baseUrl}/poll`);
  }, []);

  if (!url) return <div className="animate-pulse bg-white/20 h-64 w-64 rounded-lg"></div>;

  return (
    <div className={`bg-white rounded-lg ${className}`}>
      <QRCode
        value={url}
        size={size}
        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
        viewBox={`0 0 ${size} ${size}`}
      />
      
      {showNetworkInfo && (
        <div className="mt-3 border-t border-gray-200 pt-2">
          <p className="text-center text-black text-xs font-semibold">Connect to Wi-Fi first:</p>
          <p className="text-center text-black text-xs">Network: {networkName}</p>
          <p className="text-center text-black text-xs">Password: {networkPassword}</p>
        </div>
      )}
    </div>
  );
} 