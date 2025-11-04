/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  console.log(
    "[MIGRATION_LOG] Starting migration: create_entries_and_entry_tags_table UP"
  );

  // Create 'entries' table (this part remains as is, as it's working)
  pgm.createTable(
    "entries",
    {
      id: { type: "text", primaryKey: true }, // Consistent with text IDs from app logic
      title: { type: "text", notNull: true },
      definition: { type: "text", notNull: true },
      type: { type: "text", notNull: true }, // 'exicon' or 'lexicon'
      aliases: { type: "jsonb", default: "[]" },
      video_link: { type: "text" },
      created_at: {
        type: "timestamp",
        notNull: true,
        default: pgm.func("current_timestamp"),
      },
      updated_at: {
        type: "timestamp",
        notNull: true,
        default: pgm.func("current_timestamp"),
      },
    },
    {
      ifNotExists: true,
    }
  );

  pgm.createIndex("entries", "title", { ifNotExists: true });
  pgm.createIndex("entries", "type", { ifNotExists: true });

  // --- WORKAROUND: Create entry_tags join table using raw SQL ---
  // This bypasses the JavaScript object definition for node-pg-migrate's primaryKey parsing
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS "entry_tags" (
      "entry_id" TEXT NOT NULL REFERENCES "entries"("id") ON DELETE CASCADE,
      "tag_id" TEXT NOT NULL REFERENCES "tags"("id") ON DELETE CASCADE,
      PRIMARY KEY ("entry_id", "tag_id")
    );
  `);
  // -----------------------------------------------------------

  // IMPORTANT: All data insertion logic (initial entries, CSV import)
  // has been moved to scripts/import-lexicon-csv.ts.
  // This migration file now ONLY defines the database schema.

  console.log(
    "[MIGRATION_LOG] Finished migration: create_entries_and_entry_tags_table UP"
  );
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  console.log(
    "[MIGRATION_LOG] Starting migration: create_entries_and_entry_tags_table DOWN"
  );
  // When using pgm.sql for UP, you should use pgm.sql for DOWN too for consistency,
  // or ensure pgm.dropTable can correctly identify the table created by pgm.sql.
  // In this case, pgm.dropTable should still work as it targets the table name.
  pgm.dropTable("entry_tags", { ifExists: true }); // Drop dependent table first
  pgm.dropTable("entries", { ifExists: true });
  // Drop indexes if they were explicitly created in this migration
  pgm.dropIndex("entries", "type", { ifExists: true });
  pgm.dropIndex("entries", "title", { ifExists: true });
  console.log(
    "[MIGRATION_LOG] Finished migration: create_entries_and_entry_tags_table DOWN"
  );
};
