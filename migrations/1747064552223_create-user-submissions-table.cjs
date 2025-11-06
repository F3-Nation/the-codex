/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  console.log(
    "[MIGRATION_LOG] Starting migration: create-user-submissions-table UP",
  );

  pgm.createTable("user_submissions", {
    id: { type: "serial", primaryKey: true },

    submission_type: { type: "text", notNull: true }, // 'new' or 'edit'
    data: { type: "jsonb", notNull: true }, // JSON data matching NewEntrySuggestionData or EditEntrySuggestionData
    submitter_name: { type: "text" },
    submitter_email: { type: "text" },

    status: { type: "text", notNull: true, default: "pending" }, // 'pending', 'approved', 'rejected'

    timestamp: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
    updated_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
  });

  pgm.createIndex("user_submissions", "status");
  pgm.createIndex("user_submissions", "timestamp");

  // Optional: trigger to auto-update `updated_at` on row modification
  pgm.sql(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ language 'plpgsql';

    CREATE TRIGGER trigger_user_submissions_updated_at
    BEFORE UPDATE ON user_submissions
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
  `);

  console.log(
    "[MIGRATION_LOG] Finished migration: create-user-submissions-table UP",
  );
};

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  console.log(
    "[MIGRATION_LOG] Starting migration: create-user-submissions-table DOWN",
  );

  pgm.sql(
    `DROP TRIGGER IF EXISTS trigger_user_submissions_updated_at ON user_submissions;`,
  );
  pgm.sql(`DROP FUNCTION IF EXISTS update_updated_at_column;`);

  pgm.dropTable("user_submissions");

  console.log(
    "[MIGRATION_LOG] Finished migration: create-user-submissions-table DOWN",
  );
};
