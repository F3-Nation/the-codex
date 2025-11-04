// src/app/api/import-lexicon/route.ts
import { initialExiconEntries } from "../../../lib/initalEntries"; // Only import exicon entries now
import {
  createSubmissionInDatabase,
  applyApprovedSubmissionToDatabase,
  fetchAllEntries,
} from "../../../lib/api";
import { getClient } from "../../../lib/db";
import { NextResponse } from "next/server";
import type {
  NewEntrySuggestionData,
  UserSubmissionBase,
} from "../../../lib/types";
import { PoolClient } from "pg";

// --- NEW IMPORTS FOR CSV HANDLING ---
import * as fs from "fs";
import csv from "csv-parser";
import path from "path"; // For path resolution
// --- END NEW IMPORTS ---

// --- NEW CONFIGURATION FOR CSV ---
const LEXICON_CSV_FILE_PATH = path.join(
  process.cwd(),
  "src",
  "data",
  "lexicon.csv",
); // Path to your lexicon CSV
const SUBMITTER_NAME = "Roma";
const SUBMITTER_EMAIL = "roma@f3nation.com";

interface CsvRow {
  Title: string;
  Text: string;
  // Add other columns if your CSV has them and you want to process them
}
// --- END NEW CONFIGURATION ---

// --- NEW HELPER FUNCTIONS FOR CSV ---
/**
 * Cleans up common "smart quotes", mojibake, and other problematic characters from text,
 * and escapes single quotes for SQL insertion.
 * This is a comprehensive cleaning function for all text going into the DB.
 * @param text The input string to clean.
 * @returns The cleaned and SQL-escaped string.
 */
function cleanForDbInsertion(text: string | null | undefined): string {
  if (typeof text !== "string") {
    return "";
  }
  let cleaned = text;
  // Replace common line breaks
  cleaned = cleaned.replace(/\r\n|\r/g, "\n");
  // Normalize spaces
  cleaned = cleaned.replace(/[ \t]+/g, " ");
  // Handle specific mojibake/smart quote characters
  cleaned = cleaned.replace(
    /â€™|ï¿½|â€<U+009D>|â€˜|â€œ|â€|â€“|â€”|Â´|`|´/gi,
    "'",
  );
  cleaned = cleaned.replace(/â€¦/g, "...");
  // Handle HTML <br> tags
  cleaned = cleaned.replace(/<br\s*\/?>/gi, "\n");
  // Normalize multiple newlines
  cleaned = cleaned.replace(/\n\s*\n/g, "\n\n");
  // Normalize multiple spaces again after other replacements
  cleaned = cleaned.replace(/\s\s+/g, " ");
  // Trim whitespace and escape single quotes for SQL
  return cleaned.trim().replace(/'/g, "''");
}

/**
 * Reads a CSV file and returns its content as an array of objects.
 * @param filePath The path to the CSV file.
 * @returns A Promise that resolves with an array of CsvRow objects.
 */
async function readCsvFile(filePath: string): Promise<CsvRow[]> {
  return new Promise((resolve, reject) => {
    const entries: CsvRow[] = [];
    fs.createReadStream(filePath)
      .pipe(
        csv({
          mapHeaders: ({ header }: { header: string }) => header.trim(), // Trim whitespace from headers
        }),
      )
      .on("data", (row: CsvRow) => entries.push(row))
      .on("end", () => {
        console.log(`Read ${entries.length} rows from ${filePath}.`);
        resolve(entries);
      })
      .on("error", (error: Error) => {
        console.error(`❌ Error reading CSV file ${filePath}:`, error.message);
        reject(error);
      });
  });
}
// --- END NEW HELPER FUNCTIONS ---

export async function POST() {
  let client: PoolClient | null = null;
  try {
    client = await getClient();
    console.log("Database client acquired.");

    // --- Wipe existing data before importing ---
    console.log(
      "Detected request to wipe and re-import. Deleting existing data...",
    );
    await client.query("DELETE FROM entry_tags;");
    await client.query("DELETE FROM entries;");
    await client.query("DELETE FROM user_submissions;");
    // Optional: If you also want to completely reset your tags table, uncomment this:
    // await client.query('DELETE FROM tags;');
    console.log("Existing data deleted.");
    // --- End wipe ---

    // Check for CSV file existence
    if (!fs.existsSync(LEXICON_CSV_FILE_PATH)) {
      console.error(
        `❌ Error: Lexicon CSV file not found at ${LEXICON_CSV_FILE_PATH}. Please check the path and ensure the file exists.`,
      );
      return NextResponse.json(
        {
          success: false,
          message: `Lexicon CSV file not found at ${LEXICON_CSV_FILE_PATH}.`,
        },
        { status: 500 },
      );
    }

    console.log("Proceeding with initial data import...");

    const csvLexiconEntries = await readCsvFile(LEXICON_CSV_FILE_PATH);

    const csvLexiconSubmissions: UserSubmissionBase<NewEntrySuggestionData>[] =
      csvLexiconEntries
        .map((row) => {
          const title = row.Title?.trim();
          const definition = cleanForDbInsertion(row.Text?.trim());

          if (!title || !definition) {
            console.warn(
              `⚠️ Skipping CSV row due to missing Title or Text:`,
              row,
            );
            return null;
          }

          return {
            submissionType: "new" as const,
            data: {
              name: title,
              description: definition,
              aliases: [] as string[], // <-- Change 1: Explicitly type aliases as string[]
              entryType: "lexicon",
            },
            submitterName: SUBMITTER_NAME,
            submitterEmail: SUBMITTER_EMAIL,
            status: "approved",
            timestamp: new Date().toISOString(),
          } as unknown as UserSubmissionBase<NewEntrySuggestionData>; // <-- Change 2: Double cast here
        })
        .filter(Boolean) as UserSubmissionBase<NewEntrySuggestionData>[];

    // Combine CSV-derived lexicon entries with hardcoded exicon entries
    const allInitialSubmissions: UserSubmissionBase<NewEntrySuggestionData>[] =
      [
        ...csvLexiconSubmissions, // Lexicon from CSV
        ...initialExiconEntries.map(
          (entry) =>
            ({
              // Exicon from hardcoded
              submissionType: "new" as const,
              data: {
                name: entry.name,
                description: entry.description,
                aliases: entry.aliases!.map((a) => a.name),
                entryType: entry.type,
                tags: entry.tags.map((t) => t.name),
                videoLink: entry.videoLink || "",
              },
              submitterName: SUBMITTER_NAME,
              submitterEmail: SUBMITTER_EMAIL,
              status: "approved",
              timestamp: new Date().toISOString(),
            }) as UserSubmissionBase<NewEntrySuggestionData>,
        ),
      ];

    let importedCount = 0;
    for (const submissionData of allInitialSubmissions) {
      const createdSubmission = await createSubmissionInDatabase({
        submissionType: submissionData.submissionType,
        data: submissionData.data,
        submitterName: submissionData.submitterName,
        submitterEmail: submissionData.submitterEmail,
      });

      await applyApprovedSubmissionToDatabase(createdSubmission);
      importedCount++;
    }

    console.log(
      `Successfully wiped and re-imported ${importedCount} initial entries.`,
    );
    return NextResponse.json(
      {
        success: true,
        message: `Successfully wiped and re-imported ${importedCount} initial entries.`,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error during wipe and initial lexicon import:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to wipe and import initial lexicon data. Check server logs.",
        error: error.message,
      },
      { status: 500 },
    );
  } finally {
    if (client) {
      client.release();
      console.log("Database client released.");
    }
  }
}
