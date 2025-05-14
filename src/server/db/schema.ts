// Example model schema from the Drizzle docs
// https://orm.drizzle.team/docs/sql-schema-declaration

import { sql } from "drizzle-orm";
import { index, sqliteTableCreator } from "drizzle-orm/sqlite-core";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = sqliteTableCreator(
  (name) => `print-your-prompt-demo_${name}`,
);

export const prompts = createTable(
  "prompt",
  (d) => ({
    id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    text: d.text({ length: 500 }).notNull(),
    username: d.text({ length: 50 }),
    createdAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    status: d.text({ enum: ["pending", "selected", "completed"] }).default("pending").notNull(),
    imageUrl: d.text({ length: 500 }),
  }),
  (t) => [index("prompt_created_at_idx").on(t.createdAt)],
);

export const votes = createTable(
  "vote",
  (d) => ({
    id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    promptId: d.integer({ mode: "number" }).notNull(),
    voter: d.text({ length: 100 }).notNull(), // Cookie-based user ID
    createdAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  }),
  (t) => [
    index("vote_prompt_id_idx").on(t.promptId),
    index("vote_voter_idx").on(t.voter),
    index("vote_created_at_idx").on(t.createdAt),
  ],
);

export const sessions = createTable(
  "session",
  (d) => ({
    id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    startedAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    endedAt: d.integer({ mode: "timestamp" }),
    active: d.integer({ mode: "boolean" }).default(true).notNull(),
  }),
);
