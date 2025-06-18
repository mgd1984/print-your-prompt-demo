"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  Settings, 
  ImageIcon, 
  Palette, 
  Printer, 
  AlertCircle, 
  Star, 
  X, 
  Check, 
  Loader2,
  Wand2,
  Camera,
  Sliders,
  ChevronDown,
  ChevronUp,
  Users,
  Clock,
  Vote,
  Grid3X3,
  PanelRight,
  PanelRightClose,
  Search,
  MoreHorizontal
} from "lucide-react";
import { api } from "@/trpc/react";
import type { TRPCClientErrorLike } from "@trpc/client";
import type { AppRouter } from "@/server/api/root";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import PrintSettingsPanel from "./print-settings-panel";

// Types
interface GenerationSettings {
  model: "gpt-image-1" | "dall-e-3" | "dall-e-2";
  quality: "standard" | "hd";
  style: "vivid" | "natural";
  size: "1024x1024" | "1024x1536" | "1536x1024" | "auto";
}

interface PromptWithVotes {
  id: number;
  text: string;
  username?: string | null;
  votes: number;
  status: string;
  createdAt: Date;
}

interface GalleryItem {
  id: number;
  text: string;
  username?: string | null;
  imageUrl?: string | null;
  createdAt: Date;
}

interface EnhancedImageGeneratorProps {
  variant?: 'standalone' | 'print-flow';
  className?: string;
  onImageGenerated?: (imageUrl: string) => void;
  onSettingsChange?: (showSettings: boolean) => void;
}

// Constants
const DEFAULT_SETTINGS: GenerationSettings = {
  model: "gpt-image-1",
  quality: "standard",
  style: "vivid",
  size: "1024x1024"
};

const STYLE_PRESETS = [
  { name: "Logo", prompt: "professional logo design, vector art style, clean geometric shapes, bold typography, negative space utilization, brand identity, scalable icon design, corporate minimalism", icon: "🎯" },
  { name: "Architecture", prompt: "architectural visualization, Zaha Hadid inspired forms, parametric design, concrete and glass materials, dramatic shadows, modernist structure, architectural photography lighting", icon: "🏗️" },
  { name: "Landscape", prompt: "epic landscape photography, golden hour lighting, misty mountains, dramatic sky, Ansel Adams composition, wide-angle vista, atmospheric perspective, natural color grading", icon: "🏔️" },
  { name: "Circuit Art", prompt: "made entirely of electronic components, circuit board aesthetic, resistors and capacitors as building blocks, copper traces, LED lights, microchip patterns, electronic sculpture", icon: "⚡" },
  { name: "Isometric", prompt: "isometric illustration style, 3D technical drawing, clean lines, flat colors with subtle gradients, architectural axonometric view, engineering blueprint aesthetic", icon: "📐" },
];

export default function EnhancedImageGenerator({ 
  variant = 'standalone',
  className,
  onImageGenerated,
  onSettingsChange
}: EnhancedImageGeneratorProps) {
  // State
  const [prompt, setPrompt] = useState("");
  const [settings, setSettings] = useState<GenerationSettings>(DEFAULT_SETTINGS);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<GalleryItem | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<PromptWithVotes | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [activeTab, setActiveTab] = useState('prompts');
  const [showSettings, setShowSettings] = useState(false);
  const [showStylePresets, setShowStylePresets] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Refs for click-away functionality
  const settingsRef = useRef<HTMLDivElement>(null);
  const stylePresetsRef = useRef<HTMLDivElement>(null);
  
  // Click-away handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
      if (stylePresetsRef.current && !stylePresetsRef.current.contains(event.target as Node)) {
        setShowStylePresets(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // tRPC queries and mutations
  const generateImageMutation = api.image.generate.useMutation({
    onSuccess: (data) => {
      setGeneratedImage(data.imageUrl);
      onImageGenerated?.(data.imageUrl);
      
      // Always save the generated image to the database
      if (selectedPrompt) {
        // Update existing prompt with the image
        updatePromptImageMutation.mutate({
          promptId: selectedPrompt.id,
          imageUrl: data.imageUrl
        });
      } else {
        // Create a new prompt record for custom prompts
        createPromptWithImageMutation.mutate({
          text: prompt.trim(),
          imageUrl: data.imageUrl,
          username: null // Anonymous for now
        });
      }
    },
    onError: (error: TRPCClientErrorLike<AppRouter>) => {
      console.error("Image generation failed:", error);
    }
  });

  // Get prompts from the most recent completed session for image generation
  const promptsQuery = api.prompt.getLatestCompletedSession.useQuery(
    { limit: 50 },
    { 
      refetchInterval: 30000,
      refetchIntervalInBackground: true,
    }
  );

  const galleryQuery = api.prompt.getGallery.useQuery(
    { limit: 20 },
    { 
      refetchInterval: 30000,
    }
  );

  const printMutation = api.printer.print.useMutation({
    onSuccess: () => {
      console.log("Print job sent successfully");
    },
    onError: (error) => {
      console.error("Print failed:", error);
    }
  });

  // Update prompt with generated image
  const updatePromptImageMutation = api.prompt.updatePromptImage.useMutation({
    onSuccess: () => {
      console.log("Prompt updated with image URL");
      promptsQuery.refetch();
      galleryQuery.refetch();
    },
    onError: (error) => {
      console.error("Failed to update prompt with image:", error);
    }
  });

  // Create a new prompt with image
  const createPromptWithImageMutation = api.prompt.createPromptWithImage.useMutation({
    onSuccess: () => {
      console.log("New prompt created with image URL");
      promptsQuery.refetch();
      galleryQuery.refetch();
    },
    onError: (error: TRPCClientErrorLike<AppRouter>) => {
      console.error("Failed to create new prompt with image:", error);
    }
  });

  // Handle image generation
  const handleGenerate = useCallback(() => {
    const finalPrompt = selectedPrompt ? selectedPrompt.text : prompt.trim();
    if (!finalPrompt) return;
    
    generateImageMutation.mutate({
      prompt: finalPrompt,
      ...settings
    });
  }, [prompt, selectedPrompt, settings, generateImageMutation]);

  // Handle print
  const handlePrint = useCallback((imageUrl: string) => {
    printMutation.mutate({
      imageUrl,
      useHighQuality: true
    });
  }, [printMutation]);

  // Handle prompt selection
  const handlePromptSelect = useCallback((promptItem: PromptWithVotes) => {
    setSelectedPrompt(promptItem);
    setPrompt(promptItem.text);
    setShowPanel(false); // Close panel when selecting a prompt
  }, []);

  // Handle panel toggle
  const handlePanelToggle = useCallback(() => {
    const newValue = !showPanel;
    setShowPanel(newValue);
    onSettingsChange?.(newValue);
  }, [showPanel, onSettingsChange]);

  // Memoized data
  const promptList = useMemo(() => {
    return promptsQuery.data?.prompts || [];
  }, [promptsQuery.data]);

  const sortedPrompts = useMemo(() => {
    return [...promptList].sort((a, b) => b.votes - a.votes);
  }, [promptList]);

  const galleryItems = useMemo(() => {
    return galleryQuery.data?.gallery || [];
  }, [galleryQuery.data]);

  const currentPromptText = selectedPrompt ? selectedPrompt.text : prompt;
  const canGenerate = currentPromptText.trim().length > 0;

  return (
    <div className={cn("relative h-full w-full", className)}>
      {/* Main Canvas Area */}
      <div className="h-full flex flex-col">
        
        {/* Canvas/Image Display Area */}
        <div className="flex-1 flex items-center justify-center p-8">
          <AnimatePresence mode="wait">
            {generatedImage ? (
              <motion.div
                key="generated-image"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="relative max-w-2xl w-full"
              >
                <div className="relative aspect-square rounded-2xl overflow-hidden shadow-2xl bg-white">
                  <Image
                    src={generatedImage}
                    alt="Generated image"
                    fill
                    className="object-cover"
                  />
                  {/* Print settings panel overlay */}
                  <div className="absolute top-4 right-4">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          className="bg-black/50 hover:bg-black/70 text-white border-0"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col">
                        <DialogHeader className="flex-shrink-0">
                          <DialogTitle>Print Settings</DialogTitle>
                          <DialogDescription>
                            Configure your print settings for the best results
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex-1 overflow-y-auto">
                          <PrintSettingsPanel 
                            imageUrl={generatedImage}
                            onPrintStart={() => {}}
                            onPrintComplete={(result) => {
                              console.log("Print completed:", result);
                            }}
                            onPrintError={(error) => {
                              console.error("Print error:", error);
                            }}
                            className="border-0 shadow-none bg-transparent"
                          />
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
                {selectedPrompt && (
                  <div className="mt-4 p-3 rounded-lg bg-gray-100 text-sm">
                    <p className="text-gray-900">
                      <span className="font-medium">Prompt:</span> {selectedPrompt.text}
                    </p>
                    {selectedPrompt.username && (
                      <p className="text-gray-500 text-xs mt-1">
                        by {selectedPrompt.username} • {selectedPrompt.votes} votes
                      </p>
                    )}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="empty-canvas"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center space-y-6 max-w-md"
              >
                {/* Canvas Area with Loading Animation */}
                <motion.div
                  animate={generateImageMutation.isPending ? {
                    scale: [1, 1.05, 1],
                    rotate: [0, 1, -1, 0],
                  } : {}}
                  transition={generateImageMutation.isPending ? {
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  } : {}}
                  className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-purple-500/10 to-pink-500/10 flex items-center justify-center relative"
                >
                  <motion.div
                    className={cn(
                      "p-4 rounded-full border-2 border-dashed transition-all duration-300",
                      generateImageMutation.isPending
                        ? "border-purple-400/50 bg-purple-500/10"
                        : "border-purple-300/30 bg-transparent"
                    )}
                    animate={generateImageMutation.isPending ? {
                      borderColor: ["rgba(168, 85, 247, 0.3)", "rgba(168, 85, 247, 0.8)", "rgba(168, 85, 247, 0.3)"]
                    } : {}}
                    transition={generateImageMutation.isPending ? {
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    } : {}}
                  >
                    <ImageIcon 
                      className={cn(
                        "h-12 w-12 transition-all duration-300",
                        generateImageMutation.isPending
                          ? "text-purple-500 animate-pulse"
                          : "text-gray-400"
                      )} 
                    />
                  </motion.div>
                  
                  {generateImageMutation.isPending && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute -bottom-8 text-sm font-medium text-purple-600"
                    >
                      <motion.span
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        Generating...
                      </motion.span>
                    </motion.div>
                  )}
                </motion.div>
                
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Ready to Create</h3>
                  <p className="text-gray-600">
                    Enter a prompt below to generate your AI image
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Prompt Input Bar */}
        <div className={cn(
          "relative",
          variant === 'print-flow' 
            ? "bg-slate-900/95 border-white/10" 
            : "bg-white/95 border-gray-200/50"
        )}>
          {/* Gradient background overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-black/5 to-transparent pointer-events-none" />
          
          <div className={cn(
            "relative backdrop-blur-xl border-t p-6",
            variant === 'print-flow' 
              ? "bg-slate-900/95 border-white/10" 
              : "bg-white/95 border-gray-200/50"
          )}>
            <div className="max-w-4xl mx-auto space-y-4">
              
              {/* Selected Prompt Indicator */}
              {selectedPrompt && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-2xl border shadow-sm",
                    variant === 'print-flow'
                      ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-400/30"
                      : "bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200/50"
                  )}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse" />
                    <Badge variant="secondary" className={cn(
                      "border-0 font-medium",
                      variant === 'print-flow'
                        ? "bg-gradient-to-r from-purple-400/30 to-pink-400/30 text-purple-200"
                        : "bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700"
                    )}>
                      Selected Prompt
                    </Badge>
                    <span className={cn(
                      "text-sm truncate font-medium",
                      variant === 'print-flow' ? "text-slate-300" : "text-gray-700"
                    )}>
                      {selectedPrompt.text}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedPrompt(null);
                      setPrompt("");
                    }}
                    className={cn(
                      "rounded-xl",
                      variant === 'print-flow'
                        ? "text-purple-300 hover:text-purple-200 hover:bg-purple-400/20"
                        : "text-purple-600 hover:text-purple-700 hover:bg-purple-100/50"
                    )}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </motion.div>
              )}

              {/* Main Input Row */}
              <div className="relative">
                {/* Subtle glow effect */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-purple-500/10 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                
                <div className={cn(
                  "relative flex items-center gap-2 px-4 py-3 rounded-2xl border transition-all duration-200 group",
                  variant === 'print-flow'
                    ? "bg-slate-800/60 backdrop-blur border-white/20 focus-within:border-purple-400/40 focus-within:bg-slate-800/80"
                    : "bg-white/90 backdrop-blur border-gray-200 focus-within:border-purple-300/50 focus-within:bg-white"
                )}>
                  
                  {/* Style Preset Indicators */}
                  {selectedPrompt && (
                    <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-purple-500/10 border border-purple-400/20">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                      <span className={cn(
                        "text-xs font-medium",
                        variant === 'print-flow' ? "text-purple-300" : "text-purple-600"
                      )}>
                        Community
                      </span>
                    </div>
                  )}

                  {/* Prompt Input */}
                  <div className="flex-1 relative">
                      <Textarea
                      ref={textareaRef}
                      placeholder="Describe the image you want to create..."
                        value={currentPromptText}
                        onChange={(e) => {
                          setPrompt(e.target.value);
                          if (selectedPrompt) setSelectedPrompt(null);
                        }}
                        className={cn(
                        "min-h-[40px] max-h-[120px] resize-none border-0 bg-transparent text-base focus:ring-0 focus:outline-none",
                        "py-1 px-0 leading-6 placeholder:text-sm",
                          variant === 'print-flow'
                            ? "text-white placeholder:text-slate-400"
                          : "text-gray-900 placeholder:text-gray-500"
                        )}
                        disabled={!!selectedPrompt}
                        rows={1}
                    />
                  </div>

                  {/* Inline Controls */}
                  <div className="flex items-center gap-1">
                    {/* Settings Menu */}
                    <div className="relative" ref={settingsRef}>
                          <Button
                            variant="ghost"
                            size="sm"
                        onClick={() => {
                          setShowSettings(!showSettings);
                          if (!showSettings) setShowStylePresets(false); // Close other menu
                        }}
                            className={cn(
                          "h-8 w-8 rounded-lg transition-all duration-200",
                              showSettings 
                            ? variant === 'print-flow'
                              ? "bg-purple-500/20 text-purple-300"
                              : "bg-purple-100 text-purple-600"
                                : variant === 'print-flow'
                                  ? "hover:bg-white/10 text-slate-400 hover:text-slate-300"
                                  : "hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                            )}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                      
                      {/* Minimalist Settings Panel */}
                      <AnimatePresence>
                        {showSettings && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ duration: 0.15 }}
                            className={cn(
                              "absolute right-0 bottom-12 z-50 rounded-lg border shadow-lg w-[240px]",
                              variant === 'print-flow'
                                ? "bg-slate-800/95 backdrop-blur border-white/10"
                                : "bg-white/95 backdrop-blur border-gray-200"
                            )}
                          >
                            <div className="p-3 space-y-3">
                              {/* Model */}
                              <div>
                                <div className={cn(
                                  "text-[10px] font-medium uppercase tracking-wider mb-1.5",
                                  variant === 'print-flow' ? "text-slate-400" : "text-gray-500"
                                )}>
                                  Model
                                </div>
                                <div className="grid grid-cols-3 gap-1">
                                  {[
                                    { value: "gpt-image-1", label: "GPT-1" },
                                    { value: "dall-e-3", label: "DALL-E 3" },
                                    { value: "dall-e-2", label: "DALL-E 2" }
                                  ].map((model) => (
                                    <button
                                      key={model.value}
                                      onClick={() => setSettings(prev => ({ ...prev, model: model.value as any }))}
                      className={cn(
                                        "px-2 py-1.5 text-[10px] font-medium rounded border transition-all duration-150",
                                        settings.model === model.value
                                          ? variant === 'print-flow'
                                            ? "bg-purple-500/30 border-purple-400/50 text-purple-200"
                                            : "bg-purple-100 border-purple-300 text-purple-700"
                                          : variant === 'print-flow'
                                            ? "border-white/10 hover:bg-slate-700/50 text-slate-300"
                                            : "border-gray-200 hover:bg-gray-50 text-gray-600"
                                      )}
                                    >
                                      {model.label}
                                    </button>
                                  ))}
                </div>
              </div>

                              {/* Size */}
                              <div>
                    <div className={cn(
                                  "text-[10px] font-medium uppercase tracking-wider mb-1.5",
                                  variant === 'print-flow' ? "text-slate-400" : "text-gray-500"
                                )}>
                                  Size
                      </div>
                                <div className="grid grid-cols-4 gap-1">
                                  {[
                                    { value: "1024x1024", label: "1:1" },
                                    { value: "1024x1536", label: "2:3" },
                                    { value: "1536x1024", label: "3:2" },
                                    { value: "auto", label: "Auto" }
                                  ].map((size) => (
                                    <button
                                      key={size.value}
                                      onClick={() => setSettings(prev => ({ ...prev, size: size.value as any }))}
                                      className={cn(
                                        "px-1.5 py-1.5 text-[10px] font-medium rounded border transition-all duration-150",
                                        settings.size === size.value
                                          ? variant === 'print-flow'
                                            ? "bg-purple-500/30 border-purple-400/50 text-purple-200"
                                            : "bg-purple-100 border-purple-300 text-purple-700"
                                          : variant === 'print-flow'
                                            ? "border-white/10 hover:bg-slate-700/50 text-slate-300"
                                            : "border-gray-200 hover:bg-gray-50 text-gray-600"
                                      )}
                                    >
                                      {size.label}
                                    </button>
                                  ))}
                                </div>
                        </div>

                              {/* Quality & Style */}
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <div className={cn(
                                    "text-[10px] font-medium uppercase tracking-wider mb-1.5",
                                    variant === 'print-flow' ? "text-slate-400" : "text-gray-500"
                                  )}>
                                    Quality
                        </div>
                                  <div className="space-y-1">
                                    {["standard", "hd"].map((quality) => (
                                      <button
                                        key={quality}
                                        onClick={() => setSettings(prev => ({ ...prev, quality: quality as any }))}
                                        className={cn(
                                          "w-full px-2 py-1 text-[10px] font-medium rounded border transition-all duration-150 capitalize",
                                          settings.quality === quality
                                            ? variant === 'print-flow'
                                              ? "bg-purple-500/30 border-purple-400/50 text-purple-200"
                                              : "bg-purple-100 border-purple-300 text-purple-700"
                                            : variant === 'print-flow'
                                              ? "border-white/10 hover:bg-slate-700/50 text-slate-300"
                                              : "border-gray-200 hover:bg-gray-50 text-gray-600"
                                        )}
                                      >
                                        {quality}
                                      </button>
                                    ))}
                                  </div>
                        </div>

                                <div>
                                  <div className={cn(
                                    "text-[10px] font-medium uppercase tracking-wider mb-1.5",
                                    variant === 'print-flow' ? "text-slate-400" : "text-gray-500"
                                  )}>
                                    Style
                                  </div>
                                  <div className="space-y-1">
                                    {["vivid", "natural"].map((style) => (
                                      <button
                                        key={style}
                                        onClick={() => setSettings(prev => ({ ...prev, style: style as any }))}
                                        className={cn(
                                          "w-full px-2 py-1 text-[10px] font-medium rounded border transition-all duration-150 capitalize",
                                          settings.style === style
                                            ? variant === 'print-flow'
                                              ? "bg-purple-500/30 border-purple-400/50 text-purple-200"
                                              : "bg-purple-100 border-purple-300 text-purple-700"
                                            : variant === 'print-flow'
                                              ? "border-white/10 hover:bg-slate-700/50 text-slate-300"
                                              : "border-gray-200 hover:bg-gray-50 text-gray-600"
                                        )}
                                      >
                                        {style}
                                      </button>
                                    ))}
                                  </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
                    </div>

                    {/* Style Presets Menu */}
                    <div className="relative" ref={stylePresetsRef}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowStylePresets(!showStylePresets);
                          if (!showStylePresets) setShowSettings(false); // Close other menu
                        }}
                        className={cn(
                          "h-8 w-8 rounded-lg transition-all duration-200",
                          showStylePresets 
                            ? variant === 'print-flow'
                              ? "bg-purple-500/20 text-purple-300"
                              : "bg-purple-100 text-purple-600"
                            : variant === 'print-flow'
                              ? "hover:bg-white/10 text-slate-400 hover:text-slate-300"
                              : "hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                        )}
                      >
                        <Palette className="h-4 w-4" />
                      </Button>
                      
                      {/* Compact Style Presets */}
              <AnimatePresence>
                {showStylePresets && (
                  <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ duration: 0.15 }}
                            className={cn(
                              "absolute right-0 bottom-12 z-50 rounded-lg border shadow-lg w-[220px] max-h-[280px] overflow-y-auto",
                              variant === 'print-flow'
                                ? "bg-slate-800/95 backdrop-blur border-white/10"
                                : "bg-white/95 backdrop-blur border-gray-200"
                            )}
                          >
                            <div className="p-2">
                    <div className={cn(
                                "text-[10px] font-medium uppercase tracking-wider mb-2 px-1",
                                variant === 'print-flow' ? "text-slate-400" : "text-gray-500"
                              )}>
                                Style Presets
                      </div>
                              
                              <div className="space-y-1">
                        {STYLE_PRESETS.map((preset) => (
                                  <button
                            key={preset.name}
                                    onClick={() => {
                                      setPrompt(preset.prompt);
                                      setSelectedPrompt(null);
                                      setShowStylePresets(false);
                                    }}
                            className={cn(
                                      "w-full text-left p-2 rounded border transition-all duration-150 hover:shadow-sm",
                              variant === 'print-flow'
                                        ? "border-white/10 hover:bg-slate-700/50 hover:border-purple-400/30"
                                        : "border-gray-200 hover:bg-gray-50 hover:border-purple-300"
                            )}
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className="text-sm">{preset.icon}</div>
                                      <div className="flex-1 min-w-0">
                                        <div className={cn(
                                          "font-medium text-xs",
                                          variant === 'print-flow' ? "text-white" : "text-gray-900"
                                        )}>
                                          {preset.name}
                                        </div>
                                        <div className={cn(
                                          "text-[10px] mt-0.5 line-clamp-1",
                                          variant === 'print-flow' ? "text-slate-400" : "text-gray-500"
                                        )}>
                                          {preset.prompt.split(',')[0]}...
                                        </div>
                                      </div>
                                    </div>
                                  </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

                    {/* Generate Button */}
                    <Button
                      onClick={handleGenerate}
                      disabled={!canGenerate || generateImageMutation.isPending}
                      className={cn(
                        "h-8 px-4 rounded-lg font-medium text-sm transition-all duration-200 ml-1",
                        "bg-gradient-to-r from-purple-500 to-pink-500",
                        "hover:from-purple-600 hover:to-pink-600",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        "text-white shadow-sm hover:shadow-md"
                      )}
                    >
                      <Sparkles className="h-3 w-3 mr-2" />
                      <span>Generate</span>
                    </Button>
                  </div>
                  
                  {/* Clear selected prompt button */}
                  {selectedPrompt && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedPrompt(null);
                        setPrompt("");
                      }}
                      className={cn(
                        "h-6 w-6 rounded-md -ml-1",
                        variant === 'print-flow'
                          ? "text-purple-300 hover:text-purple-200 hover:bg-purple-400/20"
                          : "text-purple-600 hover:text-purple-700 hover:bg-purple-100/50"
                      )}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Side Panel Toggle Button */}
      <Button
        variant="secondary"
        size="sm"
        className={cn(
          "fixed top-20 right-4 z-50 shadow-lg backdrop-blur-sm",
          variant === 'print-flow'
            ? "bg-slate-800/90 border-white/20 text-slate-300 hover:text-white hover:bg-slate-700/90"
            : "bg-white/90 border-gray-200 text-gray-700 hover:text-gray-900 hover:bg-white"
        )}
        onClick={handlePanelToggle}
      >
        {showPanel ? <X className="h-4 w-4" /> : <Users className="h-4 w-4" />}
        <span className="ml-2 text-sm">
          {showPanel ? 'Close' : `Prompts (${promptList.length})`}
        </span>
      </Button>

      {/* Side Panel */}
      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className={cn(
              "fixed top-16 right-0 h-[calc(100vh-4rem)] w-96 border-l shadow-xl z-40 flex flex-col",
              variant === 'print-flow'
                ? "bg-slate-900/95 backdrop-blur-xl border-white/10"
                : "bg-white border-gray-200"
            )}
          >
            {/* Panel Header */}
            <div className={cn(
              "p-4 border-b",
              variant === 'print-flow' ? "border-white/10" : "border-gray-200"
            )}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={cn(
                    "text-lg font-semibold",
                    variant === 'print-flow' ? "text-white" : "text-gray-900"
                  )}>Community Prompts</h3>
                  <p className={cn(
                    "text-xs mt-1",
                    variant === 'print-flow' ? "text-slate-400" : "text-gray-500"
                  )}>From the most recent completed poll</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePanelToggle}
                  className={cn(
                    variant === 'print-flow'
                      ? "text-slate-400 hover:text-white hover:bg-white/10"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  )}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Tabs 
              value={activeTab}
              onValueChange={setActiveTab}
              className="h-full flex flex-col"
            >
              {/* Tab Header */}
              <div className={cn(
                "border-b",
                variant === 'print-flow' ? "border-white/10 bg-slate-800/50" : "border-gray-200 bg-gray-50"
              )}>
                <TabsList className={cn(
                  "w-full grid grid-cols-2",
                  variant === 'print-flow' ? "bg-transparent" : "bg-transparent"
                )}>
                  <TabsTrigger 
                    value="prompts" 
                    className={cn(
                      variant === 'print-flow'
                        ? "data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400"
                        : "data-[state=active]:bg-white text-gray-600"
                    )}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Prompts ({promptList.length})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="gallery"
                    className={cn(
                      variant === 'print-flow'
                        ? "data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400"
                        : "data-[state=active]:bg-white text-gray-600"
                    )}
                  >
                    <Grid3X3 className="h-4 w-4 mr-2" />
                    Gallery ({galleryItems.length})
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Prompts Tab */}
              <TabsContent value="prompts" className="flex-1 overflow-y-auto p-4 space-y-3 m-0">
                {promptsQuery.isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className={cn(
                      "h-6 w-6 animate-spin",
                      variant === 'print-flow' ? "text-slate-400" : "text-gray-400"
                    )} />
                  </div>
                ) : sortedPrompts.length > 0 ? (
                  sortedPrompts.map((promptItem) => (
                    <div
                      key={promptItem.id}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm",
                        selectedPrompt?.id === promptItem.id
                          ? variant === 'print-flow'
                            ? "border-purple-400/50 bg-purple-500/20"
                            : "border-purple-300 bg-purple-50"
                          : variant === 'print-flow'
                            ? "border-white/20 hover:border-white/30 hover:bg-white/5"
                            : "border-gray-200 hover:border-gray-300"
                      )}
                      onClick={() => handlePromptSelect(promptItem)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm line-clamp-3",
                            variant === 'print-flow' ? "text-slate-200" : "text-gray-900"
                          )}>
                            {promptItem.text}
                          </p>
                          {promptItem.username && (
                            <p className={cn(
                              "text-xs mt-2",
                              variant === 'print-flow' ? "text-slate-400" : "text-gray-500"
                            )}>
                              by {promptItem.username}
                            </p>
                          )}
                        </div>
                        <Badge variant="secondary" className={cn(
                          "flex items-center gap-1",
                          variant === 'print-flow'
                            ? "bg-slate-700/50 text-slate-300"
                            : "bg-gray-100 text-gray-700"
                        )}>
                          <Vote className="h-3 w-3" />
                          {promptItem.votes}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className={cn(
                      "text-sm",
                      variant === 'print-flow' ? "text-slate-400" : "text-gray-500"
                    )}>
                      {promptsQuery.data?.hasSession 
                        ? "No prompts found in the most recent poll"
                        : "No completed polls yet. Start a voting session to collect prompts!"}
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* Gallery Tab */}
              <TabsContent value="gallery" className="flex-1 overflow-y-auto p-4 m-0">
                {galleryQuery.isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className={cn(
                      "h-6 w-6 animate-spin",
                      variant === 'print-flow' ? "text-slate-400" : "text-gray-400"
                    )} />
                  </div>
                ) : galleryItems.length > 0 ? (
                  <div className="space-y-4">
                    {galleryItems.map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          "relative rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg group border",
                          variant === 'print-flow'
                            ? "border-white/10 hover:border-purple-400/50 bg-slate-800/30"
                            : "border-gray-200 hover:border-purple-300 bg-white"
                        )}
                        onClick={() => setSelectedGalleryImage(item)}
                      >
                        {/* Image Container */}
                        <div className="relative aspect-square">
                          {item.imageUrl ? (
                            <Image
                              src={item.imageUrl}
                              alt={item.text}
                              fill
                              className="object-cover transition-transform duration-200 group-hover:scale-105"
                            />
                          ) : (
                            <div className={cn(
                              "w-full h-full flex items-center justify-center",
                              variant === 'print-flow' ? "bg-slate-700/50" : "bg-gray-100"
                            )}>
                              <ImageIcon className={cn(
                                "h-12 w-12",
                                variant === 'print-flow' ? "text-slate-500" : "text-gray-400"
                              )} />
                            </div>
                          )}
                          
                          {/* Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                          
                          {/* Hover Actions */}
                          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-8 w-8 p-0 bg-white/90 hover:bg-white text-gray-700 shadow-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPrompt(item.text);
                                  setSelectedPrompt(null);
                                  setShowPanel(false);
                                }}
                              >
                                <Wand2 className="h-4 w-4" />
                              </Button>
                              {item.imageUrl && (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      className="h-8 w-8 p-0 bg-white/90 hover:bg-white text-gray-700 shadow-sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                      }}
                                    >
                                      <Printer className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col">
                                    <DialogHeader className="flex-shrink-0">
                                      <DialogTitle>Print Settings</DialogTitle>
                                      <DialogDescription>
                                        Configure print settings for: {item.text.slice(0, 50)}...
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="flex-1 overflow-y-auto">
                                      <PrintSettingsPanel 
                                        imageUrl={item.imageUrl}
                                        onPrintStart={() => {}}
                                        onPrintComplete={(result) => {
                                          console.log("Print completed:", result);
                                        }}
                                        onPrintError={(error) => {
                                          console.error("Print error:", error);
                                        }}
                                        className="border-0 shadow-none bg-transparent"
                                      />
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Content */}
                        <div className="p-4">
                          <p className={cn(
                            "text-sm font-medium line-clamp-2 mb-2",
                            variant === 'print-flow' ? "text-slate-200" : "text-gray-900"
                          )}>
                            {item.text}
                          </p>
                          
                          <div className="flex items-center justify-between">
                            {item.username ? (
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold",
                                  variant === 'print-flow'
                                    ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white"
                                    : "bg-gradient-to-br from-purple-500 to-pink-500 text-white"
                                )}>
                                  {item.username.charAt(0).toUpperCase()}
                                </div>
                                <span className={cn(
                                  "text-xs font-medium",
                                  variant === 'print-flow' ? "text-slate-400" : "text-gray-600"
                                )}>
                                  {item.username}
                                </span>
                              </div>
                            ) : (
                              <span className={cn(
                                "text-xs",
                                variant === 'print-flow' ? "text-slate-500" : "text-gray-500"
                              )}>
                                Anonymous
                              </span>
                            )}
                            
                            <span className={cn(
                              "text-xs",
                              variant === 'print-flow' ? "text-slate-500" : "text-gray-500"
                            )}>
                              {new Date(item.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className={cn(
                      "w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4",
                      variant === 'print-flow'
                        ? "bg-gradient-to-br from-purple-500/20 to-pink-500/20"
                        : "bg-gradient-to-br from-purple-500/20 to-pink-500/20"
                    )}>
                      <ImageIcon className={cn(
                        "h-10 w-10",
                        variant === 'print-flow' ? "text-purple-400" : "text-purple-500"
                      )} />
                    </div>
                    <h4 className={cn(
                      "text-lg font-semibold mb-2",
                      variant === 'print-flow' ? "text-slate-300" : "text-gray-700"
                    )}>
                      No Images Yet
                    </h4>
                    <p className={cn(
                      "text-sm",
                      variant === 'print-flow' ? "text-slate-400" : "text-gray-500"
                    )}>
                      Generated images will appear here
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gallery Image Modal */}
      <AnimatePresence>
        {selectedGalleryImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedGalleryImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Gallery Image</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedGalleryImage(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                {selectedGalleryImage.imageUrl && (
                  <div className="relative aspect-square mb-4 rounded-lg overflow-hidden max-w-2xl mx-auto">
                    <Image
                      src={selectedGalleryImage.imageUrl}
                      alt={selectedGalleryImage.text}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Prompt:</p>
                    <p className="text-gray-900 font-medium">{selectedGalleryImage.text}</p>
                  </div>
                  {selectedGalleryImage.username && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Created by:</p>
                      <p className="text-gray-900">{selectedGalleryImage.username}</p>
                    </div>
                  )}
                </div>
                
                {selectedGalleryImage.imageUrl && (
                  <div className="flex gap-3 mt-6">
                    <Button
                      onClick={() => {
                        setPrompt(selectedGalleryImage.text);
                        setSelectedPrompt(null);
                        setSelectedGalleryImage(null);
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      Use This Prompt
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button className="flex-1 gap-2">
                          <Printer className="h-4 w-4" />
                          Print Image
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col">
                        <DialogHeader className="flex-shrink-0">
                          <DialogTitle>Print Settings</DialogTitle>
                          <DialogDescription>
                            Configure print settings for this image
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex-1 overflow-y-auto">
                          <PrintSettingsPanel 
                            imageUrl={selectedGalleryImage.imageUrl!}
                            onPrintStart={() => {}}
                            onPrintComplete={(result) => {
                              console.log("Print completed:", result);
                              setSelectedGalleryImage(null);
                            }}
                            onPrintError={(error) => {
                              console.error("Print error:", error);
                            }}
                            className="border-0 shadow-none bg-transparent"
                          />
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 