// src/app/submit/actions.ts
'use server';

import { createSubmissionInDatabase, fetchTagsFromDatabase as apiFetchTagsFromDatabase } from '@/lib/api';
import type { NewUserSubmission, NewEntrySuggestionData, EditEntrySuggestionData, Tag, EntryWithReferences } from '@/lib/types';
import { db } from '@/drizzle/db';
import { entries, entryTags, tags } from '@/drizzle/schema';
import { eq, ilike, or, sql, inArray } from 'drizzle-orm';
import { toAnyEntryBase, withTags } from '@/lib/api';

/**
 * Searches for entries by name or alias for autocomplete suggestions.
 * @param query The search string.
 * @returns A promise that resolves to an array of matching entries with references.
 */
export async function searchEntriesByName(query: string): Promise<EntryWithReferences[]> {

  try {
    if (!query || query.trim() === '') {
      return [];
    }

    const trimmedQuery = query.trim().toLowerCase();
    const searchQuery = `%${trimmedQuery}%`;

    // First get matching entries with their basic info
    const entryRows = await db
      .select({
        id: entries.id,
        title: entries.title,
        definition: entries.definition,
        type: entries.type,
        aliases: entries.aliases,
        video_link: entries.video_link,
        mentioned_entries: entries.mentioned_entries,
        priority: sql<number>`
          CASE 
            WHEN LOWER(${entries.title}) = ${trimmedQuery} THEN 1
            WHEN ${trimmedQuery} = ANY(string_to_array(LOWER(${entries.title}), ' ')) THEN 
              CASE WHEN LOWER(${entries.title}) LIKE ${'%' + trimmedQuery} THEN 2 ELSE 3 END
            WHEN LOWER(${entries.title}) LIKE ${trimmedQuery + '%'} THEN 4
            WHEN EXISTS (
              SELECT 1 FROM jsonb_array_elements_text(${entries.aliases}::jsonb) AS alias_elem 
              WHERE LOWER(alias_elem) = ${trimmedQuery}
            ) THEN 5
            WHEN EXISTS (
              SELECT 1 FROM jsonb_array_elements_text(${entries.aliases}::jsonb) AS alias_elem
              WHERE ${trimmedQuery} = ANY(string_to_array(LOWER(alias_elem), ' '))
            ) THEN 
              CASE WHEN EXISTS (
                SELECT 1 FROM jsonb_array_elements_text(${entries.aliases}::jsonb) AS alias_elem
                WHERE LOWER(alias_elem) LIKE ${'%' + trimmedQuery}
              ) THEN 6 ELSE 7 END
            WHEN EXISTS (
              SELECT 1 FROM jsonb_array_elements_text(${entries.aliases}::jsonb) AS alias_elem
              WHERE LOWER(alias_elem) LIKE ${trimmedQuery + '%'}
            ) THEN 8
            WHEN LOWER(${entries.title}) LIKE ${searchQuery} THEN 9
            ELSE 10
          END
        `,
        title_length: sql<number>`LENGTH(${entries.title})`,
        ending_boost: sql<number>`
          CASE WHEN LOWER(${entries.title}) LIKE ${'%' + trimmedQuery} THEN 0 ELSE 1 END
        `
      })
      .from(entries)
      .where(
        or(
          ilike(entries.title, searchQuery),
          sql`EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(${entries.aliases}::jsonb) AS alias_elem 
            WHERE LOWER(alias_elem) LIKE ${searchQuery}
          )`
        )
      )
      .orderBy(
        sql`priority ASC`,
        sql`ending_boost ASC`, 
        sql`title_length ASC`,
        sql`${entries.title} ASC`
      )
      .limit(10);

    // Get tags for all matched entries
    const entryIds = entryRows.map(row => row.id);
    const tagMap = new Map<number, Tag[]>();
    
    if (entryIds.length > 0) {
      const tagRows = await db
        .select({
          entryId: entryTags.entry_id,
          tagId: tags.id,
          tagName: tags.name
        })
        .from(entryTags)
        .leftJoin(tags, eq(entryTags.tag_id, tags.id))
        .where(inArray(entryTags.entry_id, entryIds));

      for (const row of tagRows) {
        if (row.tagId && row.tagName) {
          const tagsList = tagMap.get(row.entryId) || [];
          tagsList.push({ id: String(row.tagId), name: row.tagName });
          tagMap.set(row.entryId, tagsList);
        }
      }
    }

    // Transform results to EntryWithReferences format
    return entryRows.map(row => {
      const base = toAnyEntryBase(row);
      const withT = withTags(base, tagMap.get(row.id) || []);
      return withT as EntryWithReferences;
    });

  } catch (error) {
    console.error("Failed to search entries by name:", error);
    throw new Error("Failed to search entries.");
  }

}


/**
 * Submits a new entry suggestion to the database.
 * @param submission The new user submission data.
 * @returns A promise that resolves when the submission is created.
 */
export async function submitNewEntrySuggestion(submission: NewUserSubmission<NewEntrySuggestionData>): Promise<void> {
  await createSubmissionInDatabase(submission);
}

/**
 * Submits an edit suggestion for an existing entry to the database.
 * @param submission The edit user submission data.
 * @returns A promise that resolves when the submission is created.
 */
export async function submitEditEntrySuggestion(submission: NewUserSubmission<EditEntrySuggestionData>): Promise<void> {
  await createSubmissionInDatabase(submission);
}

/**
 * Fetches all available tags from the database.
 * @returns A promise that resolves to an array of Tag objects.
 */
export async function fetchAllTags(): Promise<Tag[]> {
  return apiFetchTagsFromDatabase();
}
