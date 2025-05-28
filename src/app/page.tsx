'use client';

import Link from "next/link";
import { QRCodeDisplay } from "@/app/_components/qr-code";
import { useState, useEffect } from "react";

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 overflow-hidden">
      {/* Ambient background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-100/30 to-indigo-100/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-violet-100/30 to-purple-100/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 px-4 sm:px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-lg sm:text-xl font-semibold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Print Your Prompt
            </span>
          </div>
          <div className="hidden sm:flex items-center space-x-6">
            <Link href="/gallery" className="text-slate-600 hover:text-slate-900 transition-colors font-medium">
              Gallery
            </Link>
            <Link 
              href="/admin" 
              className="px-4 py-2 bg-slate-900 text-white rounded-full hover:bg-slate-800 transition-all duration-200 font-medium text-sm"
            >
              Admin
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-80px)] px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            
            {/* Left Side - Content */}
            <div className="text-center lg:text-left order-2 lg:order-1">
              <div className="inline-flex items-center px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-blue-700 text-sm font-medium mb-6">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></span>
                Live collaborative AI art
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                <span className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent">
                  Collective
                </span>
                <br />
                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
                  Creativity
                </span>
              </h1>
              
              <p className="text-lg sm:text-xl text-slate-600 mb-8 leading-relaxed">
                Transform ideas into art through collaborative prompting. 
                <span className="text-slate-900 font-medium block sm:inline">Vote, generate, and print stunning AI images.</span>
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
                <Link 
                  href="/live"
                  className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center"
                >
                  Start Creating
                  <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link 
                  href="/gallery"
                  className="px-8 py-4 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl hover:border-slate-300 hover:bg-slate-50 transition-all duration-300 font-semibold text-lg flex items-center justify-center"
                >
                  View Gallery
                </Link>
              </div>

              {/* Quick Stats */}
              {/* <div className="grid grid-cols-3 gap-4 text-center lg:text-left">
                <div>
                  <div className="text-2xl font-bold text-slate-900">⚡</div>
                  <div className="text-sm text-slate-600 font-medium">Real-time</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">🎨</div>
                  <div className="text-sm text-slate-600 font-medium">AI-Powered</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">🖼️</div>
                  <div className="text-sm text-slate-600 font-medium">Print Ready</div>
                </div>
              </div> */}
            </div>

            {/* Right Side - QR Code */}
            <div className="flex justify-center order-1 lg:order-2">
              <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 max-w-sm w-full">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Join the Session</h2>
                  <p className="text-slate-600">Scan to participate instantly</p>
                </div>
                
                <div className="flex justify-center mb-6">
                  <div className="p-6 bg-white rounded-2xl shadow-lg border border-slate-100">
                    <QRCodeDisplay 
                      size={220} 
                      showNetworkInfo={false} 
                      className="bg-transparent border-0 p-0 rounded-none" 
                    />
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Link 
                    href="/live"
                    className="w-full inline-flex items-center justify-center px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors font-medium"
                  >
                    <span className="text-slate-400 mr-2">🌐</span>
                    Open Voting Page
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="sm:hidden fixed bottom-4 left-4 right-4 z-20">
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-4 shadow-lg border border-white/20">
          <div className="flex justify-around">
            <Link href="/gallery" className="flex flex-col items-center text-slate-600 hover:text-slate-900 transition-colors">
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs font-medium">Gallery</span>
            </Link>
            <Link href="/live" className="flex flex-col items-center text-blue-600">
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-xs font-medium">Create</span>
            </Link>
            <Link href="/admin" className="flex flex-col items-center text-slate-600 hover:text-slate-900 transition-colors">
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-xs font-medium">Admin</span>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
