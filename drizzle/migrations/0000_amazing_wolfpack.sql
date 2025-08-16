--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "codex"."entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"definition" text NOT NULL,
	"type" varchar(50) NOT NULL,
	"aliases" jsonb DEFAULT '[]'::jsonb,
	"video_link" text,
	"mentioned_entries" jsonb DEFAULT '[]'::jsonb,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "codex"."entry_references" (
	"source_entry_id" integer NOT NULL,
	"target_entry_id" integer NOT NULL,
	CONSTRAINT "entry_references_source_entry_id_target_entry_id_pk" PRIMARY KEY("source_entry_id","target_entry_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "codex"."entry_tags" (
	"entry_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "entry_tags_entry_id_tag_id_pk" PRIMARY KEY("entry_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "codex"."tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	CONSTRAINT "tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "codex"."user_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"submission_type" varchar(50) NOT NULL,
	"data" jsonb NOT NULL,
	"submitter_name" varchar(255),
	"submitter_email" varchar(255),
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "codex"."entry_references" ADD CONSTRAINT "entry_references_source_entry_id_entries_id_fk" FOREIGN KEY ("source_entry_id") REFERENCES "codex"."entries"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "codex"."entry_references" ADD CONSTRAINT "entry_references_target_entry_id_entries_id_fk" FOREIGN KEY ("target_entry_id") REFERENCES "codex"."entries"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "codex"."entry_tags" ADD CONSTRAINT "entry_tags_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "codex"."entries"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "codex"."entry_tags" ADD CONSTRAINT "entry_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "codex"."tags"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
