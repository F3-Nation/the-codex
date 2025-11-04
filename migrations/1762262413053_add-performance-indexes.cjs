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
    "[MIGRATION_LOG] Starting migration: add_performance_indexes UP"
  );

  // Add index on target_entry_id for entry_references table (in codex schema)
  // This optimizes queries that join on target_entry_id (e.g., finding entries that reference a given entry)
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_entry_references_target_entry_id
    ON codex.entry_references(target_entry_id);
  `);

  // Also create in public schema if it exists there
  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'entry_references') THEN
        CREATE INDEX IF NOT EXISTS idx_entry_references_target_entry_id_public
        ON public.entry_references(target_entry_id);
      END IF;
    END $$;
  `);

  // Add index on tag_id for entry_tags table (in codex schema)
  // This optimizes queries that join on tag_id (e.g., finding all entries with a specific tag)
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_entry_tags_tag_id
    ON codex.entry_tags(tag_id);
  `);

  // Also create in public schema if it exists there
  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'entry_tags') THEN
        CREATE INDEX IF NOT EXISTS idx_entry_tags_tag_id_public
        ON public.entry_tags(tag_id);
      END IF;
    END $$;
  `);

  console.log(
    "[MIGRATION_LOG] Finished migration: add_performance_indexes UP"
  );
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  console.log(
    "[MIGRATION_LOG] Starting migration: add_performance_indexes DOWN"
  );

  // Drop indexes from both schemas
  pgm.sql(`
    DROP INDEX IF EXISTS codex.idx_entry_tags_tag_id;
    DROP INDEX IF EXISTS public.idx_entry_tags_tag_id_public;
  `);

  pgm.sql(`
    DROP INDEX IF EXISTS codex.idx_entry_references_target_entry_id;
    DROP INDEX IF EXISTS public.idx_entry_references_target_entry_id_public;
  `);

  console.log(
    "[MIGRATION_LOG] Finished migration: add_performance_indexes DOWN"
  );
};
