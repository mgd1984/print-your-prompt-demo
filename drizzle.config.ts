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

const connectionParams = parseConnectionString(env.DATABASE_URL);

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
