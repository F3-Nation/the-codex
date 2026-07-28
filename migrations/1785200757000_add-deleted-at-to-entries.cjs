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
    "[MIGRATION_LOG] Starting migration: add_deleted_at_to_entries UP",
  );

  pgm.sql(`
    ALTER TABLE entries
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_entries_deleted_at
    ON entries(deleted_at);
  `);

  console.log(
    "[MIGRATION_LOG] Finished migration: add_deleted_at_to_entries UP",
  );
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  console.log(
    "[MIGRATION_LOG] Starting migration: add_deleted_at_to_entries DOWN",
  );

  pgm.sql(`
    DROP INDEX IF EXISTS idx_entries_deleted_at;
  `);

  pgm.sql(`
    ALTER TABLE entries
    DROP COLUMN IF EXISTS deleted_at;
  `);

  console.log(
    "[MIGRATION_LOG] Finished migration: add_deleted_at_to_entries DOWN",
  );
};
