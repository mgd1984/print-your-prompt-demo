CREATE TABLE "print-your-prompt-demo_prompt" (
	"id" serial PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"username" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"image_url" text
);
--> statement-breakpoint
CREATE TABLE "print-your-prompt-demo_session" (
	"id" serial PRIMARY KEY NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "print-your-prompt-demo_vote" (
	"id" serial PRIMARY KEY NOT NULL,
	"prompt_id" integer NOT NULL,
	"voter" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "prompt_created_at_idx" ON "print-your-prompt-demo_prompt" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "vote_prompt_id_idx" ON "print-your-prompt-demo_vote" USING btree ("prompt_id");--> statement-breakpoint
CREATE INDEX "vote_voter_idx" ON "print-your-prompt-demo_vote" USING btree ("voter");--> statement-breakpoint
CREATE INDEX "vote_created_at_idx" ON "print-your-prompt-demo_vote" USING btree ("created_at");