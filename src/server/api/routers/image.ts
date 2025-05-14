import { z } from "zod";
import { OpenAI } from "openai";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { env } from "@/env";
import fs from "fs";
import path from "path";
import { TRPCError } from "@trpc/server";
import sharp from "sharp";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY, 
});

// Basic prompt sanitization function
function sanitizePrompt(prompt: string): string {
  // Remove any explicit terms that might trigger content filters
  const sanitized = prompt
    .replace(/\b(nsfw|nude|naked|sex|porn|xxx|boob|breast|explicit)\b/gi, '***');
  
  // Add a safety prefix
  return `Create a safe, appropriate image of: ${sanitized}`;
}

// Function to save image as JPEG and TIFF
async function saveImages(buffer: Buffer, basename: string): Promise<{ jpegUrl: string, tiffPath: string }> {
  // Create directory if it doesn't exist
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  // Generate filenames with timestamp
  const timestamp = Date.now();
  const jpegFilename = `${basename}-${timestamp}.jpg`;
  const tiffFilename = `${basename}-${timestamp}.tiff`;
  const jpegPath = path.join(uploadDir, jpegFilename);
  const tiffPath = path.join(uploadDir, tiffFilename);
  
  // Convert to high-quality JPEG for web display
  await sharp(buffer)
    .jpeg({ quality: 90, mozjpeg: true })
    .toFile(jpegPath);
  
  // Convert to TIFF for high-quality printing
  await sharp(buffer)
    .tiff({
      quality: 100,
      compression: 'lzw',
      predictor: 'horizontal'
    })
    .toFile(tiffPath);
  
  // Return the JPEG URL for web display and TIFF path for printing
  const jpegUrl = `/uploads/${jpegFilename}`;
  console.log("Generated image file path:", jpegUrl);
  
  return {
    jpegUrl,
    tiffPath: tiffPath
  };
}

export const imageRouter = createTRPCRouter({
  generate: publicProcedure
    .input(z.object({ prompt: z.string().min(1) }))
    .mutation(async ({ input }) => {
      try {
        // Sanitize the prompt
        const safePrompt = sanitizePrompt(input.prompt);
        
        console.log(`Processing image generation for prompt: ${safePrompt}`);
        
        let response;
        let imageUrl;
        
        // Try with gpt-image-1 first
        try {
          console.log(`Calling OpenAI with model: gpt-image-1, prompt: ${safePrompt.substring(0, 50)}...`);
          
          response = await openai.images.generate({
            model: "gpt-image-1",
            prompt: safePrompt,
            n: 1,
            size: "1024x1536",
            quality: "auto",
          });
          
          console.log("OpenAI API Response:", JSON.stringify(response, null, 2));
          
          if (response.data && response.data.length > 0) {
            const firstResult = response.data[0];
            
            if (typeof firstResult === 'object' && firstResult !== null) {
              // Using type assertion to access potential properties safely
              const resultObj = firstResult as Record<string, any>;
              
              // Check for URL format
              if (resultObj.url) {
                imageUrl = resultObj.url;
                console.log("Found URL in response:", imageUrl);
              } 
              // Check for b64_json format
              else if (resultObj.b64_json) {
                console.log("Found base64 image in response, converting to file...");
                // Create image from base64 data directly
                try {
                  const buffer = Buffer.from(resultObj.b64_json, 'base64');
                  
                  // Save as JPEG and TIFF
                  const { jpegUrl, tiffPath } = await saveImages(buffer, "image");
                  console.log("Base64 image saved locally:", jpegUrl);
                  
                  return {
                    imageUrl: jpegUrl,
                    filePath: tiffPath, // Return TIFF path for high-quality printing
                  };
                } catch (b64Error) {
                  console.error("Error processing base64 image:", b64Error);
                }
              }
            }
          }
        } catch (err) {
          console.error("Error with gpt-image-1:", err);
        }
        
        // Fallback to dall-e-3 if gpt-image-1 fails
        if (!imageUrl) {
          console.log("Falling back to dall-e-3 model...");
          
          response = await openai.images.generate({
            model: "dall-e-3",
            prompt: safePrompt,
            n: 1,
            size: "1024x1536",
            response_format: "url",
          });
          
          console.log("dall-e-3 Response:", JSON.stringify(response, null, 2));
          
          if (response.data && response.data.length > 0) {
            imageUrl = response.data[0]?.url;
            console.log("dall-e-3 image URL:", imageUrl);
          }
        }
        
        if (!imageUrl) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to generate image: No URL returned from either model",
          });
        }

        console.log("Successfully obtained image URL:", imageUrl);

        // Fetch the image and save it locally
        try {
          const imageResponse = await fetch(imageUrl);
          
          if (!imageResponse.ok) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: `Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`,
            });
          }
          
          const buffer = Buffer.from(await imageResponse.arrayBuffer());
          
          // Save as JPEG and TIFF formats
          const { jpegUrl, tiffPath } = await saveImages(buffer, "image");
          console.log("Image saved locally as JPEG and TIFF:", jpegUrl);
          
          return {
            imageUrl: jpegUrl,
            filePath: tiffPath, // Return TIFF path for high-quality printing
          };
        } catch (fetchError) {
          console.error("Error fetching or saving image:", fetchError);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Error saving image: ${(fetchError as Error).message}`,
          });
        }
      } catch (error) {
        console.error("Error generating image:", error);
        
        // Handle different error types
        if (error instanceof TRPCError) {
          throw error;
        }
        
        // Check for OpenAI safety system rejections
        const errorMessage = (error as Error).message || "";
        if (errorMessage.includes("safety system") || errorMessage.includes("moderation")) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Your prompt was rejected by our safety system. Please try a different prompt.",
          });
        }
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to generate image: ${(error as Error).message}`,
        });
      }
    }),
}); 