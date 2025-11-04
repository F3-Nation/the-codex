const fs = require("fs");
const csv = require("csv-parser");
const { Client } = require("pg");

// PostgreSQL connection
const client = new Client({
  connectionString:
    "postgresql://postgres:pwordQ@mainline.proxy.rlwy.net:28582/railway",
});

// Configurable defaults
const TYPE = "lexicon";
const DEFAULT_ALIASES = [];
const DEFAULT_VIDEO_URL = "";
const SUBMITTER_NAME = "Roma";
const SUBMITTER_EMAIL = "roma@f3nation.com";

// 🧱 Ensure required tables exist
async function ensureSchema() {
  const schema = `
    CREATE TABLE IF NOT EXISTS entries (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      definition TEXT NOT NULL,
      type VARCHAR(50) NOT NULL,
      aliases JSONB DEFAULT '[]'::jsonb,
      video_url VARCHAR(255) DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS tags (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_submissions (
      id SERIAL PRIMARY KEY,
      submission_type VARCHAR(50) NOT NULL,
      data JSONB NOT NULL,
      submitter_name VARCHAR(255),
      submitter_email VARCHAR(255),
      timestamp TIMESTAMP NOT NULL DEFAULT now(),
      status VARCHAR(50) NOT NULL DEFAULT 'pending'
    );
  `;
  try {
    await client.query(schema);
    console.log("Database schema ensured.");
  } catch (error) {
    console.error("❌ Error ensuring database schema:", error);
    throw error; // Re-throw to halt execution
  }
}

async function insertEntry(title, definition) {
  try {
    const res = await client.query(
      `INSERT INTO entries (title, definition, type, aliases, video_url)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [
        title,
        definition,
        TYPE,
        JSON.stringify(DEFAULT_ALIASES),
        DEFAULT_VIDEO_URL,
      ],
    );
    if (res.rows.length) {
      console.log(
        `✅ Inserted entry for "${title}" with ID: ${res.rows[0].id}`,
      );
    } else {
      console.log(
        `⚠️ Entry for "${title}" already exists, skipping insertion.`,
      );
    }
    return res.rows.length ? res.rows[0].id : null;
  } catch (e) {
    console.error(`❌ Error inserting entry for "${title}":`, e.message);
    throw e; // Re-throw to handle errors in calling function
  }
}

async function insertSubmission(payload) {
  try {
    await client.query(
      `INSERT INTO user_submissions (submission_type, data, submitter_name, submitter_email)
       VALUES ($1, $2, $3, $4)`,
      ["xicon_upload", payload, SUBMITTER_NAME, SUBMITTER_EMAIL],
    );
    console.log(`✅ Inserted submission for "${payload.title}".`);
  } catch (error) {
    console.error(
      `❌ Error inserting submission for "${payload.title}":`,
      error.message,
    );
    throw error; // Re-throw to handle errors in calling function
  }
}

function cleanQuotes(text) {
  if (typeof text !== "string") {
    return "";
  }
  return text
    .replace(/â€™/g, `'`)
    .replace(/â€œ|â€/g, `"`)
    .replace(/â€”|â€“/g, "-")
    .replace(/â€/g, "")
    .replace(/\uFFFD/g, "");
}

async function readCsvFile(filePath) {
  return new Promise((resolve, reject) => {
    const entries = [];
    fs.createReadStream(filePath)
      .pipe(csv({ mapHeaders: ({ header }) => header.trim() }))
      .on("data", (row) => entries.push(row))
      .on("end", () => resolve(entries))
      .on("error", (error) => reject(error));
  });
}

async function processCSV(filePath) {
  try {
    await client.connect();
    console.log("Database connected.");

    await ensureSchema();

    const entries = await readCsvFile(filePath);
    console.log(`Read ${entries.length} entries from CSV.`);

    for (const row of entries) {
      const title = row["Title"]?.trim();
      const definition = cleanQuotes(row["Text"]?.trim() || "");
      const tags = []; // Lexicon has no tags

      if (!title || !definition) {
        console.warn(`⚠️ Skipping row with missing title or definition:`, row);
        continue;
      }

      // We don't need the entryId for the submission in this case,
      // but insertEntry still ensures the entry exists.
      await insertEntry(title, definition);

      const payload = {
        title,
        definition,
        type: TYPE,
        tags,
        aliases: DEFAULT_ALIASES,
        video_url: DEFAULT_VIDEO_URL,
      };

      await insertSubmission(payload);
    }

    console.log("🎉 Lexicon upload complete.");
  } catch (error) {
    console.error("❌ An error occurred during the CSV processing:", error);
  } finally {
    await client.end();
    console.log("Database connection closed.");
  }
}

// 🚀 Run it
(async () => {
  const filePath = "lexicon.csv"; // Make sure this is the correct path
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Error: File not found at ${filePath}`);
    process.exit(1); // Exit with an error code
  }
  await processCSV(filePath);
})();
