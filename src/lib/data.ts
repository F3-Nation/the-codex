import type {
  ExiconEntry,
  LexiconEntry,
  Tag,
  AnyEntry,
  UserSubmission,
  NewEntrySuggestionData,
  EditEntrySuggestionData,
} from "./types";

// Helper function to clean text - might still be useful for processing input before DB.
export const cleanText = (text: string): string => {
  if (typeof text !== "string") return "";
  let cleaned = text;
  cleaned = cleaned.replace(/\r\n|\r/g, "\n");
  cleaned = cleaned.replace(/[ \t]+/g, " ");
  cleaned = cleaned.replace(
    /â€™|ï¿½|â€<U+009D>|â€˜|â€œ|â€|â€“|â€”|Â´|`|´/gi,
    "'",
  );
  cleaned = cleaned.replace(/â€¦/g, "...");
  cleaned = cleaned.replace(/<br\s*\/?>/gi, "\n");
  cleaned = cleaned.replace(/\n\s*\n/g, "\n\n");
  cleaned = cleaned.replace(/\s\s+/g, " ");
  return cleaned.trim();
};

// Helper function to parse aliases - might still be useful.
export const parseInitialAliases = (aliasesString?: string): string[] => {
  if (!aliasesString) return [];
  return aliasesString
    .split(";")
    .map((s) => cleanText(s.trim()))
    .filter(Boolean);
};

// Note: The initial data (exiconEntries, lexiconEntries, allTags) and their TSV parsing
// logic has been moved to the database migration files to seed the database.
// Functions like addTag, updateTag, deleteTag, getEntryById, applyApprovedSubmission,
// addOrUpdateEntry, deleteEntry, and getAllEntryNames are now handled by src/lib/api.ts
// which interacts with the database.

// userSubmissions will also be fetched from the database.

// The original TSV data strings and parsing logic are now primarily relevant for the
// one-time seeding process in the migrations. They are not actively used by the
// running application to serve data anymore.

// If new data needs to be imported via TSV in the future, similar parsing logic
// would be used in a script or admin tool that then calls the database API functions.
