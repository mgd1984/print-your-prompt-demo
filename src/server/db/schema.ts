// Example model schema from the Drizzle docs
// https://orm.drizzle.team/docs/sql-schema-declaration

import { sql } from "drizzle-orm";
import { 
  pgTable, 
  serial, 
  integer,
  text, 
  timestamp, 
  boolean, 
  index as pgIndex
} from "drizzle-orm/pg-core";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
// Create a table prefix helper to ensure consistent naming
const getTableName = (name: string) => `print-your-prompt-demo_${name}`;

// Define the prompts table with indexes
export const prompts = pgTable(
  getTableName("prompt"),
  {
    id: serial("id").primaryKey(),
    text: text("text").notNull(),
    username: text("username"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    status: text("status", { enum: ["pending", "selected", "completed"] }).default("pending").notNull(),
    imageUrl: text("image_url"),
  },
  (table) => {
    return {
      createdAtIdx: pgIndex("prompt_created_at_idx").on(table.createdAt),
    };
  }
);

// Define the votes table with indexes
export const votes = pgTable(
  getTableName("vote"),
  {
    id: serial("id").primaryKey(),
    promptId: integer("prompt_id").notNull(),
    voter: text("voter").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => {
    return {
      promptIdIdx: pgIndex("vote_prompt_id_idx").on(table.promptId),
      voterIdx: pgIndex("vote_voter_idx").on(table.voter),
      createdAtIdx: pgIndex("vote_created_at_idx").on(table.createdAt),
    };
  }
);

// Define the sessions table
export const sessions = pgTable(
  getTableName("session"),
  {
    id: serial("id").primaryKey(),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    endedAt: timestamp("ended_at"),
    active: boolean("active").default(true).notNull(),
  }
);
