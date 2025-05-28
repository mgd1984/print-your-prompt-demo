import { z } from "zod";
import { OpenAI } from "openai";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { env } from "@/env";
import { TRPCError } from "@trpc/server";
import { UTApi } from "uploadthing/server";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY, 
});

// Initialize UploadThing API
const utapi = new UTApi({
  token: env.UPLOADTHING_TOKEN,
});

// Basic prompt sanitization function
function sanitizePrompt(prompt: string): string {
  // Remove any explicit terms that might trigger content filters
  const sanitized = prompt
    .replace(/\b(nsfw|nude|naked|sex|porn|xxx|boob|breast|explicit)\b/gi, '***');
  
  // Add a safety prefix
  return `Create a safe, appropriate image of: ${sanitized}`;
}

// Function to upload image to UploadThing for persistent storage
async function uploadToUploadThing(buffer: Buffer, filename: string): Promise<string> {
  try {
    // Create a File object from the buffer
    const file = new File([buffer], filename, { type: 'image/png' });
    
    // Upload to UploadThing
    const response = await utapi.uploadFiles([file]);
    
    if (response[0]?.data?.url) {
      console.log("Successfully uploaded to UploadThing:", response[0].data.url);
      return response[0].data.url;
    } else {
      throw new Error("Failed to upload to UploadThing");
    }
  } catch (error) {
    console.error("UploadThing upload error:", error);
    throw error;
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
        let imageBuffer: Buffer | null = null;
        let persistentUrl: string;
        
        // Try gpt-image-1 first (latest model)
        if (input.model === "gpt-image-1") {
          try {
            console.log(`Calling OpenAI with GPT-Image-1, prompt: ${safePrompt.substring(0, 50)}...`);
            
            response = await openai.images.generate({
              model: "gpt-image-1",
              prompt: safePrompt,
              n: 1,
              size: input.size === "auto" ? "1024x1024" : input.size,
              // gpt-image-1 returns b64_json format by default
            });
            
            console.log("GPT-Image-1 API Response received");
            
            if (response.data && response.data.length > 0) {
              const firstResult = response.data[0];
              
              if (typeof firstResult === 'object' && firstResult !== null) {
                const resultObj = firstResult as Record<string, any>;
                
                // gpt-image-1 returns b64_json format
                if (resultObj.b64_json) {
                  console.log("Found base64 image in response, uploading to UploadThing...");
                  imageBuffer = Buffer.from(resultObj.b64_json, 'base64');
                  
                  // Upload to UploadThing for persistent storage
                  const timestamp = Date.now();
                  const filename = `generated-image-${timestamp}.png`;
                  persistentUrl = await uploadToUploadThing(imageBuffer, filename);
                  
                  return {
                    imageUrl: persistentUrl,
                    filePath: persistentUrl, // Use the same URL for both
                  };
                }
              }
            }
          } catch (err) {
            console.error("Error with gpt-image-1:", err);
            console.log("Falling back to DALL-E 3...");
          }
        }
        
        // Use DALL-E 3 or DALL-E 2 (fallback or direct selection)
        if (input.model === "dall-e-3" || !imageBuffer) {
          console.log(`Calling OpenAI with DALL-E 3, prompt: ${safePrompt.substring(0, 50)}...`);
          
          response = await openai.images.generate({
            model: "dall-e-3",
            prompt: safePrompt,
            n: 1,
            size: "1024x1024",
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
        
        // Handle URL-based responses (DALL-E 2/3)
        if (response && !imageBuffer) {
          console.log("OpenAI API Response received");
          
          if (response.data && response.data.length > 0) {
            const imageUrl = response.data[0]?.url;
            console.log(`${input.model} image URL:`, imageUrl);
            
            if (!imageUrl) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: `Failed to generate image: No URL returned from ${input.model}`,
              });
            }
            
            // Fetch the image and upload to UploadThing for persistence
            try {
              const imageResponse = await fetch(imageUrl);
              
              if (!imageResponse.ok) {
                throw new TRPCError({
                  code: "INTERNAL_SERVER_ERROR",
                  message: `Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`,
                });
              }
              
              imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
              
              // Upload to UploadThing for persistent storage
              const timestamp = Date.now();
              const filename = `generated-image-${timestamp}.png`;
              persistentUrl = await uploadToUploadThing(imageBuffer, filename);
              
              console.log("Image uploaded to UploadThing:", persistentUrl);
              
              return {
                imageUrl: persistentUrl,
                filePath: persistentUrl, // Use the same URL for both
              };
            } catch (fetchError) {
              console.error("Error fetching or uploading image:", fetchError);
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: `Error processing image: ${(fetchError as Error).message}`,
              });
            }
          }
        }
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to generate image: No valid response from ${input.model}`,
        });
        
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