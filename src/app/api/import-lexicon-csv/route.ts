import * as fs from 'fs'; // For reading the CSV file
import csv from 'csv-parser'; // For parsing CSV data
import { createSubmissionInDatabase, applyApprovedSubmissionToDatabase } from '@/lib/api';
import { db } from '@/drizzle/db';
import { NextResponse } from 'next/server';
import type { NewEntrySuggestionData, UserSubmissionBase, NewUserSubmission } from '@/lib/types';
import { entries, entryTags, userSubmissions } from '@/drizzle/schema';


// --- Configuration for CSV Import ---
const CSV_FILE_PATH = 'lexicon.csv'; // Ensure this file is in your project's root directory
const ENTRY_TYPE_LEXICON = 'lexicon';
const DEFAULT_ALIASES: string[] = []; // Default for entries without specific aliases
const DEFAULT_VIDEO_LINK = ''; // Default for entries without a video link
const SUBMITTER_NAME = 'Roma';
const SUBMITTER_EMAIL = 'roma@f3nation.com';

// --- Type Definitions ---
interface CsvRow {
    Title: string;
    Text: string;
    // Add other columns if your CSV has them and you want to process them
}

// --- Helper Functions ---

/**
 * Cleans up common "smart quotes", mojibake, and other problematic characters from text,
 * and escapes single quotes for SQL insertion.
 * This is a comprehensive cleaning function for all text going into the DB.
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
    // Handle specific mojibake/smart quote characters
    cleaned = cleaned.replace(/â€™|ï¿½|â€<U+009D>|â€˜|â€œ|â€|â€“|â€”|Â´|`|´/gi, "'");
    cleaned = cleaned.replace(/â€¦/g, '...');
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
 * IMPORTANT: This version assumes the CSV has NO HEADER ROW and the first column is 'Title'
 * and the second is 'Text'. If your CSV has a header row, adjust `headers` and `skipLines`.
 * @param filePath The path to the CSV file.
 * @returns A Promise that resolves with an array of CsvRow objects.
 */
async function readCsvFile(filePath: string): Promise<CsvRow[]> {
    return new Promise((resolve, reject) => {
        const entries: CsvRow[] = [];
        fs.createReadStream(filePath)
            .pipe(csv({
                // Explicitly define headers if your CSV has no header row
                headers: ['Title', 'Text'], // Define headers explicitly
                // If your CSV *has* a header row, use: headers: true, skipLines: 1
                mapHeaders: ({ header }: { header: string }) => header.trim(), // Trim whitespace from headers
            }))
            .on('data', (row: CsvRow) => entries.push(row))
            .on('end', () => {
                console.log(`Read ${entries.length} rows from ${filePath}.`);
                resolve(entries);
            })
            .on('error', (error: Error) => {
                console.error(`❌ Error reading CSV file ${filePath}:`, error.message);
                reject(error);
            });
    });
}

export async function POST() {
    try {
        console.log('Detected request to wipe and re-import. Deleting existing data...');
        await db.delete(entryTags);
        await db.delete(entries);
        await db.delete(userSubmissions);
        // Optional: If you also want to completely reset your tags table, uncomment this:
        // await db.delete(tags);
        console.log('Existing data deleted.');

        // --- Step 2: Import Data from CSV File ---
        console.log('Attempting to import data from lexicon.csv...');
        let importedCount = 0;

        if (!fs.existsSync(CSV_FILE_PATH)) {
            console.warn(`⚠️ CSV file not found at ${CSV_FILE_PATH}. Skipping CSV import.`);
        } else {
            const csvRows = await readCsvFile(CSV_FILE_PATH);
            let csvImportedCount = 0;

            for (const row of csvRows) {
                const title = row.Title?.trim();
                const definition = cleanForDbInsertion(row.Text?.trim());

                if (!title || !definition) {
                    console.warn(`⚠️ Skipping CSV row due to missing Title or Text:`, row);
                    continue;
                }

                // Create a submission for each CSV row, treating them as lexicon entries
                const csvSubmissionData: NewUserSubmission<NewEntrySuggestionData> = {
                    submissionType: 'new',
                    data: {
                        entryType: ENTRY_TYPE_LEXICON,
                        name: title,
                        description: definition,
                        aliases: DEFAULT_ALIASES,
                        tags: [],
                        videoLink: DEFAULT_VIDEO_LINK,
                        mentionedEntries: [],
                    },
                    submitterName: SUBMITTER_NAME,
                    submitterEmail: SUBMITTER_EMAIL
                };

                const createdCsvSubmission = await createSubmissionInDatabase(csvSubmissionData);
                await applyApprovedSubmissionToDatabase(createdCsvSubmission);
                csvImportedCount++;
            }
            importedCount += csvImportedCount;
            console.log(`Successfully imported ${csvImportedCount} entries from ${CSV_FILE_PATH}.`);
        }

        console.log(`🎉 Total import complete. Successfully wiped and re-imported ${importedCount} entries.`);
        return NextResponse.json({ success: true, message: `Successfully wiped and re-imported ${importedCount} total entries.` }, { status: 200 });

    } catch (error: any) {
        console.error('Error during wipe and CSV import:', error);
        // Provide more specific guidance if common errors occur
        if (error.message && String(error.message).toLowerCase().includes('relation "entries" does not exist')) {
            console.error('HINT: The "entries" table might be missing. Did you run `npm run db:migrate:up`?');
        }
        if (error.message && String(error.message).toLowerCase().includes('connect econnrefused')) {
            console.error('HINT: Database connection refused. Is your PostgreSQL server running and accessible?');
        }
        return NextResponse.json(
            { success: false, message: 'Failed to wipe and import CSV data. Check server logs.', error: error.message },
            { status: 500 }
        );
    } finally {
        // No need to release client with Drizzle
    }
}
