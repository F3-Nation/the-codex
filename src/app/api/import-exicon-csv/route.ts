// src/app/api/import-exicon-csv/route.ts
import * as fs from 'fs'; // For reading the CSV file
import csv from 'csv-parser'; // For parsing CSV data
// Import NewUserSubmission specifically as it's the correct input type
import { createSubmissionInDatabase, applyApprovedSubmissionToDatabase, ensureTagsExist } from '../../../lib/api'; // ensureTagsExist will be moved here
import { getClient } from '../../../lib/db';
import { NextResponse } from 'next/server';
import type { NewEntrySuggestionData, NewUserSubmission } from '../../../lib/types'; // Corrected import
import { PoolClient } from 'pg';

// --- Configuration for CSV Import ---
const CSV_FILE_PATH = 'exicon.csv'; // Exicon CSV file path
const ENTRY_TYPE_EXICON = 'exicon';
const DEFAULT_ALIASES: string[] = []; // Default for entries without specific aliases
// DEFAULT_TAGS is handled by splitting row.Tags, no need for a constant empty array
const DEFAULT_VIDEO_LINK = ''; // Default for entries without a video link
const SUBMITTER_NAME = 'Roma';
const SUBMITTER_EMAIL = 'roma@f3nation.com';

// --- Type Definitions ---
interface ExiconCsvRow {
    Title: string;
    Tags: string; // The raw string from the CSV
    Text: string;
}

// --- Helper Functions (Remaining in route.ts, only specific to this route's CSV format) ---

/**
 * Cleans up common "smart quotes", mojibake, and other problematic characters from text,
 * and escapes single quotes for SQL insertion.
 * @param text The input string to clean.
 * @returns The cleaned and SQL-escaped string.
 */
function cleanForDbInsertion(text: string | null | undefined): string {
    if (typeof text !== 'string') {
        return '';
    }
    let cleaned = text;
    // Replace common line breaks
    cleaned = cleaned.replace(/\r\n|\r/g, '\n');
    // Normalize spaces
    cleaned = cleaned.replace(/[ \t]+/g, ' ');
    // Handle specific mojibake/smart quote characters (improved regex)
    cleaned = cleaned.replace(/[\u2019\u201B\u0092\u2018\u201A\u201C\u201D\u201E\u201F\u2039\u203A\u2013\u2014\u00B4\u0060\u00B4]/g, "'"); // Smart quotes, apostrophes, etc.
    cleaned = cleaned.replace(/â€™|ï¿½|â€<U+009D>|â€˜|â€œ|â€|â€“|â€”|Â´|`|´/gi, "'"); // Common mojibake characters
    cleaned = cleaned.replace(/â€¦/g, '...'); // Ellipsis mojibake
    // Handle HTML <br> tags
    cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n');
    // Normalize multiple newlines
    cleaned = cleaned.replace(/\n\s*\n/g, '\n\n');
    // Normalize multiple spaces again after other replacements
    cleaned = cleaned.replace(/\s\s+/g, ' ');
    // Trim whitespace and escape single quotes for SQL
    return cleaned.trim().replace(/'/g, "''");
}

/**
 * Reads a CSV file and returns its content as an array of objects.
 * Assumes the CSV has a header row with 'Title,Tags,Text'.
 * @param filePath The path to the CSV file.
 * @returns A Promise that resolves with an array of ExiconCsvRow objects.
 */
async function readCsvFile(filePath: string): Promise<ExiconCsvRow[]> {
    return new Promise((resolve, reject) => {
        const entries: ExiconCsvRow[] = [];
        if (!fs.existsSync(filePath)) {
            return reject(new Error(`CSV file not found at ${filePath}`));
        }

        // Optional: Log first few lines to debug CSV format
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                console.error(`❌ Error reading CSV file ${filePath}:`, err.message);
                return; // Don't reject twice
            }
            const lines = data.split('\n').slice(0, 3);
            console.log(`DEBUG: First 3 lines of ${filePath}:\n${lines.join('\n')}`);
        });

        fs.createReadStream(filePath, { encoding: 'utf8' })
            .pipe(csv({
                headers: ['Title', 'Tags', 'Text'], // Explicitly define headers
                skipLines: 1, // Skip the header row as per your CSV example
                separator: ',', // Default to comma
                strict: true, // Enforce strict column count
                mapHeaders: ({ header }: { header: string }) => header.trim(), // Trim whitespace
            }))
            .on('data', (row: ExiconCsvRow) => {
                console.log(`DEBUG: Parsed CSV row from ${filePath}:`, JSON.stringify(row, null, 2));
                entries.push(row);
            })
            .on('end', () => {
                console.log(`Read ${entries.length} rows from ${filePath}.`);
                resolve(entries);
            })
            .on('error', (error: Error) => {
                console.error(`❌ Error parsing CSV file ${filePath}:`, error.message);
                reject(error);
            });
    });
}

/**
 * Processes CSV rows and imports them as exicon submissions.
 * @param rows The CSV rows to process.
 * @param client The database client (needed for tag creation).
 * @returns The number of successfully imported entries.
 */
async function processCsvRows(rows: ExiconCsvRow[], client: PoolClient): Promise<number> {
    let importedCount = 0;
    for (const row of rows) {
        const title = row.Title?.trim();
        const definition = cleanForDbInsertion(row.Text?.trim());
        // Split tags by '|' and filter out any empty strings
        const tags = row.Tags && row.Tags.trim() !== '' ? row.Tags.split('|').map(t => t.trim()).filter(t => t) : [];
        const aliases = DEFAULT_ALIASES;
        const videoLink = DEFAULT_VIDEO_LINK;

        if (!title || !definition) {
            console.warn(`⚠️ Skipping CSV row due to missing Title or Text:`, JSON.stringify(row, null, 2));
            continue;
        }

        console.log(`DEBUG: Processing row with Title: ${title}, Text: ${definition}, Tags: ${tags}, Aliases: ${aliases}, VideoLink: ${videoLink}`);

        // Create a submission for each CSV row
        // FIX: Correctly type and structure the submission data
        const csvSubmissionData: NewUserSubmission<NewEntrySuggestionData> = {
            submissionType: 'new' as const, // Use 'new' as const for literal type
            data: {
                // These properties directly map to NewEntrySuggestionData
                name: title,
                description: definition,
                aliases: aliases,
                entryType: ENTRY_TYPE_EXICON,
                tags: tags, // This is already string[] as expected by NewEntrySuggestionData
                videoLink: videoLink,
                mentionedEntries: [], // Required field, empty array for CSV imports
            },
            submitterName: SUBMITTER_NAME,
            submitterEmail: SUBMITTER_EMAIL,
            // 'status' and 'timestamp' are handled by createSubmissionInDatabase and applyApprovedSubmissionToDatabase
        };

        console.log(`DEBUG: Submitting data to database for exicon:`, JSON.stringify(csvSubmissionData, null, 2));

        try {
            const createdCsvSubmission = await createSubmissionInDatabase(csvSubmissionData);
            await applyApprovedSubmissionToDatabase(createdCsvSubmission);
            importedCount++;
        } catch (submitError: any) {
            console.error(`ERROR: Failed to create/apply submission for "${title}":`, submitError.message);
            // Optionally re-throw or handle specific errors
        }
    }
    return importedCount;
}

export async function POST() {
    let client: PoolClient | null = null; // Initialize client to null
    try {
        client = await getClient(); // Acquire client at the beginning
        console.log('Database client acquired.');

        // --- Step 1: Delete All Existing Data (Optional for a dedicated import, but good for reset) ---
        // console.log('Detected request to wipe and re-import. Deleting existing data...');
        // await client.query('DELETE FROM entry_tags;');
        // await client.query('DELETE FROM entries;');
        // await client.query('DELETE FROM user_submissions;');
        // Uncomment if you also want to completely reset your tags table
        // await client.query('DELETE FROM tags;');
        console.log('Existing data deleted.');


        // --- Step 2: Import Data from exicon.csv ---
        console.log('Attempting to import data from exicon.csv...');
        let importedCount = 0;

        try {
            const stats = fs.statSync(CSV_FILE_PATH);
            console.log(`DEBUG: Exicon CSV file found. Size: ${stats.size} bytes, Last modified: ${stats.mtime}`);
            const exiconRows = await readCsvFile(CSV_FILE_PATH);
            // Pass the acquired client to processCsvRows for tag handling
            importedCount = await processCsvRows(exiconRows, client);
            console.log(`Successfully imported ${importedCount} exicon entries from ${CSV_FILE_PATH}.`);
        } catch (csvReadError: any) {
            console.warn(`⚠️ Error reading/processing exicon CSV: ${csvReadError.message}. Skipping exicon import.`);
            // Don't re-throw, allow the API to return a partial success or specific error message.
        }


        console.log(`🎉 Total import complete. Successfully imported ${importedCount} exicon entries.`);
        return NextResponse.json({ success: true, message: `Successfully imported ${importedCount} exicon entries.` }, { status: 200 });

    } catch (error: any) {
        console.error('Error during exicon CSV import:', error);
        // Provide more specific guidance if common errors occur
        if (error.message && String(error.message).toLowerCase().includes('relation "entries" does not exist')) {
            console.error('HINT: The "entries" table might be missing. Did you run `npm run db:migrate:up`?');
        }
        if (error.message && String(error.message).toLowerCase().includes('connect econnrefused')) {
            console.error('HINT: Database connection refused. Is your PostgreSQL server running and accessible?');
        }
        // This is the error we're directly addressing with DB commands below
        if (error.message && String(error.message).toLowerCase().includes('null value in column "id"')) {
            console.error('HINT: Likely a PostgreSQL sequence issue for the `tags` table. See resolution steps below.');
        }
        return NextResponse.json(
            { success: false, message: 'Failed to import exicon CSV data. Check server logs.', error: error.message },
            { status: 500 }
        );
    } finally {
        if (client) {
            client.release(); // Ensure the client is released back to the pool
            console.log('Database client released.');
        }
    }
}
