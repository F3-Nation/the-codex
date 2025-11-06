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
    "[MIGRATION_LOG] Starting migration: 1747064544503_create-tags-table.js UP",
  );
  pgm.createTable("tags", {
    id: { type: "text", primaryKey: true },
    name: { type: "text", notNull: true, unique: true },
    created_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
  });

  const initialTags = [
    { id: "t1", name: "Arms" },
    { id: "t2", name: "Legs" },
    { id: "t3", name: "Core" },
    { id: "t4", name: "Cardio" },
    { id: "t5", name: "Full Body" },
    { id: "t6", name: "Partner" },
    { id: "t7", name: "Coupon" },
    { id: "t8", name: "Music" },
    { id: "t9", name: "Mosey" },
    { id: "t10", name: "Static" },
    { id: "t11", name: "Strength" },
    { id: "t12", name: "AMRAP" },
    { id: "t13", name: "EMOM" },
    { id: "t14", name: "Reps" },
    { id: "t15", name: "Timed" },
    { id: "t16", name: "Distance" },
    { id: "t17", name: "Routine" },
    { id: "t18", name: "Run" },
    { id: "t19", name: "Warm-Up" },
    { id: "t20", name: "Mary" },
  ];

  for (const tag of initialTags) {
    pgm.sql(
      `INSERT INTO tags (id, name) VALUES ('${tag.id}', '${tag.name.replace(/'/g, "''")}');`,
    );
  }
  console.log(
    "[MIGRATION_LOG] Finished migration: 1747064544503_create-tags-table.js UP",
  );
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  console.log(
    "[MIGRATION_LOG] Starting migration: 1747064544503_create-tags-table.js DOWN",
  );
  pgm.dropTable("tags");
  console.log(
    "[MIGRATION_LOG] Finished migration: 1747064544503_create-tags-table.js DOWN",
  );
};
