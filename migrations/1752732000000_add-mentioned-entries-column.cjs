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
    "[MIGRATION_LOG] Starting migration: add_mentioned_entries_column_to_entries UP",
  );

  pgm.sql(`
    ALTER TABLE entries
    ADD COLUMN IF NOT EXISTS mentioned_entries JSONB DEFAULT '[]'::jsonb;
  `);

  pgm.sql(`
    ALTER TABLE entries
    ALTER COLUMN mentioned_entries SET DEFAULT '[]'::jsonb;
  `);

  pgm.sql(`
    UPDATE entries
    SET mentioned_entries = '[]'::jsonb
    WHERE mentioned_entries IS NULL;
  `);

  console.log(
    "[MIGRATION_LOG] Finished migration: add_mentioned_entries_column_to_entries UP",
  );
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  console.log(
    "[MIGRATION_LOG] Starting migration: add_mentioned_entries_column_to_entries DOWN",
  );

  pgm.sql(`
    ALTER TABLE entries
    DROP COLUMN IF EXISTS mentioned_entries;
  `);

  console.log(
    "[MIGRATION_LOG] Finished migration: add_mentioned_entries_column_to_entries DOWN",
  );
};
