import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { printFile, getPrinterNames } from "node-cups";
import path from "path";
import fs from "fs";
import { env } from "@/env";

// Create a function to determine if we're in local development or production (Vercel)
const isLocalEnvironment = () => {
  return process.env.NODE_ENV === 'development' || !process.env.VERCEL;
};

// Get the print server URL from environment or use default
const PRINT_SERVER_URL = process.env.PRINT_SERVER_URL || 'http://localhost:3001';

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
          // Check if this is a base64 data URL
          if (input.imageUrl.startsWith('data:image/')) {
            console.log("Base64 image detected, converting to file for local printing");
            const tempDir = path.join(process.cwd(), "public", "uploads");
            
            // Ensure the directory exists
            if (!fs.existsSync(tempDir)) {
              fs.mkdirSync(tempDir, { recursive: true });
            }
            
            // Extract base64 data
            const matches = input.imageUrl.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
            if (!matches || matches.length !== 3) {
              throw new Error("Invalid base64 image format");
            }
            
            const format = matches[1] as string;
            const base64Data = matches[2] as string;
            const buffer = Buffer.from(base64Data, 'base64');
            
            // Create temporary file
            const timestamp = Date.now();
            const tempFilePath = path.join(tempDir, `temp-image-${timestamp}.${format}`);
            fs.writeFileSync(tempFilePath, buffer);
            
            // Use this temporary file for printing
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
          }
          
          // If this is a JPEG URL from the web UI, try to find the corresponding TIFF file
          let imagePath;
          
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
          
          // Get available printers
          console.log("Getting available printers...");
          const printers = await getPrinterNames();
          console.log("Available printers:", printers);
          
          if (printers.length === 0) {
            throw new Error("No printers found");
          }
          
          // First try to find the Series 2 printer specifically
          let selectedPrinter = printers.find(printer => 
            printer.includes("Canon_PRO_1000_series_2") || 
            printer.includes("PRO-1000 series 2")
          );
          
          // Fall back to any Canon printer if the preferred one isn't found
          if (!selectedPrinter) {
            selectedPrinter = printers.find(printer => 
              printer.toLowerCase().includes("canon") || 
              printer.toLowerCase().includes("pro-1000")
            );
          }
          
          // Use the first available printer as last resort
          if (!selectedPrinter) {
            selectedPrinter = printers[0];
          }
          
          console.log(`Using printer: ${selectedPrinter}`);
          
          // Canon Pro 1000 specific printer options
          const canonProOptions = {
            "PageSize": "A3+", // Use A3 (11.69" x 16.54") as it's very close to 11.7" x 16.5"
            "PageRegion": "A3+", // Ensure region also matches
            "InputSlot": "Top", // Use bypass tray for specialty paper
            "MediaType": "Photographic", // Epson presentation paper is better treated as photo paper
            "ColorModel": "RGB", // Standard RGB color mode
            "cupsPrintQuality": "High", // High quality
          };
          
          // Default printer options for other printers
          const defaultOptions = {
            "PageSize": "A3+",
            "print-quality": "high",
          };
          
          // Build CUPS-compatible options array
          const printerOptions = selectedPrinter && selectedPrinter.toLowerCase().includes("canon") 
            ? canonProOptions 
            : defaultOptions;
            
          // Connection options - support both network and direct USB
          const connectionOptions: any = {
            printer: selectedPrinter,
            printerOptions: printerOptions
          };

          // Add authentication only if environment variables are present
          if (process.env.CUPS_USER && process.env.CUPS_PASSWORD) {
            connectionOptions.user = process.env.CUPS_USER;
            connectionOptions.password = process.env.CUPS_PASSWORD;
          }
          
          // For debugging, output the exact CLI command that would be used
          console.log("Final print options:", connectionOptions);
          
          // For debugging - log the actual command that would be executed
          const cupsArgs = Object.entries(printerOptions)
            .map(([key, value]) => `-o ${key}=${value}`)
            .join(' ');
          console.log(`CUPS equivalent: lpr -P "${selectedPrinter}" ${cupsArgs} "${imagePath}"`);
          
          // Print the image
          try {
            const result = await printFile(imagePath, connectionOptions);
            console.log("Print job submitted successfully:", result);
            
            return { 
              success: true, 
              printer: selectedPrinter,
              jobId: result.requestId,
              highQuality: imagePath.endsWith('.tiff')
            };
          } catch (printError) {
            console.error("Error in printFile:", printError);
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