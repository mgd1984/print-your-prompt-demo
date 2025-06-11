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
import { 
  Volume2, 
  VolumeX, 
  ExternalLink, 
  Video, 
  Wifi, 
  Maximize2,
  LayoutDashboard,
  MessageSquare,
  ImageIcon,
  BarChart3,
  Settings,
  Printer,
  RotateCcw,
  Images,
  Users,
  FileText
} from "lucide-react";

export default function AdminPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [activePanel, setActivePanel] = useState<'overview' | 'prompts' | 'settings' | 'analytics' | 'generation' | 'live'>('overview');
  const [showQR, setShowQR] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [selectedPromptForGeneration, setSelectedPromptForGeneration] = useState<string | null>(null);
  const [liveStreamMuted, setLiveStreamMuted] = useState(false);
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
        <div className={cn(
          "border-r border-white/10 bg-black/20 backdrop-blur-xl overflow-y-auto transition-all duration-300 ease-in-out",
          sidebarCollapsed ? "w-16" : "w-80"
        )}>
          <div className={cn(
            "space-y-6 transition-all duration-300",
            sidebarCollapsed ? "p-3" : "p-6"
          )}>
            
            {/* Sidebar Toggle */}
            <div className={cn(
              "flex items-center transition-all duration-300",
              sidebarCollapsed ? "justify-center" : "justify-between"
            )}>
              {!sidebarCollapsed && (
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Controls</h3>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className={cn(
                  "text-slate-400 hover:text-white hover:bg-white/10 transition-all duration-200",
                  sidebarCollapsed ? "h-10 w-10 p-0" : "p-2"
                )}
              >
                <svg className={cn("w-4 h-4 transition-transform duration-200", sidebarCollapsed ? "rotate-180" : "")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              </Button>
            </div>
            
            {/* Panel Navigation */}
            <div className="space-y-2">
              {!sidebarCollapsed && (
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Control Panels</h3>
              )}
              <div className="space-y-1">
                {[
                  { id: 'overview', label: 'Overview', Icon: LayoutDashboard },
                  { id: 'live', label: 'Live Video', Icon: Video },
                  { id: 'prompts', label: 'Prompt Management', Icon: MessageSquare },
                  { id: 'generation', label: 'Image Generation', Icon: ImageIcon },
                  { id: 'analytics', label: 'Analytics', Icon: BarChart3 },
                  { id: 'settings', label: 'Settings', Icon: Settings }
                ].map((panel) => (
                  <button
                    key={panel.id}
                    onClick={() => setActivePanel(panel.id as any)}
                    className={cn(
                      "w-full flex items-center rounded-xl text-left transition-all duration-200",
                      sidebarCollapsed ? "justify-center h-10 w-10 p-0" : "space-x-3 px-3 py-2.5",
                      activePanel === panel.id 
                        ? "bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-white border border-blue-500/30" 
                        : "text-slate-300 hover:text-white hover:bg-white/5"
                    )}
                    title={sidebarCollapsed ? panel.label : undefined}
                  >
                    <panel.Icon className="w-5 h-5 flex-shrink-0" />
                    {!sidebarCollapsed && (
                      <span className="font-medium">{panel.label}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-3">
              {!sidebarCollapsed && (
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Quick Actions</h3>
              )}
              <div className="space-y-2">
                <Button className={cn(
                  "w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-lg transition-all duration-200",
                  sidebarCollapsed ? "justify-center h-10 w-10 p-0" : "justify-start px-3 py-2"
                )}
                title={sidebarCollapsed ? "Test Print" : undefined}
                >
                  <Printer className={cn("w-4 h-4", !sidebarCollapsed && "mr-3")} />
                  {!sidebarCollapsed && "Test Print"}
                </Button>
                
                <Button variant="ghost" className={cn(
                  "w-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white transition-all duration-200",
                  sidebarCollapsed ? "justify-center h-10 w-10 p-0" : "justify-start px-3 py-2"
                )}
                title={sidebarCollapsed ? "Reset Session" : undefined}
                >
                  <RotateCcw className={cn("w-4 h-4", !sidebarCollapsed && "mr-3")} />
                  {!sidebarCollapsed && "Reset Session"}
                </Button>
                
                <Link href="/gallery">
                  <Button variant="ghost" className={cn(
                    "w-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white transition-all duration-200",
                    sidebarCollapsed ? "justify-center h-10 w-10 p-0" : "justify-start px-3 py-2"
                  )}
                  title={sidebarCollapsed ? "View Gallery" : undefined}
                  >
                    <Images className={cn("w-4 h-4", !sidebarCollapsed && "mr-3")} />
                    {!sidebarCollapsed && "View Gallery"}
                  </Button>
                </Link>
              </div>
            </div>


          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          


          {/* Control Panel Content */}
          <div className="flex-1 overflow-y-auto p-6">
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
                          <Users className="w-6 h-6 text-blue-400" />
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
                          <FileText className="w-6 h-6 text-green-400" />
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
                          <ImageIcon className="w-6 h-6 text-purple-400" />
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

            {activePanel === 'live' && (
              <div className="h-full flex flex-col space-y-6">
                {/* Live Video Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Live Video Feed</h2>
                    <p className="text-slate-400">Monitor the print area in real-time</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Badge className="bg-red-500/90 text-white border-red-400">
                      <span className="w-2 h-2 mr-2 rounded-full bg-white animate-pulse"></span>
                      LIVE
                    </Badge>
                  </div>
                </div>

                {/* Video Feed with Overlaid Controls */}
                <Card className="bg-white/5 backdrop-blur-xl border border-white/10 flex-1">
                  <CardContent className="p-0 h-full">
                    <div className="relative h-full min-h-[70vh] bg-black rounded-lg overflow-hidden group">
                      <iframe
                        src="https://vdo.ninja/?scene&room=promptprints&password=06182025&cover&fit"
                        className="w-full h-full border-0"
                        allow="camera; microphone; fullscreen"
                        title="PrintCam Live Stream"
                        style={{ objectFit: 'cover' }}
                      />
                      
                      {/* Top Right Controls */}
                      <div className="absolute top-4 right-4 flex items-center space-x-3">
                                                 {/* Audio Control */}
                         <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 flex items-center space-x-2 text-white border border-white/20">
                           {liveStreamMuted ? (
                             <VolumeX className="w-4 h-4" />
                           ) : (
                             <Volume2 className="w-4 h-4" />
                           )}
                           <Switch 
                             checked={!liveStreamMuted} 
                             onCheckedChange={(checked: boolean) => setLiveStreamMuted(!checked)}
                           />
                         </div>

                                                 {/* Send Video Button */}
                         <Button 
                           variant="ghost" 
                           size="sm" 
                           className="bg-black/60 backdrop-blur-sm hover:bg-black/80 border border-white/20 hover:border-white/40 text-white transition-all duration-200 rounded-lg"
                           onClick={() => window.open('https://vdo.ninja/?push&room=promptprints&password=06182025', '_blank')}
                         >
                           <ExternalLink className="w-4 h-4 mr-2" />
                           Send Video
                         </Button>
                      </div>

                                             {/* Top Left Stream Info */}
                       <div className="absolute top-4 left-4">
                         <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 text-white border border-white/20">
                           <div className="flex items-center space-x-2">
                             <Video className="w-4 h-4" />
                             <span className="text-sm font-medium">Stream Controls</span>
                           </div>
                         </div>
                       </div>
                      
                      {/* Bottom Left Video Info */}
                      <div className="absolute bottom-4 left-4">
                        <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 text-white border border-white/20">
                          <p className="text-sm font-medium">PrintCam Live</p>
                          <p className="text-xs text-slate-300">Room: promptprints</p>
                        </div>
                      </div>

                                             {/* Bottom Right Room Info */}
                       <div className="absolute bottom-4 right-4">
                         <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 text-white border border-white/20">
                           <div className="flex items-center space-x-2">
                             <Wifi className="w-3 h-3 text-green-400" />
                             <span className="text-xs text-slate-300">Connected</span>
                           </div>
                         </div>
                       </div>

                                             {/* Fullscreen Button - appears on hover */}
                       <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                         <Button 
                           variant="ghost" 
                           size="lg" 
                           className="bg-black/70 backdrop-blur-sm hover:bg-black/90 border border-white/30 hover:border-white/50 text-white transition-all duration-200 rounded-xl p-4"
                           onClick={() => {
                             const iframe = document.querySelector('iframe[title="PrintCam Live Stream"]') as HTMLIFrameElement;
                             if (iframe?.requestFullscreen) {
                               iframe.requestFullscreen();
                             }
                           }}
                         >
                           <Maximize2 className="w-6 h-6" />
                         </Button>
                       </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
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