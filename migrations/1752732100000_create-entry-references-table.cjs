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
    "[MIGRATION_LOG] Starting migration: create_entry_references_table UP",
  );

  pgm.createTable(
    "entry_references",
    {
      id: {
        type: "serial",
        primaryKey: true,
      },
      source_entry_id: {
        type: "text",
        notNull: true,
        references: '"entries"',
        onDelete: "CASCADE",
      },
      target_entry_id: {
        type: "text",
        notNull: true,
        references: '"entries"',
        onDelete: "CASCADE",
      },
      context: {
        type: "text",
        notNull: true,
        default: "",
      },
      created_at: {
        type: "timestamp",
        notNull: true,
        default: pgm.func("current_timestamp"),
      },
    },
    {
      ifNotExists: true,
    },
  );

  pgm.addConstraint(
    "entry_references",
    "entry_references_unique_source_target",
    {
      unique: ["source_entry_id", "target_entry_id"],
    },
  );

  pgm.createIndex("entry_references", ["source_entry_id"], {
    ifNotExists: true,
  });

  pgm.createIndex("entry_references", ["target_entry_id"], {
    ifNotExists: true,
  });

  console.log(
    "[MIGRATION_LOG] Finished migration: create_entry_references_table UP",
  );
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  console.log(
    "[MIGRATION_LOG] Starting migration: create_entry_references_table DOWN",
  );

  pgm.dropIndex("entry_references", ["target_entry_id"], { ifExists: true });
  pgm.dropIndex("entry_references", ["source_entry_id"], { ifExists: true });
  pgm.dropConstraint(
    "entry_references",
    "entry_references_unique_source_target",
    {
      ifExists: true,
    },
  );
  pgm.dropTable("entry_references", { ifExists: true });

  console.log(
    "[MIGRATION_LOG] Finished migration: create_entry_references_table DOWN",
  );
};
