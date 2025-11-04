// src/lib/types.ts

// --- Core Entry Types ---

export interface Tag {
  id: string;
  name: string;
}

export interface Alias {
  id?: string;
  name: string;
}

export interface ReferencedEntry {
  id: string;
  name: string;
  description: string;
  type: "exicon" | "lexicon";
}

export interface BaseEntry {
  id: string;
  name: string;
  description: string;
  linkedDescriptionHtml?: string;
  aliases?: Alias[];
  references?: ReferencedEntry[];
  mentionedEntries?: string[];
  resolvedMentionsData?: Record<string, AnyEntry>;
}
export interface ExiconEntry extends BaseEntry {
  type: "exicon";
  tags: Tag[];
  videoLink?: string;
}

export interface LexiconEntry extends BaseEntry {
  type: "lexicon";
}

export type AnyEntry = ExiconEntry | LexiconEntry;

export type EntryWithReferences = AnyEntry & {
  references?: ReferencedEntry[];
  referencedBy?: ReferencedEntry[];
  resolvedMentionsData?: Record<string, AnyEntry>;
};

export type FilterLogic = "AND" | "OR";

// --- User Submission Types ---

// Data structure for suggesting a NEW entry
export interface NewEntrySuggestionData {
  name: string;
  description: string;
  aliases: string[];
  entryType: "exicon" | "lexicon";
  tags: string[];
  videoLink?: string;
  mentionedEntries: string[];
  id?: string;
  comments?: string;
  timestamp?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EditEntrySuggestionData {
  entryId: string;
  entryName: string;
  entryType: "exicon" | "lexicon";
  changes: {
    name?: string;
    description?: string;
    aliases?: string[];
    tags?: string[];
    videoLink?: string;
    mentionedEntries?: string[];
    entryType?: "exicon" | "lexicon";
    comments?: string;
  };
  comments?: string;
}

// This is the core structure stored in the `user_submissions` table.
export interface UserSubmissionBase<
  T = NewEntrySuggestionData | EditEntrySuggestionData,
> {
  id: number;
  submissionType: "new" | "edit";
  data: T;
  submitterName: string;
  submitterEmail: string;
  status: "pending" | "approved" | "rejected";
  timestamp: string;
  createdAt?: string;
  updatedAt?: string;
}

export type UserSubmission = UserSubmissionBase<
  NewEntrySuggestionData | EditEntrySuggestionData
>;

export type NewUserSubmission<
  T = NewEntrySuggestionData | EditEntrySuggestionData,
> = Omit<UserSubmissionBase<T>, "id" | "status" | "timestamp">;
