import {
  pgSchema,
  serial,
  text,
  timestamp,
  jsonb,
  varchar,
  integer,
  primaryKey,
} from "drizzle-orm/pg-core";

export const codex = pgSchema("codex");

export const entries = codex.table("entries", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  definition: text("definition").notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  aliases: jsonb("aliases").default([]),
  video_link: text("video_link"),
  mentioned_entries: jsonb("mentioned_entries").default([]),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const tags = codex.table("tags", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
});

export const entryTags = codex.table(
  "entry_tags",
  {
    entry_id: integer("entry_id")
      .references(() => entries.id, { onDelete: "cascade" })
      .notNull(),
    tag_id: integer("tag_id")
      .references(() => tags.id, { onDelete: "cascade" })
      .notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.entry_id, table.tag_id] }),
  }),
);

export const entryReferences = codex.table(
  "entry_references",
  {
    source_entry_id: integer("source_entry_id")
      .references(() => entries.id, { onDelete: "cascade" })
      .notNull(),
    target_entry_id: integer("target_entry_id")
      .references(() => entries.id, { onDelete: "cascade" })
      .notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.source_entry_id, table.target_entry_id] }),
  }),
);

export const userSubmissions = codex.table("user_submissions", {
  id: serial("id").primaryKey(),
  submission_type: varchar("submission_type", { length: 50 }).notNull(),
  data: jsonb("data").notNull(),
  submitter_name: varchar("submitter_name", { length: 255 }),
  submitter_email: varchar("submitter_email", { length: 255 }),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const admins = codex.table("admins", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});
