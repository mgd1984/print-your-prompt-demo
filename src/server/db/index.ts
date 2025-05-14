import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { env } from "@/env";
import * as schema from "./schema";

/**
 * Cache the database connection in development. This avoids creating a new connection on every HMR
 * update.
 */
const globalForDb = globalThis as unknown as {
  client: Pool | undefined;
};

export const client = 
  globalForDb.client ?? new Pool({ connectionString: env.DATABASE_URL });
if (env.NODE_ENV !== "production") globalForDb.client = client;

export const db = drizzle(client, { schema });
