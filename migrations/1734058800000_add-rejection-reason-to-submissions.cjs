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
    "[MIGRATION_LOG] Starting migration: add-rejection-reason-to-submissions UP",
  );

  // Add rejection_reason column to store admin's explanation when rejecting
  pgm.addColumn("user_submissions", {
    rejection_reason: {
      type: "text",
      notNull: false,
      comment: "Admin's reason for rejecting the submission",
    },
  });

  // Add admin_notes column for any additional admin comments
  pgm.addColumn("user_submissions", {
    admin_notes: {
      type: "text",
      notNull: false,
      comment: "Internal admin notes about the submission",
    },
  });

  console.log(
    "[MIGRATION_LOG] Finished migration: add-rejection-reason-to-submissions UP",
  );
};

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  console.log(
    "[MIGRATION_LOG] Starting migration: add-rejection-reason-to-submissions DOWN",
  );

  pgm.dropColumn("user_submissions", "rejection_reason");
  pgm.dropColumn("user_submissions", "admin_notes");

  console.log(
    "[MIGRATION_LOG] Finished migration: add-rejection-reason-to-submissions DOWN",
  );
};
