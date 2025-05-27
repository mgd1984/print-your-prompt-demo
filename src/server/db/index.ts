import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/env";
import * as schema from "./schema";

/**
 * Cache the database connection in development. This avoids creating a new connection on every HMR
 * update.
 */
const globalForDb = globalThis as unknown as {
  pool: Pool | undefined;
};

// Parse connection string to individual parameters
// This is required for proper SSL handling with Supabase on Vercel
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

// SSL configuration for Vercel + Supabase
// rejectUnauthorized: false is required for this specific setup
// This is a known limitation with Vercel's serverless environment + Supabase
const sslConfig = env.NODE_ENV === "production" 
  ? { rejectUnauthorized: false } // Required for Vercel + Supabase compatibility
  : false;

export const pool =
  globalForDb.pool ?? 
  new Pool({
    ...connectionParams,
    ssl: sslConfig,
    // Connection pool settings for better performance
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

if (env.NODE_ENV !== "production") globalForDb.pool = pool;

export const db = drizzle(pool, { schema });

// For backwards compatibility, export client as well
export const client = pool;
