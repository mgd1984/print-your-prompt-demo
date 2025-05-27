import { type Config } from "drizzle-kit";

import { env } from "@/env";

// Parse connection string to individual parameters
// Using URL in dbCredentials overrides SSL settings, so we need individual params
const parseConnectionString = (url: string) => {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port) || 5432,
    user: parsed.username,
    password: parsed.password,
    database: parsed.pathname.slice(1), // Remove leading slash
  };
};

// Get database URL - prefer POSTGRES_URL (Vercel) over DATABASE_URL
const databaseUrl = env.POSTGRES_URL || env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("No database URL found. Please set DATABASE_URL or POSTGRES_URL environment variable.");
}

const connectionParams = parseConnectionString(databaseUrl);

export default {
  schema: "./src/server/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    ...connectionParams,
    // Temporarily disable SSL verification for Vercel + Supabase compatibility
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  },
  tablesFilter: ["print-your-prompt-demo_*"],
  verbose: true,
  strict: true,
} satisfies Config;
