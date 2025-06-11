'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

export default function AdminLivePage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [liveStreamMuted, setLiveStreamMuted] = useState(false);

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
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-100/20 to-indigo-100/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-purple-100/20 to-pink-100/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

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
                <p className="text-xs text-slate-400">Live Video Feed</p>
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
              <Link href="/admin" className="text-slate-300 hover:text-white transition-colors">
                <Button variant="ghost" size="sm" className="hover:bg-white/10">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Admin
                </Button>
              </Link>
              
              <Link href="/" className="text-slate-300 hover:text-white transition-colors">
                <Button variant="ghost" size="sm" className="hover:bg-white/10">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 flex h-[calc(100vh-80px)]">
        
        {/* Collapsible Sidebar */}
        <div className={cn(
          "bg-black/30 backdrop-blur-xl border-r border-white/10 transition-all duration-300 flex flex-col",
          sidebarCollapsed ? "w-16" : "w-80"
        )}>
          {/* Sidebar Header */}
          <div className={cn(
            "p-6 border-b border-white/10 flex items-center",
            sidebarCollapsed && "p-3 justify-center"
          )}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="text-slate-300 hover:text-white hover:bg-white/10 transition-all duration-200"
            >
              <svg className={cn("w-5 h-5 transition-transform duration-300", sidebarCollapsed && "rotate-180")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
              {!sidebarCollapsed && <span className="ml-2 font-medium">Collapse</span>}
            </Button>
          </div>

          {/* Navigation */}
          <div className={cn(
            "flex-1 overflow-y-auto",
            sidebarCollapsed ? "px-3 py-6" : "px-6 py-6"
          )}>
            <div className="space-y-2">
              {!sidebarCollapsed && (
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Navigation</h3>
              )}
              <div className="space-y-2">
                {[
                  { id: 'overview', label: 'Overview', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', href: '/admin' },
                  { id: 'live', label: 'Live Video', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z', isActive: true },
                  { id: 'prompts', label: 'Prompt Management', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', href: '/admin' },
                  { id: 'generation', label: 'Image Generation', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z', href: '/admin' },
                  { id: 'analytics', label: 'Analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', href: '/admin' },
                  { id: 'settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', href: '/admin' }
                ].map((panel) => (
                  panel.isActive ? (
                    <div
                      key={panel.id}
                      className={cn(
                        "w-full flex items-center rounded-xl text-left transition-all duration-200",
                        sidebarCollapsed ? "justify-center h-10 w-10 p-0" : "space-x-3 px-3 py-2.5",
                        "bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-white border border-blue-500/30"
                      )}
                      title={sidebarCollapsed ? panel.label : undefined}
                    >
                      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={panel.icon} />
                      </svg>
                      {!sidebarCollapsed && (
                        <span className="font-medium">{panel.label}</span>
                      )}
                    </div>
                  ) : (
                    <Link key={panel.id} href={panel.href!}>
                      <button
                        className={cn(
                          "w-full flex items-center rounded-xl text-left transition-all duration-200",
                          sidebarCollapsed ? "justify-center h-10 w-10 p-0" : "space-x-3 px-3 py-2.5",
                          "text-slate-300 hover:text-white hover:bg-white/5"
                        )}
                        title={sidebarCollapsed ? panel.label : undefined}
                      >
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={panel.icon} />
                        </svg>
                        {!sidebarCollapsed && (
                          <span className="font-medium">{panel.label}</span>
                        )}
                      </button>
                    </Link>
                  )
                ))}
              </div>
            </div>

            {/* Live Stream Controls */}
            <div className="space-y-3 mt-8">
              {!sidebarCollapsed && (
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Stream Controls</h3>
              )}
              <div className="space-y-3">
                {!sidebarCollapsed ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-300">Audio</span>
                      <Switch 
                        checked={!liveStreamMuted} 
                        onCheckedChange={(checked: boolean) => setLiveStreamMuted(!checked)}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setLiveStreamMuted(!liveStreamMuted)}
                      className={cn(
                        "w-10 h-10 p-0 text-slate-300 hover:text-white transition-all duration-200 rounded-xl",
                        !liveStreamMuted ? "bg-green-500/20 text-green-400" : "bg-white/5"
                      )}
                      title="Toggle Audio"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={liveStreamMuted ? "M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" : "M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"} />
                      </svg>
                    </Button>
                  </>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={cn(
                    "w-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white transition-all duration-200",
                    sidebarCollapsed ? "justify-center h-10 w-10 p-0" : "justify-start px-3 py-2"
                  )}
                  onClick={() => window.open('https://vdo.ninja/?push&room=promptprints&password=06182025', '_blank')}
                  title={sidebarCollapsed ? "Send Video" : undefined}
                >
                  <svg className={cn("w-4 h-4", !sidebarCollapsed && "mr-2")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  {!sidebarCollapsed && "Send Video"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Live Video Feed - Full Remaining Space */}
        <div className="flex-1 relative bg-black">
          <iframe
            src="https://vdo.ninja/?scene&room=promptprints&password=06182025&cover&fit"
            className="w-full h-full border-0"
            allow="camera; microphone; fullscreen"
            title="PrintCam Live Stream"
            style={{ objectFit: 'cover' }}
          />
          
          {/* Video Overlay Controls */}
          <div className="absolute top-4 right-4 flex space-x-2">
            <Badge className="bg-red-500/90 text-white border-red-400">
              <span className="w-2 h-2 mr-2 rounded-full bg-white animate-pulse"></span>
              LIVE
            </Badge>
          </div>

          {/* Video Info Overlay */}
          <div className="absolute bottom-4 left-4">
            <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2 text-white">
              <p className="text-sm font-medium">PrintCam Live</p>
              <p className="text-xs text-slate-300">Room: promptprints</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
} 