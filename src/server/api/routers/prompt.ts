import { z } from "zod";
import { sql } from "drizzle-orm";
import { eq, desc, gte, and, count } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { prompts, votes, sessions } from "@/server/db/schema";

export const promptRouter = createTRPCRouter({
  // Submit a new prompt
  submit: publicProcedure
    .input(z.object({ 
      text: z.string().min(1).max(500),
      voter: z.string().min(1),
      username: z.string().max(50).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      // First, check if prompt text already exists in current session
      const activeSession = await ctx.db.query.sessions.findFirst({
        where: eq(sessions.active, true),
        orderBy: [desc(sessions.startedAt)],
      });

      if (!activeSession) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No active voting session found",
        });
      }

      // Check if prompt already exists
      const existingPrompt = await ctx.db.query.prompts.findFirst({
        where: eq(prompts.text, input.text),
      });

      let promptId;
      
      if (existingPrompt) {
        promptId = existingPrompt.id;
      } else {
        // Insert new prompt
        const result = await ctx.db.insert(prompts).values({
          text: input.text,
          username: input.username,
          createdAt: new Date(),
          status: "pending",
        }).returning({ insertedId: prompts.id });
        
        if (!result[0]) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create prompt",
          });
        }
        
        promptId = result[0].insertedId;
      }

      // Check if user already voted for this prompt
      const existingVote = await ctx.db.query.votes.findFirst({
        where: and(
          eq(votes.promptId, promptId),
          eq(votes.voter, input.voter)
        ),
      });

      if (!existingVote) {
        // Add vote
        await ctx.db.insert(votes).values({
          promptId,
          voter: input.voter,
          createdAt: new Date(),
        });
      }

      return { success: true, promptId };
    }),

  // Get all current prompts with vote counts
  getAll: publicProcedure
    .input(z.object({ 
      limit: z.number().min(1).max(100).default(50),
      seconds: z.number().min(1).default(60)
    }))
    .query(async ({ ctx, input }) => {
      const { limit } = input;
      
      // Get active session - this is crucial for filtering
      const activeSession = await ctx.db.query.sessions.findFirst({
        where: eq(sessions.active, true),
        orderBy: [desc(sessions.startedAt)],
      });
      
      if (!activeSession) {
        return { 
          prompts: [],
          hasActiveSession: false,
          sessionStartedAt: null,
          sessionId: null
        };
      }
      
      // Only get prompts created after the current session started
      const allPrompts = await ctx.db.query.prompts.findMany({
        where: and(
          gte(prompts.createdAt, activeSession.startedAt),
          eq(prompts.status, "pending")
        ),
        orderBy: [desc(prompts.createdAt)],
        limit,
      });
      
      // Get votes for each prompt
      const result = await Promise.all(
        allPrompts.map(async (prompt) => {
          const promptVotes = await ctx.db.query.votes.findMany({
            where: eq(votes.promptId, prompt.id),
          });
          
          return {
            id: prompt.id,
            text: prompt.text,
            username: prompt.username,
            status: prompt.status,
            createdAt: prompt.createdAt,
            votes: promptVotes.length,
          };
        })
      );
      
      // Sort by vote count descending
      result.sort((a, b) => b.votes - a.votes);
      
      return { 
        prompts: result,
        hasActiveSession: true,
        sessionStartedAt: activeSession.startedAt,
        sessionId: activeSession.id
      };
    }),
    
  // Get the winning prompt
  getWinner: publicProcedure
    .mutation(async ({ ctx }) => {
      // Get active session
      const activeSession = await ctx.db.query.sessions.findFirst({
        where: eq(sessions.active, true),
        orderBy: [desc(sessions.startedAt)],
      });
      
      if (!activeSession) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No active voting session found",
        });
      }
      
      // Get all prompts with status "pending"
      const allPrompts = await ctx.db.query.prompts.findMany({
        where: eq(prompts.status, "pending"),
      });
      
      if (allPrompts.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No pending prompts found",
        });
      }
      
      // Get winner by vote count
      const result = await Promise.all(
        allPrompts.map(async (prompt) => {
          const promptVotes = await ctx.db.query.votes.findMany({
            where: eq(votes.promptId, prompt.id),
          });
          
          return {
            ...prompt,
            votes: promptVotes.length,
          };
        })
      );
      
      // Sort by vote count descending
      result.sort((a, b) => b.votes - a.votes);
      
      // Mark winner as selected
      if (result.length > 0) {
        const winner = result[0];
        if (winner) {
          await ctx.db
            .update(prompts)
            .set({ status: "selected" })
            .where(eq(prompts.id, winner.id));
          
          return { 
            winner: {
              id: winner.id,
              text: winner.text,
              votes: winner.votes,
            }
          };
        }
      }
      
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No winner could be determined",
      });
    }),

  // Start a new voting session
  startSession: publicProcedure
    .mutation(async ({ ctx }) => {
      // First, mark all current sessions as inactive
      await ctx.db
        .update(sessions)
        .set({ active: false, endedAt: new Date() })
        .where(eq(sessions.active, true));
      
      // Create a new session
      const result = await ctx.db
        .insert(sessions)
        .values({
          startedAt: new Date(),
          active: true,
        })
        .returning({ insertedId: sessions.id });
      
      if (!result[0]) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create session",
        });
      }
      
      // Reset all pending prompts
      await ctx.db
        .update(prompts)
        .set({ status: "completed" })
        .where(eq(prompts.status, "pending"));
      
      return { 
        sessionId: result[0].insertedId,
      };
    }),
    
  // End current voting session
  endSession: publicProcedure
    .mutation(async ({ ctx }) => {
      const result = await ctx.db
        .update(sessions)
        .set({ active: false, endedAt: new Date() })
        .where(eq(sessions.active, true))
        .returning({ updatedId: sessions.id });
      
      if (!result[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No active session found",
        });
      }
      
      return { 
        sessionId: result[0].updatedId,
      };
    }),
    
  // Generate a unique voter ID
  getVoterId: publicProcedure
    .query(() => {
      return { voterId: uuidv4() };
    }),

  // Get all prompts for admin panel (not filtered by session)
  getAllForAdmin: publicProcedure
    .input(z.object({ 
      limit: z.number().min(1).max(100).default(50),
      hours: z.number().min(1).default(24) // Show prompts from last 24 hours by default
    }))
    .query(async ({ ctx, input }) => {
      const { limit, hours } = input;
      
      // Calculate timestamp for filtering recent prompts
      const timestamp = new Date();
      timestamp.setHours(timestamp.getHours() - hours);
      
      // Get active session info
      const activeSession = await ctx.db.query.sessions.findFirst({
        where: eq(sessions.active, true),
        orderBy: [desc(sessions.startedAt)],
      });
      
      // Get all prompts from the specified time period
      const allPrompts = await ctx.db.query.prompts.findMany({
        where: gte(prompts.createdAt, timestamp),
        orderBy: [desc(prompts.createdAt)],
        limit,
      });
      
      // Get votes for each prompt
      const result = await Promise.all(
        allPrompts.map(async (prompt) => {
          const promptVotes = await ctx.db.query.votes.findMany({
            where: eq(votes.promptId, prompt.id),
          });
          
          return {
            id: prompt.id,
            text: prompt.text,
            username: prompt.username,
            status: prompt.status,
            createdAt: prompt.createdAt,
            votes: promptVotes.length,
          };
        })
      );
      
      // Sort by vote count descending
      result.sort((a, b) => b.votes - a.votes);
      
      return { 
        prompts: result,
        hasActiveSession: !!activeSession,
        sessionStartedAt: activeSession?.startedAt || null,
        sessionId: activeSession?.id || null
      };
    }),
    
  // Get completed prompts with images for the gallery
  getGallery: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20)
    }))
    .query(async ({ ctx, input }) => {
      const { limit } = input;
      
      // Get completed prompts that have generated images
      const completedPrompts = await ctx.db.query.prompts.findMany({
        where: and(
          eq(prompts.status, "completed"),
          sql`${prompts.imageUrl} IS NOT NULL`
        ),
        orderBy: [desc(prompts.createdAt)],
        limit,
      });
      
      return { 
        gallery: completedPrompts.map(prompt => ({
          id: prompt.id,
          text: prompt.text,
          username: prompt.username,
          imageUrl: prompt.imageUrl,
          createdAt: prompt.createdAt
        }))
      };
    }),
    
  // Update a prompt with an image URL
  updatePromptImage: publicProcedure
    .input(z.object({
      promptId: z.number(),
      imageUrl: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const { promptId, imageUrl } = input;
      
      console.log("Updating prompt with image:", promptId, imageUrl);
      
      try {
        // Update the prompt with the image URL
        const result = await ctx.db
          .update(prompts)
          .set({ 
            imageUrl: imageUrl,
            status: "completed" // Mark as completed when an image is added
          })
          .where(eq(prompts.id, promptId))
          .returning({ updatedId: prompts.id, updatedUrl: prompts.imageUrl });
        
        console.log("Update result:", result);
        
        if (!result.length) {
          console.error("No prompt was updated with ID:", promptId);
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Prompt not found or could not be updated",
          });
        }
        
        // Verify updated prompt
        const updatedPrompt = await ctx.db.query.prompts.findFirst({
          where: eq(prompts.id, promptId)
        });
        
        console.log("Verified updated prompt:", updatedPrompt);
        
        return { 
          success: true, 
          updatedPrompt: result[0] 
        };
      } catch (error) {
        console.error("Database error during prompt update:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to update prompt: ${(error as Error).message}`,
        });
      }
    }),

  // Create a new prompt with an image URL (for custom prompts)
  createPromptWithImage: publicProcedure
    .input(z.object({
      text: z.string().min(1).max(500),
      imageUrl: z.string().min(1),
      username: z.string().max(50).optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { text, imageUrl, username } = input;
      
      console.log("Creating new prompt with image:", text, imageUrl);
      
      try {
        // Insert new prompt with image URL and completed status
        const result = await ctx.db.insert(prompts).values({
          text: text,
          username: username,
          imageUrl: imageUrl,
          status: "completed", // Mark as completed since it already has an image
          createdAt: new Date(),
        }).returning({ insertedId: prompts.id, insertedUrl: prompts.imageUrl });
        
        console.log("Create result:", result);
        
        if (!result[0]) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create prompt with image",
          });
        }
        
        return { 
          success: true, 
          createdPrompt: result[0] 
        };
      } catch (error) {
        console.error("Database error during prompt creation:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to create prompt: ${(error as Error).message}`,
        });
      }
    }),

  // Get prompts from the most recent completed session for image generation
  getLatestCompletedSession: publicProcedure
    .input(z.object({ 
      limit: z.number().min(1).max(100).default(50)
    }))
    .query(async ({ ctx, input }) => {
      const { limit } = input;
      
      // Try to get the most recent completed session
      const latestCompletedSession = await ctx.db.query.sessions.findFirst({
        where: eq(sessions.active, false),
        orderBy: [desc(sessions.startedAt)],
      });
      
      // If no completed session, try to get the most recent session regardless of status
      const fallbackSession = latestCompletedSession || await ctx.db.query.sessions.findFirst({
        orderBy: [desc(sessions.startedAt)],
      });
      
      if (!fallbackSession) {
        return { 
          prompts: [],
          hasSession: false,
          sessionId: null,
          sessionEndedAt: null
        };
      }
      
      // Get all prompts from that session timeframe
      const sessionPrompts = await ctx.db.query.prompts.findMany({
        where: gte(prompts.createdAt, fallbackSession.startedAt),
        orderBy: [desc(prompts.createdAt)],
        limit,
      });
      
      // Get votes for each prompt
      const result = await Promise.all(
        sessionPrompts.map(async (prompt) => {
          const promptVotes = await ctx.db.query.votes.findMany({
            where: eq(votes.promptId, prompt.id),
          });
          
          return {
            id: prompt.id,
            text: prompt.text,
            username: prompt.username,
            status: prompt.status,
            createdAt: prompt.createdAt,
            votes: promptVotes.length,
          };
        })
      );
      
      // Sort by vote count descending
      result.sort((a, b) => b.votes - a.votes);
      
      return { 
        prompts: result,
        hasSession: true,
        sessionId: fallbackSession.id,
        sessionEndedAt: fallbackSession.endedAt
      };
    }),
}); 