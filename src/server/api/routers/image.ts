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

// Function to save image as JPEG and TIFF (checks for Vercel environment)
async function saveImages(buffer: Buffer, basename: string): Promise<{ jpegUrl: string, tiffPath: string }> {
  const timestamp = Date.now();
  const jpegFilename = `${basename}-${timestamp}.jpg`;
  const tiffFilename = `${basename}-${timestamp}.tiff`;
  
  // Check if we're in Vercel production environment
  const isVercel = process.env.VERCEL === '1';
  
  if (!isVercel) {
    // Local development: Save to filesystem
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
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
    
    const jpegUrl = `/uploads/${jpegFilename}`;
    console.log("Generated image file path:", jpegUrl);
    
    return {
      jpegUrl,
      tiffPath: tiffPath
    };
  } else {
    // In Vercel: We will NOT convert to base64 anymore - too large for ngrok
    // Instead, we'll use image URLs directly from OpenAI
    console.log("Running in Vercel environment - not using base64 encoding");
    
    // Return empty strings as this function's result won't be used in Vercel
    // The actual OpenAI URL will be used directly
    return {
      jpegUrl: '',
      tiffPath: '' // Empty in Vercel environment
    };
  }
}

export const imageRouter = createTRPCRouter({
  generate: publicProcedure
    .input(z.object({ 
      prompt: z.string().min(1),
      model: z.enum(["gpt-image-1", "dall-e-3", "dall-e-2"]).default("gpt-image-1"),
      quality: z.enum(["standard", "hd"]).default("standard"),
      style: z.enum(["vivid", "natural"]).default("vivid"),
      size: z.enum(["1024x1024", "1024x1536", "1536x1024", "auto"]).default("1024x1024"),
    }))
    .mutation(async ({ input }) => {
      try {
        // Sanitize the prompt
        const safePrompt = sanitizePrompt(input.prompt);
        
        console.log(`Processing image generation for prompt: ${safePrompt}`);
        console.log(`Using model: ${input.model}, size: ${input.size}`);
        
        let response;
        let imageUrl;
        
        // Try gpt-image-1 first (latest model)
        if (input.model === "gpt-image-1") {
          try {
            console.log(`Calling OpenAI with GPT-Image-1, prompt: ${safePrompt.substring(0, 50)}...`);
            
            response = await openai.images.generate({
              model: "gpt-image-1",
              prompt: safePrompt,
              n: 1,
              size: input.size === "auto" ? "1024x1024" : input.size, // gpt-image-1 supports auto, but we'll default to 1024x1024
              // Note: gpt-image-1 doesn't support quality or style parameters
              // response_format defaults to b64_json for gpt-image-1
            });
            
            console.log("GPT-Image-1 API Response:", JSON.stringify(response, null, 2));
            
            if (response.data && response.data.length > 0) {
              const firstResult = response.data[0];
              
              if (typeof firstResult === 'object' && firstResult !== null) {
                const resultObj = firstResult as Record<string, any>;
                
                // gpt-image-1 returns b64_json format
                if (resultObj.b64_json) {
                  console.log("Found base64 image in response, converting to file...");
                  const buffer = Buffer.from(resultObj.b64_json, 'base64');
                  
                  // Check if we're in Vercel environment
                  const isVercel = process.env.VERCEL === '1';
                  
                  if (isVercel) {
                    // In Vercel: Create a data URL
                    console.log("Running in Vercel environment - creating data URL from base64");
                    const dataUrl = `data:image/png;base64,${resultObj.b64_json}`;
                    console.log("Created data URL for Vercel environment");
                    
                    return {
                      imageUrl: dataUrl,
                      filePath: '' // No file path in Vercel
                    };
                  } else {
                    // Save as JPEG and TIFF in local environment
                    const { jpegUrl, tiffPath } = await saveImages(buffer, "image");
                    console.log("Base64 image saved:", jpegUrl);
                    
                    return {
                      imageUrl: jpegUrl,
                      filePath: tiffPath, // Return TIFF path for high-quality printing
                    };
                  }
                }
              }
            }
          } catch (err) {
            console.error("Error with gpt-image-1:", err);
            console.log("Falling back to DALL-E 3...");
          }
        }
        
        // Use DALL-E 3 or DALL-E 2 (fallback or direct selection)
        if (input.model === "dall-e-3" || !imageUrl) {
          console.log(`Calling OpenAI with DALL-E 3, prompt: ${safePrompt.substring(0, 50)}...`);
          
          response = await openai.images.generate({
            model: "dall-e-3",
            prompt: safePrompt,
            n: 1,
            size: "1024x1024", // DALL-E 3 supports 1024x1024, 1024x1792, 1792x1024
            quality: input.quality,
            style: input.style,
            response_format: "url",
          });
        } else if (input.model === "dall-e-2") {
          console.log(`Calling OpenAI with DALL-E 2, prompt: ${safePrompt.substring(0, 50)}...`);
          
          response = await openai.images.generate({
            model: "dall-e-2",
            prompt: safePrompt,
            n: 1,
            size: "1024x1024",
            response_format: "url",
          });
        }
        
        // Only process response if it exists and we don't already have an imageUrl from gpt-image-1
        if (response && !imageUrl) {
          console.log("OpenAI API Response:", JSON.stringify(response, null, 2));
          
          if (response.data && response.data.length > 0) {
            imageUrl = response.data[0]?.url;
            console.log(`${input.model} image URL:`, imageUrl);
          }
        }
        
        if (!imageUrl) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to generate image: No URL returned from ${input.model}`,
          });
        }

        console.log("Successfully obtained image URL:", imageUrl);

        // Fetch the image and save it locally (for DALL-E models that return URLs)
        try {
          const imageResponse = await fetch(imageUrl);
          
          if (!imageResponse.ok) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: `Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`,
            });
          }
          
          // Check if we're in Vercel environment
          const isVercel = process.env.VERCEL === '1';
          
          if (isVercel) {
            // In Vercel: Use the OpenAI URL directly to avoid payload size issues
            console.log("Using OpenAI image URL directly in Vercel environment");
            return {
              imageUrl: imageUrl, // Use the OpenAI URL directly
              filePath: ''        // No local file path in Vercel
            };
          } else {
            // Local development: Save to filesystem as before
            const buffer = Buffer.from(await imageResponse.arrayBuffer());
            
            // Save as JPEG and TIFF formats
            const { jpegUrl, tiffPath } = await saveImages(buffer, "image");
            console.log("Image saved locally as JPEG and TIFF:", jpegUrl);
            
            return {
              imageUrl: jpegUrl,
              filePath: tiffPath, // Return TIFF path for high-quality printing
            };
          }
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