import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    // Database - Use POSTGRES_URL from Vercel + Supabase integration
    DATABASE_URL: z.string().url().optional(),
    POSTGRES_URL: z.string().url().optional(),
    
    // Supabase (optional for client-side usage)
    SUPABASE_URL: z.string().url().optional(),
    SUPABASE_ANON_KEY: z.string().min(1).optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
    
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    
    // OpenAI - Optional for build time, required at runtime
    OPENAI_API_KEY: z.string().min(1).optional(),
    
    // UploadThing - For persistent image storage
    UPLOADTHING_TOKEN: z.string().min(1).optional(),
    UPLOADTHING_APP_ID: z.string().min(1).optional(),
    
    // Print Server (for production with ngrok)
    PRINT_SERVER_URL: z.string().url().optional(),
    PRINT_SERVER_TOKEN: z.string().min(1).optional(),
    
    // Optional: Local CUPS authentication
    CUPS_USER: z.string().optional(),
    CUPS_PASSWORD: z.string().optional(),
    
    // Admin authentication
    ADMIN_PASSWORD: z.string().min(1).optional(),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    POSTGRES_URL: process.env.POSTGRES_URL,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NODE_ENV: process.env.NODE_ENV,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    UPLOADTHING_TOKEN: process.env.UPLOADTHING_TOKEN,
    UPLOADTHING_APP_ID: process.env.UPLOADTHING_APP_ID,
    PRINT_SERVER_URL: process.env.PRINT_SERVER_URL,
    PRINT_SERVER_TOKEN: process.env.PRINT_SERVER_TOKEN,
    CUPS_USER: process.env.CUPS_USER,
    CUPS_PASSWORD: process.env.CUPS_PASSWORD,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  },
  /**
   * Run `build` or `dev` with SKIP_ENV_VALIDATION to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
