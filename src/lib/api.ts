// src/lib/api.ts
import "server-only";
import { db } from "@/drizzle/db";
import {
  entries,
  tags as tagsTable,
  entryTags,
  entryReferences,
  userSubmissions as userSubmissionsTable,
} from "@/drizzle/schema";
import {
  and,
  asc,
  eq,
  inArray,
  sql,
} from "drizzle-orm";
import type {
  AnyEntry,
  ExiconEntry,
  Tag,
  NewEntrySuggestionData,
  EditEntrySuggestionData,
  UserSubmissionBase,
  Alias,
  ReferencedEntry,
  EntryWithReferences,
  NewUserSubmission,
} from "@/lib/types";

// --- Utilities & Mappers ---

type DBLike = typeof db;

function toAliasArray(raw: unknown): Alias[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((a) => {
        if (!a) return null;
        if (typeof a === "string") return { name: a };
        if (typeof a === "object" && "name" in (a as any)) {
          const n = (a as any).name;
          if (typeof n === "string" && n.trim() !== "") return { name: n };
        }
        return null;
      })
      .filter(Boolean) as Alias[];
  }
  // If stored as object accidentally
  if (typeof raw === "object" && raw !== null) {
    const maybe = raw as any;
    if (Array.isArray(maybe.aliases)) return toAliasArray(maybe.aliases);
  }
  return [];
}

function toMentionedEntries(raw: unknown): string[] {
  if (!raw) return [];
  try {
    if (Array.isArray(raw)) {
      return raw.map((v) => (typeof v === "number" ? String(v) : String(v)));
    }
    if (typeof raw === "string") {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr.map((v) => String(v));
    }
  } catch {
    // ignore parse errors, return []
  }
  return [];
}

export function toAnyEntryBase(row: {
  id: number;
  title: string;
  definition: string;
  type: "exicon" | "lexicon" | string;
  aliases: unknown;
  video_link: string | null;
  mentioned_entries: unknown;
}): Omit<AnyEntry, "tags"> & Partial<Pick<ExiconEntry, "tags">> {
  return {
    id: String(row.id),
    name: row.title,
    description: row.definition,
    type: row.type as "exicon" | "lexicon",
    aliases: toAliasArray(row.aliases),
    videoLink: row.video_link ?? undefined,
    mentionedEntries: toMentionedEntries(row.mentioned_entries),
  } as any;
}

export function withTags<T extends Omit<AnyEntry, "tags">>(
  entry: T,
  tags: Tag[],
): AnyEntry {
  if (entry.type === "exicon") {
    return {
      ...(entry as any),
      tags,
    } as ExiconEntry;
  }
  return entry as AnyEntry;
}

function toReferencedEntry(row: {
  id: number;
  title: string;
  definition: string;
  type: "exicon" | "lexicon" | string;
}): ReferencedEntry {
  return {
    id: String(row.id),
    name: row.title,
    description: row.definition,
    type: row.type as "exicon" | "lexicon",
  };
}

async function getEntryTagsMapForIds(
  ids: number[],
  cx: DBLike = db,
): Promise<Map<number, Tag[]>> {
  if (ids.length === 0) return new Map();
  const tagRows = await cx
    .select({
      entryId: entryTags.entry_id,
      tagId: tagsTable.id,
      tagName: tagsTable.name,
    })
    .from(entryTags)
    .leftJoin(tagsTable, eq(entryTags.tag_id, tagsTable.id))
    .where(inArray(entryTags.entry_id, ids));

  const map = new Map<number, Tag[]>();
  for (const r of tagRows) {
    const list = map.get(r.entryId) ?? [];
    if (r.tagId != null && r.tagName != null) {
      list.push({ id: String(r.tagId), name: r.tagName });
    }
    map.set(r.entryId, list);
  }
  return map;
}

async function getOutgoingReferencesMap(
  ids: number[],
  cx: DBLike = db,
): Promise<Map<number, ReferencedEntry[]>> {
  if (ids.length === 0) return new Map();
  const rows = await cx
    .select({
      sourceId: entryReferences.source_entry_id,
      id: entries.id,
      title: entries.title,
      definition: entries.definition,
      type: entries.type,
    })
    .from(entryReferences)
    .innerJoin(entries, eq(entryReferences.target_entry_id, entries.id))
    .where(inArray(entryReferences.source_entry_id, ids));

  const map = new Map<number, ReferencedEntry[]>();
  for (const r of rows) {
    const list = map.get(r.sourceId) ?? [];
    list.push(toReferencedEntry(r));
    map.set(r.sourceId, list);
  }
  return map;
}

async function getIncomingReferencesMap(
  ids: number[],
  cx: DBLike = db,
): Promise<Map<number, ReferencedEntry[]>> {
  if (ids.length === 0) return new Map();
  const rows = await cx
    .select({
      targetId: entryReferences.target_entry_id,
      id: entries.id,
      title: entries.title,
      definition: entries.definition,
      type: entries.type,
    })
    .from(entryReferences)
    .innerJoin(entries, eq(entryReferences.source_entry_id, entries.id))
    .where(inArray(entryReferences.target_entry_id, ids));

  const map = new Map<number, ReferencedEntry[]>();
  for (const r of rows) {
    const list = map.get(r.targetId) ?? [];
    list.push(toReferencedEntry(r));
    map.set(r.targetId, list);
  }
  return map;
}

async function getEntriesByIdsWithTags(
  ids: number[],
  cx: DBLike = db,
): Promise<Record<string, AnyEntry>> {
  if (ids.length === 0) return {};
  const rows = await cx
    .select()
    .from(entries)
    .where(inArray(entries.id, ids));
  const tagMap = await getEntryTagsMapForIds(ids, cx);

  const out: Record<string, AnyEntry> = {};
  for (const row of rows) {
    const base = toAnyEntryBase(row);
    const withT = withTags(base, tagMap.get(row.id) ?? []);
    out[String(row.id)] = withT;
    out[row.title] = withT;

    // index by alias names too
    if (withT.aliases && Array.isArray(withT.aliases)) {
      for (const alias of withT.aliases) {
        if (alias && alias.name) out[alias.name] = withT;
      }
    }
  }
  return out;
}

// --- Core Reference Handling Functions ---

export async function getEntryIdByName(
  name: string,
  cx: DBLike = db,
): Promise<string | null> {
  const result = await cx
    .select({ id: entries.id })
    .from(entries)
    .where(sql`LOWER(${entries.title}) = LOWER(${name})`)
    .limit(1);
  return result[0]?.id != null ? String(result[0].id) : null;
}

export async function insertEntryReference(
  sourceEntryId: string,
  targetEntryId: string,
  cx: DBLike = db,
) {
  if (sourceEntryId === targetEntryId) return;
  const src = parseInt(sourceEntryId, 10);
  const tgt = parseInt(targetEntryId, 10);
  if (!Number.isFinite(src) || !Number.isFinite(tgt)) return;

  await cx
    .insert(entryReferences)
    .values({ source_entry_id: src, target_entry_id: tgt })
    .onConflictDoNothing();
}

export const deleteTagFromDatabase = async (id: string): Promise<void> => {
  try {
    const result = await db
      .delete(tagsTable)
      .where(eq(tagsTable.id, parseInt(id, 10)))
      .returning({ deletedId: tagsTable.id });
    if (result.length === 0) {
      throw new Error(`Tag with ID ${id} not found.`);
    }
  } catch (err) {
    console.error(`Error deleting tag with ID ${id}:`, err);
    throw err;
  }
};

export async function deleteReferencesForEntry(
  sourceEntryId: string,
  cx: DBLike = db,
): Promise<void> {
  try {
    const src = parseInt(sourceEntryId, 10);
    if (!Number.isFinite(src)) return;
    await cx.delete(entryReferences).where(eq(entryReferences.source_entry_id, src));
  } catch (error) {
    console.error(
      `Error deleting references for entry ID ${sourceEntryId}:`,
      (error as Error).message,
    );
    throw error;
  }
}

export async function deleteEntryReferences(
  sourceEntryId: string,
  cx: DBLike = db,
) {
  const src = parseInt(sourceEntryId, 10);
  if (!Number.isFinite(src)) return;
  await cx.delete(entryReferences).where(eq(entryReferences.source_entry_id, src));
}

/**
 * Processes a description string, extracts @references, resolves them, and saves them to the database.
 * This function handles both creating new references and updating existing ones (by clearing and re-adding).
 */
export async function processAndSaveReferences(
  entryId: string,
  description: string,
  providedMentionedEntries?: string[],
  cx: DBLike = db,
): Promise<string[]> {
  try {
    let mentionedNames: string[] = [];
    let resolvedReferences: { name: string; id: string }[] = [];
    let mentionedEntryIds: string[] = [];

    if (providedMentionedEntries && providedMentionedEntries.length > 0) {
      const intIds = providedMentionedEntries
        .map((s) => parseInt(s, 10))
        .filter((n) => Number.isFinite(n));

      if (intIds.length > 0) {
        const entriesResult = await cx
          .select({ id: entries.id, title: entries.title })
          .from(entries)
          .where(inArray(entries.id, intIds));
        const idToTitle = new Map(entriesResult.map((r) => [String(r.id), r.title]));
        resolvedReferences = providedMentionedEntries
          .map((id) => {
            const title = idToTitle.get(id);
            return title ? { name: title, id } : null;
          })
          .filter(Boolean) as { name: string; id: string }[];

        mentionedNames = resolvedReferences.map((r) => r.name);
        mentionedEntryIds = resolvedReferences.map((r) => r.id);
      }
    } else {
      const mentionRegex =
        /@([A-Za-z0-9][A-Za-z0-9\s_.-]*[A-Za-z0-9])(?=\s|$|[,.!?;:])/g;
      const rawNames = Array.from(description.matchAll(mentionRegex)).map((m) =>
        m[1].trim(),
      );
      // unique
      mentionedNames = [...new Set(rawNames)];

      const resolved = await Promise.all(
        mentionedNames.map(async (n) => {
          const id = await getEntryIdByName(n, cx);
          return id ? { name: n, id } : null;
        }),
      );

      resolvedReferences = resolved.filter(Boolean) as { name: string; id: string }[];
      mentionedEntryIds = resolvedReferences.map((r) => r.id);
    }

    // Persist mentioned_entries (as an array of string ids)
    const idInt = parseInt(entryId, 10);
    await cx
      .update(entries)
      .set({ mentioned_entries: mentionedEntryIds })
      .where(eq(entries.id, idInt));

    // Recreate entry_references
    await deleteEntryReferences(entryId, cx);
    for (const ref of resolvedReferences) {
      if (ref.id !== entryId) {
        await insertEntryReference(entryId, ref.id, cx);
      }
    }

    return mentionedNames;
  } catch (error) {
    console.error(`Error processing and saving references for entry ${entryId}:`, error);
    throw error;
  }
}

// --- Entry Management Functions ---

export const fetchAllEntries = async (): Promise<EntryWithReferences[]> => {
  try {
    const rows = await db.select().from(entries).orderBy(asc(entries.title));
    const ids = rows.map((r) => r.id);

    const tagMap = await getEntryTagsMapForIds(ids, db);
    const outgoingMap = await getOutgoingReferencesMap(ids, db);
    const incomingMap = await getIncomingReferencesMap(ids, db);

    const result: AnyEntry[] = [];
    for (const row of rows) {
      const base = toAnyEntryBase(row);
      const withT = withTags(base, tagMap.get(row.id) ?? []);
      const outgoing = outgoingMap.get(row.id) ?? [];
      const incoming = incomingMap.get(row.id) ?? [];

      // Resolve mentioned entries data for this entry
      let resolvedMentionsData: Record<string, AnyEntry> | undefined = undefined;
      const mentioned = withT.mentionedEntries ?? [];
      if (mentioned.length > 0) {
        const mentionedIntIds = mentioned
          .map((s) => parseInt(s, 10))
          .filter((n) => Number.isFinite(n));
        const resolved = await getEntriesByIdsWithTags(mentionedIntIds, db);
        if (Object.keys(resolved).length > 0) {
          resolvedMentionsData = resolved;
        }
      }

      result.push({
        ...withT,
        references: outgoing,
        referencedBy: incoming,
        ...(resolvedMentionsData ? { resolvedMentionsData } : {}),
      } as EntryWithReferences);
    }

    return result;
  } catch (err: any) {
    const errorMessage = err.message ? String(err.message).toLowerCase() : "";
    if (errorMessage.includes('relation "entries" does not exist')) {
      const detailedErrorMsg =
        'CRITICAL SERVER LOG: The "entries" table was not found. This means migrations have likely not run or failed. \n1. TRIPLE-CHECK your DATABASE_URL in your .env file. \n2. Ensure PostgreSQL server is running. \n3. Run `npm run db:migrate:up` and WATCH FOR ERRORS in the terminal. \n4. Verify `pgmigrations` table in your database. Error details: ' +
        err.stack;
      console.error(detailedErrorMsg);
      throw new Error(
        'DATABASE SETUP ERROR: The "entries" table is MISSING. This is NOT a code bug in this function. FIX: 1. Verify DATABASE_URL in .env. 2. Run `npm run db:migrate:up` AND CHECK ITS OUTPUT FOR ERRORS. See server logs for more details.',
      );
    }
    console.error("Error fetching all entries from database:", err);
    throw err;
  }
};

export const getEntryByIdFromDatabase = async (
  id: string | number,
  cx: DBLike = db,
): Promise<EntryWithReferences | null> => {
  const intId = parseInt(String(id), 10);
  if (!Number.isFinite(intId)) return null;

  try {
    const rows = await cx.select().from(entries).where(eq(entries.id, intId)).limit(1);
    if (rows.length === 0) return null;

    const row = rows[0];
    const base = toAnyEntryBase(row);

    // tags
    const tagMap = await getEntryTagsMapForIds([intId], cx);
    const withT = withTags(base, tagMap.get(intId) ?? []);

    // outgoing and incoming references
    const outgoingMap = await getOutgoingReferencesMap([intId], cx);
    const incomingMap = await getIncomingReferencesMap([intId], cx);

    let resolvedMentionsData: Record<string, AnyEntry> | undefined = undefined;
    const mentioned = withT.mentionedEntries ?? [];
    if (mentioned.length > 0) {
      const mentionedIntIds = mentioned
        .map((s) => parseInt(s, 10))
        .filter((n) => Number.isFinite(n));
      const resolved = await getEntriesByIdsWithTags(mentionedIntIds, cx);
      if (Object.keys(resolved).length > 0) {
        resolvedMentionsData = resolved;
      }
    }

    return {
      ...withT,
      references: outgoingMap.get(intId) ?? [],
      referencedBy: incomingMap.get(intId) ?? [],
      ...(resolvedMentionsData ? { resolvedMentionsData } : {}),
    };
  } catch (err) {
    console.error(`Error fetching entry with ID ${id}:`, err);
    throw err;
  }
};

export const updateEntryInDatabase = async (
  entry: AnyEntry,
): Promise<AnyEntry> => {
  return await db.transaction(async (tx) => {
    const { id, name, description, type } = entry;
    const intId = parseInt(String(id), 10);
    if (!Number.isFinite(intId)) {
      throw new Error(`Invalid entry id: ${id}`);
    }

    const videoLink =
      type === "exicon" ? (entry as ExiconEntry).videoLink ?? null : null;

    const aliasesToStore = Array.isArray(entry.aliases)
      ? entry.aliases
          .map((a) => (typeof a === "string" ? { name: a } : a))
          .filter((a) => a && a.name && a.name.trim() !== "")
      : [];

    await tx
      .update(entries)
      .set({
        title: name,
        definition: description,
        type,
        aliases: aliasesToStore,
        video_link: videoLink,
        updated_at: sql`NOW()`,
        // temporarily clear mentioned entries; process again below
        mentioned_entries: [],
      })
      .where(eq(entries.id, intId));

    if (type === "exicon") {
      // replace tag associations
      await tx.delete(entryTags).where(eq(entryTags.entry_id, intId));

      const tagNames = (entry as ExiconEntry).tags?.map((t) => t.name) ?? [];
      if (tagNames.length > 0) {
        const ensured = await ensureTagsExist(tagNames, tx);
        const tagIds = ensured
          .map((t) => parseInt(t.id, 10))
          .filter((n) => Number.isFinite(n));

        if (tagIds.length > 0) {
          const values = tagIds.map((tid) => ({
            entry_id: intId,
            tag_id: tid,
          }));
          await tx.insert(entryTags).values(values).onConflictDoNothing();
        }
      }
    }

    const mentionedEntries = entry.mentionedEntries;
    await processAndSaveReferences(String(intId), description, mentionedEntries, tx);

    const updated = await getEntryByIdFromDatabase(intId, tx);
    if (!updated) throw new Error(`Failed to retrieve updated entry with ID ${id}`);
    return updated;
  });
};

export const deleteEntryFromDatabase = async (
  id: string | number,
): Promise<void> => {
  const intId = parseInt(String(id), 10);
  if (!Number.isFinite(intId)) return;

  await db.transaction(async (tx) => {
    // with onDelete: "cascade" the references and tags will be removed automatically
    await tx.delete(entries).where(eq(entries.id, intId));
  });
};

export const getAllEntryNamesFromDatabase = async (): Promise<string[]> => {
  const rows = await db
    .select({ title: entries.title })
    .from(entries)
    .orderBy(asc(entries.title));
  return rows.map((r) => r.title);
};

// --- Tag Management Functions ---

export const fetchTagsFromDatabase = async (): Promise<Tag[]> => {
  const rows = await db
    .select({ id: tagsTable.id, name: tagsTable.name })
    .from(tagsTable)
    .orderBy(asc(tagsTable.name));
  return rows.map((r) => ({ id: String(r.id), name: r.name }));
};

export const createTagInDatabase = async (name: string): Promise<Tag> => {
  try {
    const res = await db
      .insert(tagsTable)
      .values({ name })
      .returning({ id: tagsTable.id, name: tagsTable.name });
    return { id: String(res[0].id), name: res[0].name };
  } catch (err: any) {
    // unique_violation
    if (err?.code === "23505") {
      throw new Error(`Tag "${name}" already exists.`);
    }
    console.error("Error creating tag in database:", err);
    throw err;
  }
};

export const updateTagInDatabase = async (
  id: string,
  name: string,
): Promise<Tag> => {
  const intId = parseInt(id, 10);
  if (!Number.isFinite(intId)) throw new Error(`Invalid tag id: ${id}`);

  try {
    const res = await db
      .update(tagsTable)
      .set({ name })
      .where(eq(tagsTable.id, intId))
      .returning({ id: tagsTable.id, name: tagsTable.name });
    if (res.length === 0) {
      throw new Error(`Tag with ID ${id} not found for update.`);
    }
    return { id: String(res[0].id), name: res[0].name };
  } catch (err: any) {
    if (err?.code === "23505") {
      throw new Error(`Another tag with name "${name}" already exists.`);
    }
    console.error("Error updating tag in database:", err);
    throw err;
  }
};

export async function ensureTagsExist(
  tagNames: string[],
  cx: DBLike = db,
): Promise<Tag[]> {
  const ensured: Tag[] = [];
  const valid = tagNames.map((t) => t?.trim()).filter((t) => !!t) as string[];
  if (valid.length === 0) return ensured;

  // existing
  const existing = await cx
    .select({ id: tagsTable.id, name: tagsTable.name })
    .from(tagsTable)
    .where(inArray(tagsTable.name, valid));

  const map = new Map<string, Tag>();
  for (const row of existing) {
    map.set(row.name, { id: String(row.id), name: row.name });
  }

  const toInsert = valid.filter((n) => !map.has(n));
  if (toInsert.length > 0) {
    await cx
      .insert(tagsTable)
      .values(toInsert.map((name) => ({ name })))
      .onConflictDoNothing();

    const all = await cx
      .select({ id: tagsTable.id, name: tagsTable.name })
      .from(tagsTable)
      .where(inArray(tagsTable.name, valid));

    for (const row of all) {
      map.set(row.name, { id: String(row.id), name: row.name });
    }
  }

  for (const n of valid) {
    const t = map.get(n);
    if (t) ensured.push(t);
    else console.error(`ERROR: Tag "${n}" not found or created.`);
  }
  return ensured;
}

// --- Submission Management Functions ---

export const fetchPendingSubmissionsFromDatabase = async (): Promise<
  UserSubmissionBase<any>[]
> => {
  const rows = await db
    .select({
      id: userSubmissionsTable.id,
      submission_type: userSubmissionsTable.submission_type,
      data: userSubmissionsTable.data,
      submitter_name: userSubmissionsTable.submitter_name,
      submitter_email: userSubmissionsTable.submitter_email,
      status: userSubmissionsTable.status,
      timestamp: userSubmissionsTable.timestamp,
    })
    .from(userSubmissionsTable)
    .where(eq(userSubmissionsTable.status, "pending"))
    .orderBy(asc(userSubmissionsTable.timestamp));

  return rows.map((r) => ({
    id: Number(r.id),
    submissionType: r.submission_type as "new" | "edit",
    data: r.data,
    submitterName: r.submitter_name ?? undefined,
    submitterEmail: r.submitter_email ?? undefined,
    status: r.status as "pending" | "approved" | "rejected",
    timestamp: r.timestamp?.toISOString?.() ?? String(r.timestamp),
  }));
};

export async function createSubmissionInDatabase(
  submission: NewUserSubmission<NewEntrySuggestionData | EditEntrySuggestionData>,
): Promise<UserSubmissionBase<NewEntrySuggestionData | EditEntrySuggestionData>> {
  const { submissionType, data, submitterName, submitterEmail } = submission;

  if (submissionType !== "new" && submissionType !== "edit") {
    throw new Error(`Unknown submission type: ${submissionType}`);
  }

  const res = await db
    .insert(userSubmissionsTable)
    .values({
      submission_type: submissionType,
      data,
      submitter_name: submitterName ?? null,
      submitter_email: submitterEmail ?? null,
      status: "pending",
      timestamp: sql`NOW()`,
    })
    .returning({
      id: userSubmissionsTable.id,
      submission_type: userSubmissionsTable.submission_type,
      data: userSubmissionsTable.data,
      submitter_name: userSubmissionsTable.submitter_name,
      submitter_email: userSubmissionsTable.submitter_email,
      status: userSubmissionsTable.status,
      timestamp: userSubmissionsTable.timestamp,
    });

  const row = res[0];
  return {
    id: Number(row.id),
    submissionType: row.submission_type as "new" | "edit",
    data: row.data as any,
    submitterName: row.submitter_name ?? undefined,
    submitterEmail: row.submitter_email ?? undefined,
    status: row.status as "pending" | "approved" | "rejected",
    timestamp: row.timestamp?.toISOString?.() ?? String(row.timestamp),
  };
}

export const updateSubmissionStatusInDatabase = async (
  id: number,
  status: "pending" | "approved" | "rejected",
): Promise<void> => {
  await db
    .update(userSubmissionsTable)
    .set({ status, updated_at: sql`NOW()` })
    .where(eq(userSubmissionsTable.id, id));
};

export async function applyApprovedSubmissionToDatabase(
  submission: UserSubmissionBase<any>,
): Promise<AnyEntry> {
  if (submission.submissionType === "new") {
    const newEntryData = submission.data as NewEntrySuggestionData & {
      mentionedEntries?: string[];
    };

    const createdEntry = await createEntryInDatabase(newEntryData);

    await db
      .update(userSubmissionsTable)
      .set({ status: "approved", updated_at: sql`NOW()` })
      .where(eq(userSubmissionsTable.id, submission.id));

    return createdEntry;
  }

  // edit flow
  const editEntryData = submission.data as EditEntrySuggestionData;

  return await db.transaction(async (tx) => {
    const targetId = parseInt(editEntryData.entryId, 10);
    if (!Number.isFinite(targetId)) {
      throw new Error(`Original entry with ID ${editEntryData.entryId} not found for edit submission.`);
    }

    const existingRows = await tx
      .select()
      .from(entries)
      .where(eq(entries.id, targetId))
      .limit(1);
    if (existingRows.length === 0) {
      throw new Error(`Original entry with ID ${editEntryData.entryId} not found for edit submission.`);
    }
    const existing = existingRows[0];

    // Build updated values
    const changes = editEntryData.changes;
    const updatedName = changes.name ?? existing.title;
    const updatedDescription = changes.description ?? existing.definition;
    const updatedType = changes.entryType ?? (existing.type as "exicon" | "lexicon");

    const updatedAliasesArray =
      changes.aliases != null
        ? changes.aliases.map((n) => ({ name: n }))
        : toAliasArray(existing.aliases);

    const updatedVideoLink =
      (changes.videoLink ?? existing.video_link) ??
      null;

    await tx
      .update(entries)
      .set({
        title: updatedName,
        definition: updatedDescription,
        type: updatedType,
        aliases: updatedAliasesArray.filter((a) => a.name?.trim() !== ""),
        video_link: updatedType === "exicon" ? updatedVideoLink : null,
        updated_at: sql`NOW()`,
      })
      .where(eq(entries.id, targetId));

    if (updatedType === "exicon") {
      await tx.delete(entryTags).where(eq(entryTags.entry_id, targetId));

      const tagNames =
        changes.tags != null ? changes.tags : (await getEntryTagsMapForIds([targetId], tx)).get(targetId)?.map((t) => t.name) ?? [];
      if (tagNames.length > 0) {
        const ensured = await ensureTagsExist(tagNames, tx);
        const values = ensured
          .map((t) => parseInt(t.id, 10))
          .filter((n) => Number.isFinite(n))
          .map((tid) => ({ entry_id: targetId, tag_id: tid }));
        if (values.length > 0) {
          await tx.insert(entryTags).values(values).onConflictDoNothing();
        }
      }
    } else {
      // if switching to lexicon, clear any tags
      await tx.delete(entryTags).where(eq(entryTags.entry_id, targetId));
    }

    const mentionedEntries =
      changes.mentionedEntries ??
      toMentionedEntries(existing.mentioned_entries);

    await processAndSaveReferences(
      String(targetId),
      updatedDescription,
      mentionedEntries,
      tx,
    );

    await tx
      .update(userSubmissionsTable)
      .set({ status: "approved", updated_at: sql`NOW()` })
      .where(eq(userSubmissionsTable.id, submission.id));

    const final = await getEntryByIdFromDatabase(targetId, tx);
    if (!final) {
      throw new Error("Failed to retrieve updated entry with references.");
    }
    return final;
  });
}

export const createEntryInDatabase = async (
  entry: NewEntrySuggestionData & { id?: string; mentionedEntries?: string[] },
): Promise<AnyEntry> => {
  return await db.transaction(async (tx) => {
    const { name, description, entryType, aliases, videoLink, tags, mentionedEntries } =
      entry;

    const aliasesToStore: Alias[] = Array.isArray(aliases)
      ? aliases
          .map((a) => (typeof a === "string" ? { name: a.trim() } : a))
          .filter((a) => a && a.name && a.name.trim() !== "")
      : [];

    // Insert entry, letting DB generate ID
    const inserted = await tx
      .insert(entries)
      .values({
        title: name,
        definition: description,
        type: entryType,
        aliases: aliasesToStore,
        video_link: entryType === "exicon" ? (videoLink ?? null) : null,
        mentioned_entries: [],
      })
      .returning({ id: entries.id });

    const newId = inserted[0].id;

    // Tags
    if (entryType === "exicon" && tags && tags.length > 0) {
      const ensured = await ensureTagsExist(tags, tx);
      const values = ensured
        .map((t) => parseInt(t.id, 10))
        .filter((n) => Number.isFinite(n))
        .map((tid) => ({ entry_id: newId, tag_id: tid }));
      if (values.length > 0) {
        await tx.insert(entryTags).values(values).onConflictDoNothing();
      }
    }

    // References
    await processAndSaveReferences(String(newId), description, mentionedEntries, tx);

    const created = await getEntryByIdFromDatabase(newId, tx);
    if (!created) {
      throw new Error(`Failed to retrieve created entry with ID ${newId}`);
    }
    return created;
  });
};

export async function searchEntriesByName(
  query: string,
): Promise<AnyEntry[]> {
  if (!query || query.trim() === "") return [];

  const trimmed = query.trim().toLowerCase();
  const likeAll = `%${trimmed}%`;
  const startsWith = `${trimmed}%`;

  // Compute priority similar to the original query, using Drizzle SQL fragments
  const priorityExpr = sql<number>`
    CASE 
      WHEN LOWER(${entries.title}) = ${trimmed} THEN 1
      WHEN LOWER(${entries.title}) = ${trimmed} THEN 1
      WHEN ${trimmed} = ANY(string_to_array(LOWER(${entries.title}), ' ')) THEN 
        CASE WHEN LOWER(${entries.title}) LIKE '%' || ${trimmed} THEN 2 ELSE 3 END
      WHEN LOWER(${entries.title}) LIKE ${startsWith} THEN 4
      WHEN EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(${entries.aliases}::jsonb) AS alias_elem
        WHERE LOWER(alias_elem) = ${trimmed}
      ) THEN 5
      WHEN EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(${entries.aliases}::jsonb) AS alias_elem
        WHERE ${trimmed} = ANY(string_to_array(LOWER(alias_elem), ' '))
      ) THEN 
        CASE WHEN EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(${entries.aliases}::jsonb) AS alias_elem
          WHERE LOWER(alias_elem) LIKE '%' || ${trimmed}
        ) THEN 6 ELSE 7 END
      WHEN EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(${entries.aliases}::jsonb) AS alias_elem  
        WHERE LOWER(alias_elem) LIKE ${startsWith}
      ) THEN 8
      WHEN LOWER(${entries.title}) LIKE ${likeAll} THEN 9
      ELSE 10
    END
  `;
  const titleLenExpr = sql<number>`LENGTH(${entries.title})`;
  const endingBoostExpr = sql<number>`
    CASE WHEN LOWER(${entries.title}) LIKE '%' || ${trimmed} THEN 0 ELSE 1 END
  `;

  const rows = await db
    .select({
      id: entries.id,
      title: entries.title,
      definition: entries.definition,
      type: entries.type,
      aliases: entries.aliases,
      video_link: entries.video_link,
      mentioned_entries: entries.mentioned_entries,
      priority: priorityExpr,
      title_length: titleLenExpr,
      ending_boost: endingBoostExpr,
    })
    .from(entries)
    .where(
      sql`
        LOWER(${entries.title}) LIKE ${likeAll}
        OR EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(${entries.aliases}::jsonb) AS alias_elem
          WHERE LOWER(alias_elem) LIKE ${likeAll}
        )
      `,
    )
    // Order by the computed expressions directly
    .orderBy(
      sql`priority ASC`,
      sql`ending_boost ASC`,
      sql`title_length ASC`,
      asc(entries.title),
    )
    .limit(10);

  // Attach tags
  const ids = rows.map((r) => r.id);
  const tagMap = await getEntryTagsMapForIds(ids, db);

  const results: AnyEntry[] = rows.map((row) => {
    const base = toAnyEntryBase(row);
    return withTags(base, tagMap.get(row.id) ?? []);
  });

  return results;
}
