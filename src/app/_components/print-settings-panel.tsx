"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { api } from "@/trpc/react";
import { cn } from "@/lib/utils";

interface PrintSettingsPanelProps {
  imageUrl: string;
  onPrintStart?: () => void;
  onPrintComplete?: (result: any) => void;
  onPrintError?: (error: string) => void;
  className?: string;
}

interface MediaSettings {
  mediaTypes: Record<string, { displayName: string; CNIJMediaType: string; description: string }>;
  pageSizes: Record<string, { displayName: string; PageSize: string }>;
  qualitySettings: Record<string, { displayName: string; CNIJPrintQuality: string; description: string }>;
  paperSources: Record<string, { displayName: string; CNIJMediaSupply: string; description: string }>;
  profiles: Record<string, { displayName: string; options: Record<string, string> }>;
}

export default function PrintSettingsPanel({
  imageUrl,
  onPrintStart,
  onPrintComplete,
  onPrintError,
  className
}: PrintSettingsPanelProps) {
  const [selectedProfile, setSelectedProfile] = useState<string>("");
  const [customMediaType, setCustomMediaType] = useState<string>("");
  const [customPageSize, setCustomPageSize] = useState<string>("");
  const [customQuality, setCustomQuality] = useState<string>("");
  const [customPaperSource, setCustomPaperSource] = useState<string>("");
  const [useHighQuality, setUseHighQuality] = useState(true);
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);

  // Fetch media settings
  const { data: mediaSettings, isLoading: settingsLoading } = api.printer.getMediaSettings.useQuery();

  // Print mutations
  const printWithSettings = api.printer.printWithSettings.useMutation({
    onSuccess: (result) => {
      console.log("Print successful:", result);
      onPrintComplete?.(result);
    },
    onError: (error) => {
      console.error("Print failed:", error);
      onPrintError?.(error.message);
    }
  });

  const regularPrint = api.printer.print.useMutation({
    onSuccess: (result) => {
      console.log("Print successful:", result);
      onPrintComplete?.(result);
    },
    onError: (error) => {
      console.error("Print failed:", error);
      onPrintError?.(error.message);
    }
  });

  const handlePrint = () => {
    onPrintStart?.();

    if (selectedProfile || isAdvancedMode) {
      // Build custom settings
      const customSettings: Record<string, string> = {};
      
      if (isAdvancedMode) {
        if (customMediaType && mediaSettings?.mediaTypes[customMediaType]) {
          customSettings.CNIJMediaType = mediaSettings.mediaTypes[customMediaType].CNIJMediaType;
        }
        if (customPageSize && mediaSettings?.pageSizes[customPageSize]) {
          customSettings.PageSize = mediaSettings.pageSizes[customPageSize].PageSize;
        }
        if (customQuality && mediaSettings?.qualitySettings[customQuality]) {
          customSettings.CNIJPrintQuality = mediaSettings.qualitySettings[customQuality].CNIJPrintQuality;
        }
        if (customPaperSource && mediaSettings?.paperSources[customPaperSource]) {
          customSettings.CNIJMediaSupply = mediaSettings.paperSources[customPaperSource].CNIJMediaSupply;
        }
      }

      printWithSettings.mutate({
        imageUrl,
        useHighQuality,
        profile: selectedProfile || undefined,
        customSettings
      });
    } else {
      // Use regular print
      regularPrint.mutate({
        imageUrl,
        useHighQuality
      });
    }
  };

  const isLoading = printWithSettings.isPending || regularPrint.isPending;

  if (settingsLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Print Settings</CardTitle>
          <CardDescription>Loading available settings...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Print Settings</CardTitle>
        <CardDescription>
          Configure your Canon PRO-1000 print settings for optimal results
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quality Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium">File Quality</h4>
            <p className="text-xs text-muted-foreground">
              Use TIFF for maximum quality or JPEG for faster printing
            </p>
          </div>
          <Button
            variant={useHighQuality ? "default" : "outline"}
            size="sm"
            onClick={() => setUseHighQuality(!useHighQuality)}
          >
            {useHighQuality ? "TIFF (High)" : "JPEG (Fast)"}
          </Button>
        </div>

        <Separator />

        {/* Profile Selection */}
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-medium">Print Profiles</h4>
            <p className="text-xs text-muted-foreground">
              Pre-configured settings for common use cases
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={!selectedProfile && !isAdvancedMode ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setSelectedProfile("");
                setIsAdvancedMode(false);
              }}
              className="text-xs"
            >
              Default
            </Button>
            {mediaSettings?.profiles && Object.entries(mediaSettings.profiles).map(([key, profile]) => (
              <Button
                key={key}
                variant={selectedProfile === key ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setSelectedProfile(key);
                  setIsAdvancedMode(false);
                }}
                className="text-xs"
              >
                {(profile as { displayName: string }).displayName}
              </Button>
            ))}
            <Button
              variant={isAdvancedMode ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setIsAdvancedMode(true);
                setSelectedProfile("");
              }}
              className="text-xs"
            >
              Custom
            </Button>
          </div>

          {/* Show selected profile details */}
          {selectedProfile && mediaSettings?.profiles[selectedProfile] && (
            <div className="p-3 bg-muted rounded-md">
              <h5 className="text-xs font-medium mb-2">
                {(mediaSettings.profiles[selectedProfile] as { displayName: string }).displayName}
              </h5>
              <div className="flex flex-wrap gap-1">
                {Object.entries((mediaSettings.profiles[selectedProfile] as { options: Record<string, string> }).options).map(([key, value]) => (
                  <Badge key={key} variant="secondary" className="text-xs">
                    {key}: {value}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Advanced Settings */}
        {isAdvancedMode && (
          <>
            <Separator />
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Advanced Settings</h4>
              
              {/* Media Type */}
              <div className="space-y-2">
                <label className="text-xs font-medium">Media Type</label>
                <Select value={customMediaType} onValueChange={setCustomMediaType}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select media type" />
                  </SelectTrigger>
                  <SelectContent>
                    {mediaSettings?.mediaTypes && Object.entries(mediaSettings.mediaTypes).map(([key, media]) => (
                      <SelectItem key={key} value={key} className="text-xs">
                        <div>
                          <div>{(media as { displayName: string }).displayName}</div>
                          <div className="text-xs text-muted-foreground">{(media as { description: string }).description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Page Size */}
              <div className="space-y-2">
                <label className="text-xs font-medium">Page Size</label>
                <Select value={customPageSize} onValueChange={setCustomPageSize}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select page size" />
                  </SelectTrigger>
                  <SelectContent>
                    {mediaSettings?.pageSizes && Object.entries(mediaSettings.pageSizes).map(([key, size]) => (
                      <SelectItem key={key} value={key} className="text-xs">
                        {(size as { displayName: string }).displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Print Quality */}
              <div className="space-y-2">
                <label className="text-xs font-medium">Print Quality</label>
                <Select value={customQuality} onValueChange={setCustomQuality}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select quality" />
                  </SelectTrigger>
                  <SelectContent>
                    {mediaSettings?.qualitySettings && Object.entries(mediaSettings.qualitySettings).map(([key, quality]) => (
                      <SelectItem key={key} value={key} className="text-xs">
                        <div>
                          <div>{(quality as { displayName: string }).displayName}</div>
                          <div className="text-xs text-muted-foreground">{(quality as { description: string }).description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Paper Source */}
              <div className="space-y-2">
                <label className="text-xs font-medium">Paper Source</label>
                <Select value={customPaperSource} onValueChange={setCustomPaperSource}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select paper source" />
                  </SelectTrigger>
                  <SelectContent>
                    {mediaSettings?.paperSources && Object.entries(mediaSettings.paperSources).map(([key, source]) => (
                      <SelectItem key={key} value={key} className="text-xs">
                        <div>
                          <div>{(source as { displayName: string }).displayName}</div>
                          <div className="text-xs text-muted-foreground">{(source as { description: string }).description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        )}

        <Separator />

        {/* Print Button */}
        <Button 
          onClick={handlePrint} 
          disabled={isLoading || !imageUrl}
          className="w-full"
          size="lg"
        >
          {isLoading ? "Printing..." : "Print Image"}
        </Button>

        {/* Status/Error Display */}
        {(printWithSettings.error || regularPrint.error) && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-xs text-destructive">
              {printWithSettings.error?.message || regularPrint.error?.message}
            </p>
          </div>
        )}

        {(printWithSettings.data || regularPrint.data) && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-xs text-green-800">
              Print job submitted successfully!
              {printWithSettings.data?.jobId && ` Job ID: ${printWithSettings.data.jobId}`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 