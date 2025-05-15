import AdminPanel from "@/app/_components/admin-panel";
import { QRCodeDisplay } from "@/app/_components/qr-code";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Top navigation bar */}
      <nav className="bg-white border-b border-slate-200 px-6 py-3 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <svg className="w-8 h-8 text-indigo-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 21C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H17C18.1046 3 19 3.89543 19 5V19C19 20.1046 18.1046 21 17 21H7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M9 7H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M9 11H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M9 15H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <h1 className="text-xl font-semibold text-slate-800">Print Your Prompt <span className="text-indigo-600">Admin</span></h1>
          </div>
          <div className="flex items-center space-x-4">
            <Button asChild variant="ghost" size="sm">
              <Link href="/" className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                </svg>
                Home
              </Link>
            </Button>
            <div className="h-6 w-px bg-slate-300"></div>
            <Button variant="ghost" size="sm" className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
              </svg>
              Logout
            </Button>
          </div>
        </div>
      </nav>

      {/* Main content container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Dashboard grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Status card */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle>System Status</CardTitle>
                <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">
                  Online
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Printer Connection</span>
                <span className="flex items-center text-green-600">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                  </svg>
                  Connected
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">OpenAI API</span>
                <span className="flex items-center text-green-600">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                  </svg>
                  Active
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Database</span>
                <span className="flex items-center text-green-600">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                  </svg>
                  Connected
                </span>
              </div>
            </CardContent>
          </Card>

          {/* QR Code card */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle>QR Code</CardTitle>
                <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-800">
                  Download
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                <QRCodeDisplay 
                  size={150} 
                  showNetworkInfo={true}
                  networkName={process.env.NEXT_PUBLIC_WIFI_NAME || "iPhone-Hotspot"}
                  networkPassword={process.env.NEXT_PUBLIC_WIFI_PASSWORD || "demopass"}
                />
              </div>
              <div className="mt-4 text-center">
                <p className="text-slate-600 text-sm">Scan to access the app</p>
                <p className="text-slate-500 text-xs mt-1">
                  WiFi: <span className="font-medium">{process.env.NEXT_PUBLIC_WIFI_NAME || "iPhone-Hotspot"}</span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick actions card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex flex-col items-center justify-center"
                >
                  <svg className="w-6 h-6 text-indigo-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                  <span className="text-sm font-medium text-slate-700">Test Print</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex flex-col items-center justify-center"
                >
                  <svg className="w-6 h-6 text-indigo-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                  </svg>
                  <span className="text-sm font-medium text-slate-700">New Prompt</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex flex-col items-center justify-center"
                >
                  <svg className="w-6 h-6 text-indigo-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path>
                  </svg>
                  <span className="text-sm font-medium text-slate-700">Settings</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex flex-col items-center justify-center"
                >
                  <svg className="w-6 h-6 text-indigo-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                  </svg>
                  <span className="text-sm font-medium text-slate-700">Export Data</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin panel and camera feed section */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-6">
          {/* Admin panel */}
          <Card className="lg:col-span-3">
            <CardHeader className="border-b pb-3 bg-slate-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                  </svg>
                  <CardTitle>Prompt Management</CardTitle>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" className="flex items-center h-8">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
                    </svg>
                    Filter
                  </Button>
                  <Button size="sm" className="flex items-center h-8">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                    </svg>
                    New Prompt
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs defaultValue="session" className="w-full">
                <TabsList className="w-full justify-start px-4 py-2 border-b bg-slate-50">
                  <TabsTrigger value="session">Session Control</TabsTrigger>
                  <TabsTrigger value="prompts">All Prompts</TabsTrigger>
                  <TabsTrigger value="generation">Image Generation</TabsTrigger>
                </TabsList>
                <TabsContent value="session" className="p-4 m-0 border-0">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800">Voting Session</h3>
                      <p className="text-sm text-slate-500">Not running</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Button className="bg-green-500 hover:bg-green-600">Start New Session</Button>
                      <Button variant="outline" className="text-red-500 border-red-200 hover:bg-red-50">End Session</Button>
                    </div>
                    <div className="pt-4">
                      <Button variant="link" className="p-0 h-auto text-indigo-600">
                        Open voting page (public URL)
                      </Button>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="prompts" className="p-0 m-0 border-0">
                  <AdminPanel />
                </TabsContent>
                <TabsContent value="generation" className="p-4 m-0 border-0">
                  <div className="flex justify-end mb-4">
                    <Button variant="outline">Microsoft Excel</Button>
                  </div>
                  <p className="text-slate-500 text-center py-8">No generated images yet</p>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Camera feed */}
          <Card className="lg:col-span-2">
            <CardHeader className="border-b pb-3 bg-slate-50">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                  </svg>
                  <CardTitle>PrintCam Live</CardTitle>
                </div>
                <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100">
                  <span className="w-2 h-2 mr-1 rounded-full bg-red-600 animate-pulse"></span>
                  Live
                </Badge>
              </div>
            </CardHeader>
            <div className="bg-slate-900 p-0">
              <iframe
                src="https://vdo.ninja/?view=printcam"
                className="w-full aspect-video"
                allow="camera; microphone; fullscreen"
                title="PrintCam Live Stream"
                frameBorder={0}
              ></iframe>
            </div>
            <CardFooter className="p-3 bg-slate-50 border-t flex justify-between items-center">
              <div className="text-xs text-slate-500">Stream ID: printcam</div>
              <div className="flex space-x-2">
                <Button variant="outline" size="icon" className="w-8 h-8 rounded-full p-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 001.414 1.414m2.828-4.242a1 1 0 010 1.414m2.828-2.828a1 1 0 010-1.414"></path>
                  </svg>
                </Button>
                <Button variant="outline" size="icon" className="w-8 h-8 rounded-full p-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path>
                  </svg>
                </Button>
                <Button variant="destructive" size="icon" className="w-8 h-8 rounded-full p-0 bg-red-500 hover:bg-red-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center">
          <div className="text-sm text-slate-500 mb-4 sm:mb-0">
            © {new Date().getFullYear()} Print Your Prompt. All rights reserved.
          </div>
          <div className="flex space-x-6">
            <Button asChild variant="link" className="text-sm text-slate-500 h-auto p-0">
              <Link href="/gallery">Gallery</Link>
            </Button>
            <Button asChild variant="link" className="text-sm text-slate-500 h-auto p-0">
              <Link href="/live">Live View</Link>
            </Button>
            <Button asChild variant="link" className="text-sm text-slate-500 h-auto p-0">
              <a href="#">Help</a>
            </Button>
          </div>
        </div>
      </footer>
    </main>
  );
} 