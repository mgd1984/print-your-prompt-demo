'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AdminPanel from "@/app/_components/admin-panel";
import { QRCodeDisplay } from "@/app/_components/qr-code";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { api } from "@/trpc/react";
import EnhancedImageGenerator from "@/app/_components/enhanced-image-generator";

export default function AdminPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [activePanel, setActivePanel] = useState<'overview' | 'prompts' | 'settings' | 'analytics' | 'generation'>('overview');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [liveStreamMuted, setLiveStreamMuted] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [selectedPromptForGeneration, setSelectedPromptForGeneration] = useState<string | null>(null);
  const [generationSettings, setGenerationSettings] = useState({
    model: "gpt-image-1" as "gpt-image-1" | "dall-e-3" | "dall-e-2",
    quality: "standard" as "standard" | "hd",
    style: "vivid" as "vivid" | "natural",
    size: "1024x1024" as "1024x1024" | "1024x1536" | "1536x1024" | "auto",
  });

  // Get all prompts for the Image Generation Studio
  const promptsQuery = api.prompt.getAll.useQuery(
    { seconds: 3600, limit: 100 },
    { 
      refetchInterval: 30000,
      refetchIntervalInBackground: true,
    }
  );

  // Generate image mutation
  const generateImageMutation = api.image.generate.useMutation({
    onSuccess: (data) => {
      console.log("✅ Image generation SUCCESS:", data);
      setIsGeneratingImage(false);
      if (data.imageUrl) {
        setGeneratedImageUrl(data.imageUrl);
        console.log("✅ Image URL set:", data.imageUrl);
      } else {
        console.error("❌ No image URL returned from generation");
      }
    },
    onError: (error) => {
      console.error("❌ Image generation ERROR:", error);
      setIsGeneratingImage(false);
      alert("Failed to generate image: " + error.message);
    },
    onMutate: (variables) => {
      console.log("🚀 Starting image generation with variables:", variables);
    },
  });

  // Print image mutation
  const printImageMutation = api.printer.print.useMutation({
    onSuccess: (data) => {
      console.log("Image sent to printer successfully:", data);
      alert(`Image sent to printer! ${data.highQuality ? '(High-quality TIFF)' : '(Standard quality)'}`);
    },
    onError: (error) => {
      console.error("Error printing image:", error);
      alert("Failed to print image: " + error.message);
    },
  });

  // Check authentication on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/admin/auth', {
          method: 'GET',
        });
        
        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          router.push('/admin/login');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAuthenticated(false);
        router.push('/admin/login');
      }
    };

    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth', {
        method: 'DELETE',
      });
      router.push('/admin/login');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
      router.push('/admin/login');
      router.refresh();
    }
  };

  // Show loading state while checking authentication
  if (isAuthenticated === null) {
  return (
      <main className="min-h-screen bg-slate-900 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-100/40 to-indigo-100/40 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-purple-100/40 to-pink-100/40 rounded-full blur-3xl animate-pulse delay-1000"></div>
          </div>
        
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <svg className="w-8 h-8 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <p className="text-slate-600 text-lg">Verifying access...</p>
          </div>
        </div>
      </main>
    );
  }

  // If not authenticated, don't render the admin content
  if (!isAuthenticated) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-900 overflow-hidden">

      {/* Top Navigation Bar */}
      <nav className="relative z-50 border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
              <div className="flex justify-between items-center">
            {/* Logo & Brand */}
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Print Your Prompt</h1>
                <p className="text-xs text-slate-400">Admin Control Center</p>
              </div>
              </div>

            {/* Status Indicators */}
            <div className="hidden md:flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-slate-300">System Online</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-slate-300">Live Stream</span>
              </div>
              </div>

            {/* Navigation & Controls */}
            <div className="flex items-center space-x-4">
                <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowQR(!showQR)}
                className="text-slate-300 hover:text-white hover:bg-white/10"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                QR Code
              </Button>
              
              <Link href="/" className="text-slate-300 hover:text-white transition-colors">
                <Button variant="ghost" size="sm" className="hover:bg-white/10">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Exit
                </Button>
              </Link>
              
                <Button 
                onClick={handleLogout}
                variant="ghost" 
                size="sm"
                className="text-red-300 hover:text-red-200 hover:bg-red-500/10"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Dashboard Layout */}
      <div className="relative z-10 flex h-[calc(100vh-80px)]">
        
        {/* Left Sidebar - Control Panel */}
        <div className="w-80 border-r border-white/10 bg-black/20 backdrop-blur-xl overflow-y-auto">
          <div className="p-6 space-y-6">
            
            {/* Panel Navigation */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Control Panels</h3>
              <div className="space-y-1">
                {[
                  { id: 'overview', label: 'Overview', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
                  { id: 'prompts', label: 'Prompt Management', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
                  { id: 'generation', label: 'Image Generation', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
                  { id: 'analytics', label: 'Analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
                  { id: 'settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' }
                ].map((panel) => (
                  <button
                    key={panel.id}
                    onClick={() => setActivePanel(panel.id as any)}
                    className={cn(
                      "w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200",
                      activePanel === panel.id 
                        ? "bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-white border border-blue-500/30" 
                        : "text-slate-300 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={panel.icon} />
                    </svg>
                    <span className="font-medium">{panel.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Quick Actions</h3>
              <div className="space-y-2">
                <Button className="w-full justify-start bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-lg">
                  <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Test Print
                </Button>
                
                <Button variant="ghost" className="w-full justify-start bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white transition-all duration-200">
                  <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Reset Session
                </Button>
                
                <Link href="/gallery">
                  <Button variant="ghost" className="w-full justify-start bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white transition-all duration-200">
                    <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    View Gallery
                  </Button>
                </Link>
              </div>
            </div>

            {/* Live Stream Controls */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Stream Controls</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">Audio</span>
                  <Switch 
                    checked={!liveStreamMuted} 
                    onCheckedChange={(checked: boolean) => setLiveStreamMuted(!checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">Fullscreen Mode</span>
                  <Switch 
                    checked={isFullscreen} 
                    onCheckedChange={setIsFullscreen}
                  />
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white transition-all duration-200"
                  onClick={() => window.open('https://vdo.ninja/?push&room=promptprints&password=06182025', '_blank')}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Send Video
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          
          {/* Live Video Feed - Prominent Display */}
          {activePanel !== 'generation' && (
            <div className={cn(
              "relative bg-black border-b border-white/10 transition-all duration-300",
              isFullscreen ? "flex-1" : "h-80"
            )}>
              <iframe
                src="https://vdo.ninja/?scene&room=promptprints&password=06182025"
                className="w-full h-full"
                allow="camera; microphone; fullscreen"
                title="PrintCam Live Stream"
                frameBorder={0}
              />
              
              {/* Video Overlay Controls */}
              <div className="absolute top-4 right-4 flex space-x-2">
                <Badge className="bg-red-500/90 text-white border-red-400">
                  <span className="w-2 h-2 mr-2 rounded-full bg-white animate-pulse"></span>
                  LIVE
                </Badge>
                <Button 
                  size="sm" 
                  variant="secondary"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="bg-black/50 hover:bg-black/70 text-white border-white/20"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isFullscreen ? "M9 9V4.5M9 9H4.5M9 9L3.5 3.5M15 9h4.5M15 9V4.5M15 9l5.5-5.5M9 15v4.5M9 15H4.5M9 15l-5.5 5.5M15 15h4.5M15 15v4.5m0-4.5l5.5 5.5" : "M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"} />
                  </svg>
                </Button>
              </div>

              {/* Video Info Overlay */}
              <div className="absolute bottom-4 left-4">
                <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2 text-white">
                  <p className="text-sm font-medium">PrintCam Live</p>
                  <p className="text-xs text-slate-300">Room: promptprints</p>
                </div>
              </div>
            </div>
          )}

          {/* Control Panel Content */}
          {!isFullscreen && (
            <div className={cn(
              "flex-1 p-6 overflow-y-auto",
              activePanel === 'generation' ? "h-[calc(100vh-80px)]" : ""
            )}>
              {activePanel === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-white/5 backdrop-blur-xl border border-white/10">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-slate-400">Active Sessions</p>
                            <p className="text-3xl font-bold text-white">1</p>
                          </div>
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white/5 backdrop-blur-xl border border-white/10">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-slate-400">Total Prompts</p>
                            <p className="text-3xl font-bold text-white">24</p>
                          </div>
                          <div className="w-12 h-12 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white/5 backdrop-blur-xl border border-white/10">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                    <div>
                            <p className="text-sm text-slate-400">Images Generated</p>
                            <p className="text-3xl font-bold text-white">8</p>
                    </div>
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                    </div>
                    </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="bg-white/5 backdrop-blur-xl border border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white">System Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {[
                        { name: 'Printer Connection', status: 'Connected', color: 'green' },
                        { name: 'OpenAI API', status: 'Active', color: 'green' },
                        { name: 'Database', status: 'Connected', color: 'green' },
                        { name: 'Live Stream', status: 'Broadcasting', color: 'red' }
                      ].map((item) => (
                        <div key={item.name} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                          <span className="text-slate-300">{item.name}</span>
                          <div className="flex items-center space-x-2">
                            <div className={cn(
                              "w-2 h-2 rounded-full animate-pulse",
                              item.color === 'green' ? 'bg-green-400' : 'bg-red-400'
                            )}></div>
                            <span className={cn(
                              "text-sm font-medium",
                              item.color === 'green' ? 'text-green-400' : 'text-red-400'
                            )}>{item.status}</span>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              )}

              {activePanel === 'prompts' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white">Prompt Management</h2>
                  </div>
                  <Card className="bg-white/5 backdrop-blur-xl border border-white/10">
                    <CardContent className="p-6">
                      <AdminPanel />
            </CardContent>
          </Card>
                </div>
              )}

              {activePanel === 'generation' && (
                <div className="h-full">
                  <EnhancedImageGenerator 
                    variant="print-flow"
                    className="h-full"
                    onImageGenerated={(imageUrl) => {
                      setGeneratedImageUrl(imageUrl);
                      console.log("✅ Image generated in dashboard:", imageUrl);
                    }}
                    onSettingsChange={(showSettings) => {
                      console.log("Settings panel:", showSettings ? "opened" : "closed");
                    }}
                  />
                </div>
              )}

              {activePanel === 'analytics' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-white">Analytics Dashboard</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="bg-white/5 backdrop-blur-xl border border-white/10">
                      <CardHeader>
                        <CardTitle className="text-white">Session Activity</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-40 flex items-center justify-center text-slate-400">
                          <p>Activity chart would go here</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-white/5 backdrop-blur-xl border border-white/10">
                      <CardHeader>
                        <CardTitle className="text-white">Popular Prompts</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-40 flex items-center justify-center text-slate-400">
                          <p>Popular prompts list would go here</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
              </div>
              )}

              {activePanel === 'settings' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-white">System Settings</h2>
                  <Card className="bg-white/5 backdrop-blur-xl border border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white">Configuration</CardTitle>
            </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300">Auto-print enabled</span>
                        <Switch />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300">Session timeout (minutes)</span>
                        <input 
                          type="number" 
                          defaultValue="30" 
                          className="w-20 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300">Max prompts per session</span>
                        <input 
                          type="number" 
                          defaultValue="10" 
                          className="w-20 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* QR Code Modal */}
      {showQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 max-w-sm mx-4">
            <div className="text-center space-y-4">
              <h3 className="text-xl font-bold text-white">Session Access</h3>
              <div className="bg-white p-4 rounded-xl">
                <QRCodeDisplay 
                  size={200} 
                  showNetworkInfo={true}
                  networkName={process.env.NEXT_PUBLIC_WIFI_NAME || "iPhone-Hotspot"}
                  networkPassword={process.env.NEXT_PUBLIC_WIFI_PASSWORD || "demopass"}
                />
              </div>
              <div className="text-center">
                <p className="text-slate-300">Scan to join the session</p>
                <p className="text-sm text-slate-400">
                  WiFi: <span className="text-white font-medium">{process.env.NEXT_PUBLIC_WIFI_NAME || "iPhone-Hotspot"}</span>
                </p>
          </div>
              <Button 
                onClick={() => setShowQR(false)}
                className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30"
              >
                Close
            </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
} 