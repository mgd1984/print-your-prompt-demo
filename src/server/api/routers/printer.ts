import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { printFile, getPrinterNames } from "node-cups";
import path from "path";
import fs from "fs";
import { env } from "@/env";

/**
 * PRINTER ROUTER - Canon PRO-1000 with CIS (Continuous Ink System) Support
 * 
 * This router handles printing to a Canon PRO-1000 printer equipped with a Continuous Ink System (CIS)
 * and precision color sensors. The configuration prioritizes USB connection for maximum reliability.
 * 
 * KEY FEATURES:
 * - USB Connection Priority: Direct USB bypasses network-related sensor communication issues
 * - CIS-Specific Options: Disables ink warnings and cartridge detection for modified ink tanks
 * - Error Recovery: Multi-level fallback system for stuck print jobs
 * - Force Print Mode: Minimal options mode that bypasses sensor dependencies
 * - Automatic Job Monitoring: Detects and clears stuck jobs with 5-second monitoring
 * 
 * PRINTER PRIORITY ORDER:
 * 1. Canon_PRO_1000_USB (Direct USB - most reliable for CIS)
 * 2. _192_168_2_240 (Auto-discovered IP - bypasses Canon driver issues)
 * 3. Canon_PRO_1000_Ethernet (Ethernet with Canon driver)
 * 4. Canon_PRO_1000_series (Original network printer)
 * 5. Canon_PRO_1000_series_2/3 (USB/IPP backups)
 * 
 * CIS WORKAROUNDS:
 * - CNIJInkWarning: "0" - Disables ink level warnings for modified tanks
 * - CNIJInkCartridgeSettings: "0" - Bypasses cartridge detection sensors
 * - PageSize: "13x19" - Uses valid large format size (not A3plus which causes issues)
 * - ColorModel: "RGB" - Standard RGB (not RGB16 which triggers sensor checks)
 * 
 * TROUBLESHOOTING:
 * If "printer in use" errors occur, the system automatically:
 * 1. Clears stuck jobs before printing
 * 2. Applies force completion commands
 * 3. Monitors jobs for 5 seconds and retries with minimal options if stuck
 * 4. Falls back to alternative printer connections
 * 5. Uses emergency force print mode as last resort
 */

// Create a function to determine if we're in local development or production (Vercel)
const isLocalEnvironment = () => {
  return process.env.NODE_ENV === 'development' || !process.env.VERCEL;
};

// Get the print server URL from environment or use default
const PRINT_SERVER_URL = process.env.PRINT_SERVER_URL || 'http://localhost:3001';

// Utility function to clear stuck jobs from a printer
function clearStuckJobs(printerName: string): Promise<void> {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    
    // First, check for stuck jobs
    exec(`lpq -P ${printerName}`, (error: any, stdout: string) => {
      if (error) {
        console.log(`Could not check queue for ${printerName}:`, error.message);
        resolve();
        return;
      }
      
      // If there are active jobs, they might be stuck
      if (stdout.includes('active') && !stdout.includes('no entries')) {
        console.log(`Found active jobs on ${printerName}, checking if stuck...`);
        
        // Cancel all jobs on this printer to clear any stuck ones
        exec(`cancel -a ${printerName}`, (cancelError: any) => {
          if (cancelError) {
            console.error(`Error canceling jobs on ${printerName}:`, cancelError.message);
          } else {
            console.log(`✅ Cleared all jobs on ${printerName} to prevent stuck job issues`);
          }
          resolve();
        });
      } else {
        console.log(`Queue for ${printerName} is clear`);
        resolve();
      }
    });
  });
}

// Utility function to force stuck jobs through the printer
async function forceJobCompletion(printerName: string, jobId: string): Promise<void> {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    
    // Try multiple approaches to force the job through
    const commands = [
      `lp -d ${printerName} -o job-hold-until=no-hold`,  // Release any holds
      `cupsenable ${printerName}`,                        // Ensure printer is enabled
      `cupsaccept ${printerName}`,                        // Ensure accepting jobs
      `lpadmin -p ${printerName} -o printer-error-policy=retry-job`, // Retry on errors
    ];
    
    let completed = 0;
    commands.forEach(cmd => {
      exec(cmd, (error: any) => {
        if (error) console.log(`Command "${cmd}" result:`, error.message);
        completed++;
        if (completed === commands.length) {
          console.log(`✅ Applied force completion commands for ${printerName}`);
          resolve();
        }
      });
    });
  });
}

// Robust printer selection function that prioritizes Canon Pro 1000
function findBestPrinter(availablePrinters: string[]): string {
  if (availablePrinters.length === 0) {
    throw new Error("No printers found");
  }
  
  // Prioritized printer names to look for (in order)
  // USB connection is most reliable for CIS systems with precision sensors
  const priorityPrinters = [
    "Canon_PRO_1000_USB",          // Direct USB connection - most reliable for CIS
    "_192_168_2_240",               // Auto-discovered IP printer - might bypass Canon driver
    "Canon_PRO_1000_Ethernet",     // Ethernet connection with Canon driver
    "Canon_PRO_1000_series",       // Original network printer (user preference)
    "Canon_PRO_1000_series_2",     // USB/IPP backup
    "Canon_PRO_1000_series_3",     // Direct USB backup
    "Gertie",
    "Canon_PRO_1000_series_4",
    // Partial name matching (lowercase for case-insensitive comparison)
    "canon_pro_1000",
    "pro-1000",
    "canon"
  ];
  
  // Try to find prioritized printers first (exact match)
  for (const printerName of priorityPrinters) {
    const match = availablePrinters.find(printer => printer === printerName);
    if (match) {
      console.log(`Found exact printer match: ${match}`);
      return match;
    }
  }
  
  // Try partial matches
  for (const printerName of priorityPrinters) {
    const match = availablePrinters.find(printer => 
      printer.toLowerCase().includes(printerName.toLowerCase())
    );
    if (match) {
      console.log(`Found partial printer match: ${match}`);
      return match;
    }
  }
  
  // Fall back to first available printer
  console.log(`No priority printer found. Using first available: ${availablePrinters[0]}`);
  return availablePrinters[0] || '';
}

// Canon Pro 1000 printer options - using valid settings that the printer supports
// Added ink override options for modified ink tanks with precision sensors
const canonProOptions = {
  "PageSize": "13x19",           // Large format that Canon PRO-1000 supports
  "MediaType": "photographic",   // High-quality photo paper
  "ColorModel": "RGB",           // Standard RGB (not RGB16)
  "cupsPrintQuality": "High",    // High quality printing
  "InputSlot": "by-pass-tray",   // Use bypass tray for photo paper
  "CNIJInkWarning": "0",         // Disable ink warnings (for modified tanks)
  "CNIJInkCartridgeSettings": "0" // Override cartridge detection
};

// Minimal options for force print mode (bypasses most sensor checks)
const forcePrintOptions = {
  "PageSize": "Letter",          // Use standard size to avoid sensor conflicts
  "ColorModel": "RGB",           // Basic RGB only
  "cupsPrintQuality": "Normal",  // Lower quality to reduce sensor dependencies
  "CNIJInkWarning": "0",         // Force disable ink warnings
  "printer-error-policy": "retry-current-job"
};

export const printerRouter = createTRPCRouter({
  print: publicProcedure
    .input(z.object({ 
      imageUrl: z.string(),
      useHighQuality: z.boolean().optional().default(true)
    }))
    .mutation(async ({ input }) => {
      try {
        console.log("Print request received:", input);
        console.log("Environment:", process.env.NODE_ENV, "isLocalEnvironment:", isLocalEnvironment());
        
        // If running locally (development), use direct printing via node-cups
        if (isLocalEnvironment()) {
          // Handle different image URL types
          let imagePath: string = "";
          
          if (input.imageUrl.startsWith("data:image/")) {
            // Handle base64 data URLs (convert to temporary file)
            console.log("Processing base64 data URL...");
            const base64Data = input.imageUrl.split(',')[1];
            if (!base64Data) {
              throw new Error("Invalid base64 data URL");
            }
            
            const buffer = Buffer.from(base64Data, 'base64');
            const format = input.imageUrl.includes('data:image/png') ? 'png' : 'jpg';
            const timestamp = Date.now();
            const tempFilePath = path.join(process.cwd(), "public", "uploads", `temp-image-${timestamp}.${format}`);
            
            // Ensure uploads directory exists
            const uploadsDir = path.dirname(tempFilePath);
            if (!fs.existsSync(uploadsDir)) {
              fs.mkdirSync(uploadsDir, { recursive: true });
            }
            
            fs.writeFileSync(tempFilePath, buffer);
            input.imageUrl = `/uploads/temp-image-${timestamp}.${format}`;
            console.log("Converted base64 to temporary file:", input.imageUrl);
            
            // Clean up function to remove temp file after printing
            const cleanupTempFile = () => {
              try {
                if (fs.existsSync(tempFilePath)) {
                  fs.unlinkSync(tempFilePath);
                  console.log("Temporary file removed:", tempFilePath);
                }
              } catch (e) {
                console.error("Error removing temporary file:", e);
              }
            };
            
            // Schedule cleanup after 5 seconds
            setTimeout(cleanupTempFile, 5000);
            
            // Set imagePath for printing
            imagePath = tempFilePath;
          } else if (input.imageUrl.startsWith("https://")) {
            // Handle UploadThing URLs or other remote URLs (download to temporary file)
            console.log("Processing remote URL:", input.imageUrl);
            
            try {
              const response = await fetch(input.imageUrl);
              if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
              }
              
              const buffer = Buffer.from(await response.arrayBuffer());
              const timestamp = Date.now();
              const format = input.imageUrl.includes('.png') ? 'png' : 'jpg';
              const tempFilePath = path.join(process.cwd(), "public", "uploads", `temp-remote-${timestamp}.${format}`);
              
              // Ensure uploads directory exists
              const uploadsDir = path.dirname(tempFilePath);
              if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
              }
              
              fs.writeFileSync(tempFilePath, buffer);
              const originalImageUrl = input.imageUrl;
              input.imageUrl = `/uploads/temp-remote-${timestamp}.${format}`;
              console.log("Downloaded remote image to temporary file:", input.imageUrl);
              
              // Clean up function to remove temp file after printing
              const cleanupTempFile = () => {
                try {
                  if (fs.existsSync(tempFilePath)) {
                    fs.unlinkSync(tempFilePath);
                    console.log("Temporary file removed:", tempFilePath);
                  }
                } catch (e) {
                  console.error("Error removing temporary file:", e);
                }
              };
              
              // Schedule cleanup after 10 seconds (longer for remote files)
              setTimeout(cleanupTempFile, 10000);
              
              // Set imagePath for printing
              imagePath = tempFilePath;
            } catch (fetchError) {
              console.error("Error downloading remote image:", fetchError);
              throw new Error(`Failed to download image for printing: ${(fetchError as Error).message}`);
            }
          } else {
            // Handle local file paths (legacy support)
            
            // For local files, check if high-quality TIFF version exists
            if (input.useHighQuality && input.imageUrl.endsWith('.jpg')) {
              // Convert /uploads/image-1234567890.jpg to /uploads/image-1234567890.tiff
              const tiffPath = input.imageUrl.replace('.jpg', '.tiff');
              const absoluteTiffPath = path.join(process.cwd(), "public", tiffPath.startsWith('/') ? tiffPath.slice(1) : tiffPath);
              
              console.log("Looking for TIFF file at:", absoluteTiffPath);
              
              // Check if TIFF exists
              if (fs.existsSync(absoluteTiffPath)) {
                imagePath = absoluteTiffPath;
                console.log("Using high-quality TIFF file for printing:", imagePath);
              } else {
                console.log("TIFF file not found, falling back to JPEG");
              }
            }
            
            // Fallback to original image if TIFF not found
            if (!imagePath) {
              // Remove leading slash if present
              const relativePath = input.imageUrl.startsWith("/") 
                ? input.imageUrl.slice(1) 
                : input.imageUrl;
              
              // Construct the absolute path to the image
              imagePath = path.join(process.cwd(), "public", relativePath);
              console.log("Using original image file for printing:", imagePath);
              
              // Check if this file exists
              if (!fs.existsSync(imagePath)) {
                console.error("ERROR: Image file does not exist at path:", imagePath);
                throw new Error(`Image file not found: ${imagePath}`);
              }
            }
          }
          
          // Get available printers
          console.log("Getting available printers...");
          const printers = await getPrinterNames();
          console.log("Available printers:", printers);
          
          // Use our robust printer selection function
          const selectedPrinter = findBestPrinter(printers);
          console.log(`Selected printer: ${selectedPrinter}`);
          
          // Clear any stuck jobs before printing
          console.log(`Checking for stuck jobs on ${selectedPrinter}...`);
          await clearStuckJobs(selectedPrinter);
          
          // Connection options - support both network and direct USB
          const connectionOptions: any = {
            printer: selectedPrinter,
            printerOptions: canonProOptions
          };

          // Add authentication only if environment variables are present
          if (process.env.CUPS_USER && process.env.CUPS_PASSWORD) {
            connectionOptions.user = process.env.CUPS_USER;
            connectionOptions.password = process.env.CUPS_PASSWORD;
          }
          
          // For debugging, output the exact CLI command that would be used
          console.log("Final print options:", connectionOptions);
          
          // For debugging - log the actual command that would be executed
          const cupsArgs = Object.entries(canonProOptions)
            .map(([key, value]) => `-o ${key}=${value}`)
            .join(' ');
          console.log(`CUPS equivalent: lpr -P "${selectedPrinter}" ${cupsArgs} "${imagePath}"`);
          
          // Print the image with aggressive error handling for precision sensor issues
          try {
            const result = await printFile(imagePath, connectionOptions);
            console.log("Print job submitted successfully:", result);
            
            // For Canon printers with precision sensors, monitor and force completion
            if (selectedPrinter.includes("Canon") && result.requestId) {
              console.log("🔧 Applying Canon precision sensor workarounds...");
              
              // Apply force completion commands immediately
              await forceJobCompletion(selectedPrinter, result.requestId);
              
              // Monitor job for 5 seconds and force if stuck
              setTimeout(async () => {
                const { exec } = require('child_process');
                exec(`lpq -P ${selectedPrinter}`, (error: any, stdout: string) => {
                  if (stdout.includes('active') && result.requestId && stdout.includes(result.requestId)) {
                    console.log("🚨 Job still stuck, applying emergency force commands...");
                    
                    // Cancel stuck job and retry with minimal options
                    exec(`cancel ${result.requestId}`, () => {
                      console.log("🔄 Retrying with force print mode (minimal options)...");
                      
                      // Retry with minimal options to bypass sensors
                      const forceOptions = {
                        printer: selectedPrinter,
                        printerOptions: forcePrintOptions
                      };
                      
                      printFile(imagePath, forceOptions).then((forceResult) => {
                        console.log("✅ Force print mode successful:", forceResult);
                      }).catch((forceError) => {
                        console.error("❌ Force print mode also failed:", forceError);
                        
                        // Last resort: try to print as plain text
                        exec(`echo "FORCE PRINT BYPASS" | lpr -P ${selectedPrinter}`, (err: any) => {
                          if (err) console.error("Last resort print failed:", err);
                          else console.log("🆘 Last resort print sent");
                        });
                      });
                    });
                  }
                });
              }, 5000); // Reduced from 10 to 5 seconds for faster response
            }
            
            return { 
              success: true, 
              printer: selectedPrinter,
              jobId: result.requestId,
              highQuality: imagePath.endsWith('.tiff'),
              workaroundApplied: selectedPrinter.includes("Canon")
            };
          } catch (printError) {
            console.error("Error in printFile:", printError);
            
            // If the selected printer failed, try to use a fallback printer
            if (selectedPrinter === "Canon_PRO_1000_series" || selectedPrinter === "Canon_PRO_1000_Ethernet") {
              console.log("Canon printer with precision sensors failed, trying alternative connections...");
              
              // Try different Canon printer connections in order of reliability
              const fallbackPrinters = [
                "Canon_PRO_1000_series_2",  // USB connection
                "_192_168_2_240",           // Auto-discovered IP printer
                "Canon_PRO_1000_series_3",  // Direct USB
              ].filter(p => printers.includes(p));
              
              for (const fallbackPrinter of fallbackPrinters) {
                console.log(`🔄 Attempting fallback to: ${fallbackPrinter}`);
                const fallbackOptions = {
                  printer: fallbackPrinter,
                  printerOptions: {
                    ...canonProOptions,
                    // Try with minimal options to avoid sensor conflicts
                    "CNIJInkWarning": "0",
                    "CNIJInkCartridgeSettings": "0",
                    "printer-error-policy": "retry-job"
                  }
                };
                
                try {
                  const fallbackResult = await printFile(imagePath, fallbackOptions);
                  console.log("✅ Fallback print job submitted successfully:", fallbackResult);
                  
                  // Apply workarounds to fallback printer too
                  if (fallbackResult.requestId) {
                    await forceJobCompletion(fallbackPrinter, fallbackResult.requestId);
                  }
                  
                  return { 
                    success: true, 
                    printer: fallbackPrinter,
                    jobId: fallbackResult.requestId,
                    highQuality: imagePath.endsWith('.tiff'),
                    usedFallback: true,
                    workaroundApplied: true,
                    originalPrinterFailed: selectedPrinter
                  };
                } catch (fallbackError) {
                  console.error(`Fallback printer ${fallbackPrinter} also failed:`, fallbackError);
                  continue; // Try next fallback
                }
              }
              
              console.error("All Canon printer fallbacks failed due to precision sensor issues");
            }
            
            throw printError;
          }
        } 
        // If running in production (Vercel), use the remote print server
        else {
          // Handle different image URL formats
          let imageData = input.imageUrl;
          
          // Check if this is a base64 data URL
          if (input.imageUrl.startsWith('data:image/')) {
            console.log("Data URL detected in Vercel environment");
            // We can send the data URL directly to the print server
            // The print server will handle converting it to an image
          }
          // Make relative URLs absolute if needed
          else if (input.imageUrl.startsWith('/')) {
            // If deploying to Vercel, use the VERCEL_URL environment variable
            const baseUrl = process.env.VERCEL_URL 
              ? `https://${process.env.VERCEL_URL}` 
              : process.env.NEXT_PUBLIC_BASE_URL || '';
            
            imageData = `${baseUrl}${input.imageUrl}`;
          }
          
          console.log("Using print server at:", PRINT_SERVER_URL);
          console.log("Sending image URL to print server:", 
            input.imageUrl.startsWith('data:image/') 
              ? "data:image/[base64-data]" // Don't log the full data URL
              : imageData
          );
          
          // Send the request to the print server
          const response = await fetch(`${PRINT_SERVER_URL}/print-url`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              // Add optional auth token if provided
              ...(process.env.PRINT_SERVER_TOKEN && {
                'Authorization': `Bearer ${process.env.PRINT_SERVER_TOKEN}`
              })
            },
            body: JSON.stringify({
              imageUrl: imageData,
              useHighQuality: input.useHighQuality
            })
          });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            console.error("Print server error:", response.status, errorData);
            throw new Error(errorData.error || `Print server error: ${response.status}`);
          }
          
          const result = await response.json();
          console.log("Print server response:", result);
          return result;
        }
      } catch (error) {
        console.error("Error printing image:", error);
        throw new Error(`Failed to print image: ${(error as Error).message}`);
      }
    }),
    
  getPrinters: publicProcedure
    .query(async () => {
      try {
        // If running locally, use direct access to printers
        if (isLocalEnvironment()) {
          const printers = await getPrinterNames();
          return { printers };
        } 
        // Otherwise, query the print server
        else {
          const response = await fetch(`${PRINT_SERVER_URL}/printers`, {
            headers: {
              // Add optional auth token if provided
              ...(process.env.PRINT_SERVER_TOKEN && {
                'Authorization': `Bearer ${process.env.PRINT_SERVER_TOKEN}`
              })
            }
          });
          
          if (!response.ok) {
            throw new Error(`Print server error: ${response.status}`);
          }
          
          return await response.json();
        }
      } catch (error) {
        console.error("Error getting printers:", error);
        throw new Error(`Failed to get printers: ${(error as Error).message}`);
      }
    }),
}); 