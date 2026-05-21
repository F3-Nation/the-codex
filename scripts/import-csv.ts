import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Client } = pg;

const KNOWN_TAGS = [
  // Multi-word tags first so they match before their component words
  "Full Body",
  "Warm-Up",
  "Arms",
  "Legs",
  "Core",
  "Cardio",
  "Partner",
  "Coupon",
  "Music",
  "Mosey",
  "Static",
  "Strength",
  "AMRAP",
  "EMOM",
  "Reps",
  "Timed",
  "Distance",
  "Routine",
  "Run",
  "Mary",
];

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let i = 0;
  const n = text.length;

  while (i < n) {
    const row: string[] = [];

    while (i < n && text[i] !== "\n" && text[i] !== "\r") {
      let field = "";
      if (text[i] === '"') {
        i++;
        while (i < n) {
          if (text[i] === '"') {
            if (text[i + 1] === '"') {
              field += '"';
              i += 2;
            } else {
              i++;
              break;
            }
          } else {
            field += text[i++];
          }
        }
      } else {
        while (i < n && text[i] !== "," && text[i] !== "\n" && text[i] !== "\r") {
          field += text[i++];
        }
      }
      row.push(field);
      if (text[i] === ",") i++;
    }

    if (text[i] === "\r") i++;
    if (text[i] === "\n") i++;

    if (row.length > 0 && !(row.length === 1 && row[0] === "")) {
      rows.push(row);
    }
  }

  return rows;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function stripTitlePrefix(title: string, text: string): string {
  if (text.startsWith(title)) {
    return text.slice(title.length).trimStart();
  }
  return text;
}

function extractTagsFromEnd(text: string): { definition: string; tags: string[] } {
  const found: string[] = [];
  let remaining = text.trimEnd();

  let changed = true;
  while (changed) {
    changed = false;
    for (const tag of KNOWN_TAGS) {
      if (remaining.endsWith(tag)) {
        found.unshift(tag);
        remaining = remaining.slice(0, -tag.length).trimEnd();
        changed = true;
      }
    }
  }

  return { definition: remaining, tags: found };
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const tagsResult = await client.query<{ id: string; name: string }>(
      "SELECT id, name FROM tags",
    );
    const tagMap = new Map<string, string>();
    for (const row of tagsResult.rows) {
      tagMap.set(row.name, row.id);
    }

    let inserted = 0;
    let failed = 0;

    // --- Exicon ---
    const exiconText = fs.readFileSync(
      path.resolve(process.cwd(), "exicon.csv"),
      "utf-8",
    );
    const exiconRows = parseCSV(exiconText).slice(1);

    for (const row of exiconRows) {
      const [title, tagsCol, rawText] = row;
      if (!title?.trim() || !rawText?.trim()) continue;

      const id = slugify(title.trim());
      const withoutTitle = stripTitlePrefix(title.trim(), rawText.trim());
      const { definition, tags: endTags } = extractTagsFromEnd(withoutTitle);

      const csvTags = tagsCol
        ? tagsCol.split(/[,\s]+/).filter((t) => t.length > 0)
        : [];
      const allTagNames = [...new Set([...endTags, ...csvTags])];

      try {
        await client.query(
          `INSERT INTO entries (id, title, definition, type, aliases)
           VALUES ($1, $2, $3, 'exicon', '[]')
           ON CONFLICT (id) DO NOTHING`,
          [id, title.trim(), definition],
        );

        for (const tagName of allTagNames) {
          const tagId = tagMap.get(tagName);
          if (tagId) {
            await client.query(
              `INSERT INTO entry_tags (entry_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
              [id, tagId],
            );
          }
        }
        inserted++;
      } catch (err) {
        console.error(`Failed to insert exicon "${title}":`, err);
        failed++;
      }
    }

    console.log(`Exicon: inserted ${inserted}, failed ${failed}`);
    inserted = 0;
    failed = 0;

    // --- Lexicon ---
    const lexiconText = fs.readFileSync(
      path.resolve(process.cwd(), "lexicon.csv"),
      "utf-8",
    );
    const lexiconRows = parseCSV(lexiconText).slice(1);

    for (const row of lexiconRows) {
      const [title, text] = row;
      if (!title?.trim() || !text?.trim()) continue;

      const id = `lex-${slugify(title.trim())}`;

      try {
        await client.query(
          `INSERT INTO entries (id, title, definition, type, aliases)
           VALUES ($1, $2, $3, 'lexicon', '[]')
           ON CONFLICT (id) DO NOTHING`,
          [id, title.trim(), text.trim()],
        );
        inserted++;
      } catch (err) {
        console.error(`Failed to insert lexicon "${title}":`, err);
        failed++;
      }
    }

    console.log(`Lexicon: inserted ${inserted}, failed ${failed}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
