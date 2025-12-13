// src/lib/api.ts
import "server-only";
import type {
  AnyEntry,
  ExiconEntry,
  Tag,
  NewEntrySuggestionData,
  EditEntrySuggestionData,
  UserSubmissionBase,
  Alias,
  ReferencedEntry,
  NewUserSubmission,
} from "./types";
import { getClient } from "./db";
import { PoolClient } from "pg";

export async function isAdminEmail(email: string): Promise<boolean> {
  if (!email) {
    return false;
  }

  const client = await getClient();
  try {
    const result = await client.query(
      "SELECT 1 FROM codex.admins WHERE LOWER(email) = LOWER($1) LIMIT 1",
      [email],
    );
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error("Failed to verify admin email:", error);
    throw error;
  } finally {
    client.release();
  }
}

export type EntryWithReferences = AnyEntry & {
  references?: ReferencedEntry[];
  referencedBy?: ReferencedEntry[];
  resolvedMentionsData?: Record<string, AnyEntry>;
};

export const transformDbRowToEntry = (row: any): EntryWithReferences => {
  if (!row) {
    console.error("transformDbRowToEntry received undefined row");
    throw new Error("Cannot transform undefined database row to entry");
  }

  let mentionedEntries: string[] = [];
  if (row.mentioned_entries !== undefined && row.mentioned_entries !== null) {
    try {
      if (typeof row.mentioned_entries === "string") {
        mentionedEntries = JSON.parse(row.mentioned_entries);
      } else if (Array.isArray(row.mentioned_entries)) {
        mentionedEntries = row.mentioned_entries;
      } else {
        console.warn(
          "mentioned_entries has unexpected type for entry:",
          row.id,
          typeof row.mentioned_entries,
          row.mentioned_entries,
        );
        mentionedEntries = [];
      }

      if (!Array.isArray(mentionedEntries)) {
        console.warn(
          "mentioned_entries is not an array for entry:",
          row.id,
          mentionedEntries,
        );
        mentionedEntries = [];
      }
    } catch (error) {
      console.error(
        "Error parsing mentioned_entries for entry:",
        row.id,
        error,
      );
      mentionedEntries = [];
    }
  }

  return {
    id: row.id,
    name: row.title,
    description: row.definition,
    type: row.type,
    aliases: row.aliases || [],
    tags: row.tags || [],
    videoLink: row.video_link,
    mentionedEntries: mentionedEntries,
    referencedBy: row.referenced_by_data
      ? row.referenced_by_data.map((ref: any) => ref.id)
      : [],
  };
};

// --- Core Reference Handling Functions ---

/**
 * Finds the ID of an entry by its name. Case-insensitive search.
 * @param client The database client.
 * @param entryName The name of the entry to find.
 * @returns The entry ID if found, otherwise null.
 */
export async function getEntryIdByName(name: string): Promise<string | null> {
  const client = await getClient();
  try {
    const res = await client.query(
      "SELECT id::text, title FROM entries WHERE LOWER(title) = LOWER($1)",
      [name],
    );
    if (res.rows.length > 0) {
      return res.rows[0].id;
    }

    return null;
  } finally {
    if (client) client.release();
  }
}

/**
 * Inserts a reference between two entries in the database.
 * @param client The database client.
 * @param referringEntryId The ID of the entry that contains the reference.
 * @param referencedEntryId The ID of the entry being referenced.
 */
export async function insertEntryReference(
  sourceEntryId: string,
  targetEntryId: string,
) {
  if (sourceEntryId === targetEntryId) {
    console.warn(
      `Attempted to create a self-reference for entry ID: ${sourceEntryId}. Skipping.`,
    );
    return;
  }

  const client = await getClient();
  try {
    await client.query(
      `INSERT INTO entry_references (source_entry_id, target_entry_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [sourceEntryId, targetEntryId],
    );
  } finally {
    if (client) client.release();
  }
}

export const deleteTagFromDatabase = async (id: string): Promise<void> => {
  const client = await getClient();
  try {
    const res = await client.query("DELETE FROM tags WHERE id = $1", [id]);
    if (res.rowCount === 0) {
      throw new Error(`Tag with ID ${id} not found.`);
    }
  } catch (err) {
    console.error(`Error deleting tag with ID ${id}:`, err);
    throw err;
  } finally {
    if (client) client.release();
  }
};

/**
 * Deletes all references where a given entry is the referrer.
 * @param client The database client.
 * @param referringEntryId The ID of the entry whose references should be cleared.
 */
export async function deleteReferencesForEntry(
  client: PoolClient,
  sourceEntryId: string,
): Promise<void> {
  try {
    await client.query(
      "DELETE FROM entry_references WHERE source_entry_id = $1",
      [sourceEntryId],
    );
  } catch (error) {
    console.error(
      `Error deleting references for entry ID ${sourceEntryId}:`,
      (error as Error).message,
    );
    throw error;
  }
}

export async function deleteEntryReferences(sourceEntryId: string) {
  const client = await getClient();
  try {
    await client.query(
      "DELETE FROM entry_references WHERE source_entry_id = $1",
      [sourceEntryId],
    );
  } finally {
    if (client) client.release();
  }
}

/**
 * Processes a description string, extracts @references, resolves them, and saves them to the database.
 * This function handles both creating new references and updating existing ones (by clearing and re-adding).
 * @param client The database client.
 * @param referringEntryId The ID of the entry whose description is being processed.
 * @param description The full description string from which to extract references.
 */
export async function processAndSaveReferences(
  entryId: string,
  description: string,
  providedMentionedEntries?: string[],
  client?: PoolClient,
): Promise<string[]> {
  const dbClient = client || (await getClient());
  const shouldReleaseClient = !client;

  try {
    let resolvedReferences: { name: string; id: string }[] = [];

    if (providedMentionedEntries && providedMentionedEntries.length > 0) {
      const res = await dbClient.query(
        "SELECT id, title FROM entries WHERE id = ANY($1::text[])",
        [providedMentionedEntries],
      );

      if (res.rows.length !== providedMentionedEntries.length) {
        const foundIds = res.rows.map((row) => row.id);
        const missingIds = providedMentionedEntries.filter(
          (id) => !foundIds.includes(id),
        );
        console.warn(
          "⚠️ Some mentioned entry IDs were not found in database:",
          missingIds,
        );
      }

      const idToTitleMap = new Map(res.rows.map((row) => [row.id, row.title]));

      resolvedReferences = providedMentionedEntries
        .map((id) => {
          const title = idToTitleMap.get(id);
          if (!title) {
            console.warn(`⚠️ No title found for ID: ${id}`);
            return null;
          }
          return { name: title, id };
        })
        .filter(Boolean) as { name: string; id: string }[];
    } else {
      const mentionRegex =
        /@([A-Za-z0-9][A-Za-z0-9\s_.-]*[A-Za-z0-9])(?=\s|$|[,.!?;:])/g;
      const mentionedNames = [
        ...new Set(
          Array.from(description.matchAll(mentionRegex)).map((match) =>
            match[1].trim(),
          ),
        ),
      ];

      if (mentionedNames.length === 0) {
        return [];
      }

      for (const name of mentionedNames) {
        try {
          const targetId = await getEntryIdByName(name);
          if (targetId) {
            resolvedReferences.push({ name, id: targetId });
          }
        } catch (error) {
          console.error(`❌ Error resolving name "${name}":`, error);
        }
      }
    }

    const mentionedEntryIds = resolvedReferences.map((ref) => ref.id);

    const updateResult = await dbClient.query(
      "UPDATE entries SET mentioned_entries = $1 WHERE id = $2 RETURNING mentioned_entries",
      [JSON.stringify(mentionedEntryIds), entryId],
    );

    if (updateResult.rowCount === 0) {
      throw new Error(
        `Entry with ID ${entryId} not found when updating mentioned_entries`,
      );
    }

    const deleteResult = await dbClient.query(
      "DELETE FROM entry_references WHERE source_entry_id = $1",
      [entryId],
    );

    const referencesToInsert = resolvedReferences.filter((ref) => {
      if (ref.id === entryId) {
        console.warn(`⚠️ Skipping self-reference: ${ref.name} (${ref.id})`);
        return false;
      }
      return true;
    });

    if (referencesToInsert.length > 0) {
      const maxIdResult = await dbClient.query(
        "SELECT COALESCE(MAX(id), 0) as max_id FROM entry_references",
      );
      let currentMaxId = parseInt(maxIdResult.rows[0].max_id, 10);

      for (let i = 0; i < referencesToInsert.length; i++) {
        const ref = referencesToInsert[i];
        const newId = currentMaxId + i + 1;

        try {
          const insertResult = await dbClient.query(
            "INSERT INTO entry_references (id, source_entry_id, target_entry_id, context) VALUES ($1, $2, $3, $4) RETURNING id",
            [newId, entryId, ref.id, ""],
          );
        } catch (insertError) {
          console.error(`❌ Error inserting reference ${newId}:`, insertError);
        }
      }
    }

    const finalReferences = resolvedReferences.map((ref) => ref.name);

    return finalReferences;
  } catch (error) {
    console.error(
      `Error in processAndSaveReferences for entry ${entryId}:`,
      error,
    );
    throw error;
  } finally {
    if (shouldReleaseClient && dbClient) {
      dbClient.release();
    }
  }
}

// --- Entry Management Functions ---

export const fetchAllEntries = async (
  type?: string,
): Promise<EntryWithReferences[]> => {
  const client = await getClient();
  try {
    const whereClause = type ? `WHERE e.type = '${type}'` : "";

    const res = await client.query(`
      SELECT
        e.id,
        e.title,
        e.definition,
        e.type,
        e.aliases,
        e.video_link,
        e.mentioned_entries,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object('id', t.id, 'name', t.name)
            )
            FROM tags t
            JOIN entry_tags et ON t.id = et.tag_id
            WHERE et.entry_id = e.id
          ),
          '[]'::json
        ) AS tags,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', r_e.id,
                'name', r_e.title,
                'description', r_e.definition,
                'type', r_e.type
              )
            )
            FROM entries r_e
            JOIN entry_references er ON r_e.id = er.target_entry_id
            WHERE er.source_entry_id = e.id
          ),
          '[]'::json
        ) AS references_data,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', ref_e.id,
                'name', ref_e.title,
                'description', ref_e.definition,
                'type', ref_e.type
              )
            )
            FROM entries ref_e
            JOIN entry_references eref ON ref_e.id = eref.source_entry_id
            WHERE eref.target_entry_id = e.id
          ),
          '[]'::json
        ) AS referenced_by_data
      FROM entries e
      ${whereClause}
      ORDER BY e.title ASC
    `);

    const transformedEntries = res.rows.map(transformDbRowToEntry);

    // Collect all unique mentioned entry IDs across all entries
    const allMentionedIds = new Set<string>();
    transformedEntries.forEach((entry) => {
      if (entry.mentionedEntries && entry.mentionedEntries.length > 0) {
        entry.mentionedEntries.forEach((id) => allMentionedIds.add(id));
      }
    });

    // Fetch all mentioned entries in a single bulk query
    let mentionedEntriesMap: Map<string, AnyEntry> = new Map();
    if (allMentionedIds.size > 0) {
      const mentionedEntriesRes = await client.query(
        `SELECT id, title, definition, type, aliases, video_link,
         COALESCE(
           (
             SELECT json_agg(
               json_build_object('id', t.id, 'name', t.name)
             )
             FROM tags t
             JOIN entry_tags et ON t.id = et.tag_id
             WHERE et.entry_id = entries.id
           ),
           '[]'::json
         ) AS tags
         FROM entries WHERE id = ANY($1::text[])`,
        [Array.from(allMentionedIds)],
      );

      // Build lookup map for mentioned entries
      mentionedEntriesRes.rows.forEach((mentionedRow: any) => {
        const mentionedEntry = transformDbRowToEntry(mentionedRow);
        mentionedEntriesMap.set(mentionedEntry.id, mentionedEntry);
      });
    }

    // Assign resolved mentions to each entry
    const entriesWithResolvedMentions = transformedEntries.map((entry) => {
      if (entry.mentionedEntries && entry.mentionedEntries.length > 0) {
        const resolvedMentionsData: Record<string, AnyEntry> = {};

        entry.mentionedEntries.forEach((mentionedId) => {
          const mentionedEntry = mentionedEntriesMap.get(mentionedId);
          if (mentionedEntry) {
            resolvedMentionsData[mentionedEntry.id] = mentionedEntry;
            resolvedMentionsData[mentionedEntry.name] = mentionedEntry;

            if (mentionedEntry.aliases) {
              mentionedEntry.aliases.forEach((alias) => {
                const aliasName =
                  typeof alias === "string" ? alias : alias.name;
                resolvedMentionsData[aliasName] = mentionedEntry;
              });
            }
          }
        });

        return {
          ...entry,
          resolvedMentionsData,
        };
      }

      return entry;
    });

    return entriesWithResolvedMentions;
  } catch (err: any) {
    console.error("Error fetching all entries from database:", err);
    throw err;
  } finally {
    if (client) client.release();
  }
};

export const getEntryByIdFromDatabase = async (
  id: string,
): Promise<EntryWithReferences | null> => {
  const client = await getClient();
  try {
    const res = await client.query(
      `
      SELECT
        e.id,
        e.title,
        e.definition,
        e.type,
        e.aliases,
        e.video_link,
        e.mentioned_entries,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object('id', t.id, 'name', t.name)
            )
            FROM tags t
            JOIN entry_tags et ON t.id = et.tag_id
            WHERE et.entry_id = e.id
          ),
          '[]'::json
        ) AS tags,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', r_e.id,
                'name', r_e.title,
                'description', r_e.definition,
                'type', r_e.type
              )
            )
            FROM entries r_e
            JOIN entry_references er ON r_e.id = er.target_entry_id
            WHERE er.source_entry_id = e.id
          ),
          '[]'::json
        ) AS references_data,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', ref_e.id,
                'name', ref_e.title,
                'description', ref_e.definition,
                'type', ref_e.type
              )
            )
            FROM entries ref_e
            JOIN entry_references eref ON ref_e.id = eref.source_entry_id
            WHERE eref.target_entry_id = e.id
          ),
          '[]'::json
        ) AS referenced_by_data
      FROM entries e
      WHERE e.id = $1
    `,
      [id],
    );

    if (!res || res.rows.length === 0) {
      return null;
    }

    const entry = transformDbRowToEntry(res.rows[0]);

    if (entry.mentionedEntries && entry.mentionedEntries.length > 0) {
      const mentionedEntriesRes = await client.query(
        `SELECT id, title, definition, type, aliases, video_link,
         COALESCE(
           (
             SELECT json_agg(
               json_build_object('id', t.id, 'name', t.name)
             )
             FROM tags t
             JOIN entry_tags et ON t.id = et.tag_id
             WHERE et.entry_id = entries.id
           ),
           '[]'::json
         ) AS tags
         FROM entries WHERE id = ANY($1::text[])`,
        [entry.mentionedEntries],
      );

      const resolvedMentionsData: Record<string, AnyEntry> = {};
      mentionedEntriesRes.rows.forEach((mentionedRow: any) => {
        const mentionedEntry = transformDbRowToEntry(mentionedRow);
        resolvedMentionsData[mentionedEntry.id] = mentionedEntry;
        resolvedMentionsData[mentionedEntry.name] = mentionedEntry;

        if (mentionedEntry.aliases) {
          mentionedEntry.aliases.forEach((alias) => {
            const aliasName = typeof alias === "string" ? alias : alias.name;
            resolvedMentionsData[aliasName] = mentionedEntry;
          });
        }
      });

      return {
        ...entry,
        resolvedMentionsData,
      };
    }

    return entry;
  } catch (err) {
    console.error(`Error fetching entry with ID ${id}:`, err);
    throw err;
  } finally {
    client.release();
  }
};

export const updateEntryInDatabase = async (
  entry: AnyEntry,
): Promise<EntryWithReferences> => {
  const client = await getClient();
  try {
    await client.query("BEGIN");

    const { id, name, description, type, mentionedEntries } = entry;
    const videoLink =
      type === "exicon" ? (entry as ExiconEntry).videoLink || null : null;

    console.log("🎥 Updating entry:", {
      id,
      name,
      type,
      videoLink,
      rawVideoLink: (entry as ExiconEntry).videoLink,
    });

    const aliasesToStore = Array.isArray(entry.aliases)
      ? entry.aliases.map((alias) =>
          typeof alias === "string" ? { name: alias } : alias,
        )
      : [];
    const aliasesJson = JSON.stringify(
      aliasesToStore.filter((a) => a.name.trim() !== ""),
    );

    const existsResult = await client.query(
      "SELECT id FROM entries WHERE id = $1",
      [id],
    );
    if (existsResult.rowCount === 0) {
      throw new Error(`Entry with ID ${id} not found in database`);
    }

    const updateResult = await client.query(
      "UPDATE entries SET title = $1, definition = $2, type = $3, aliases = $4, video_link = $5, updated_at = NOW() WHERE id = $6 RETURNING id",
      [name, description, type, aliasesJson, videoLink, id],
    );

    if (updateResult.rowCount === 0) {
      throw new Error(`Failed to update entry with ID ${id}`);
    }

    if (type === "exicon") {
      // Delete existing tags first to avoid duplicates
      await client.query("DELETE FROM entry_tags WHERE entry_id = $1", [id]);

      const tags = (entry as ExiconEntry).tags;
      const tagNames = tags.map((t) => t.name);

      if (tagNames.length > 0) {
        const ensuredTagsWithIds = await ensureTagsExist(client, tagNames);
        const tagIds = ensuredTagsWithIds.map((t) => t.id);

        if (tagIds.length > 0) {
          const tagInsertValues = tagIds
            .map((tagId, index) => `($${index * 2 + 1}, $${index * 2 + 2})`)
            .join(", ");

          const tagInsertParams = tagIds.flatMap((tagId) => [id, tagId]);

          try {
            await client.query(
              `INSERT INTO entry_tags (entry_id, tag_id) VALUES ${tagInsertValues}`,
              tagInsertParams,
            );
          } catch (tagError) {
            console.error("Error inserting tags:", tagError);

            for (const tagId of tagIds) {
              try {
                const existingAssociation = await client.query(
                  "SELECT 1 FROM entry_tags WHERE entry_id = $1 AND tag_id = $2",
                  [id, tagId],
                );

                if (existingAssociation.rowCount === 0) {
                  await client.query(
                    "INSERT INTO entry_tags (entry_id, tag_id) VALUES ($1, $2)",
                    [id, tagId],
                  );
                }
              } catch (individualTagError) {
                console.error(
                  `Error associating tag ${tagId}:`,
                  individualTagError,
                );
              }
            }
          }
        }
      }
    }

    try {
    } catch (referenceError) {
      console.error("Error processing references:", referenceError);

      if ((referenceError as any).code === "25P02") {
        console.error(
          "Transaction was aborted, rolling back and retrying without problematic operations...",
        );
        await client.query("ROLLBACK");

        await client.query("BEGIN");

        await client.query(
          "UPDATE entries SET title = $1, definition = $2, type = $3, aliases = $4, video_link = $5, updated_at = NOW() WHERE id = $6",
          [name, description, type, aliasesJson, videoLink, id],
        );

        try {
          const processedReferences = await processAndSaveReferences(
            id,
            description,
            mentionedEntries,
            client,
          );
        } catch (secondReferenceError) {
          console.error(
            "Failed to process references even in new transaction:",
            secondReferenceError,
          );
        }
      }
    }

    await client.query("COMMIT");

    const updatedEntry = await getEntryByIdFromDatabase(id);
    if (!updatedEntry) {
      throw new Error(`Failed to retrieve updated entry with ID ${id}`);
    }

    return updatedEntry;
  } catch (err) {
    console.error("Error in updateEntryInDatabase:", err);
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("Error during rollback:", rollbackError);
    }
    throw err;
  } finally {
    if (client) {
      client.release();
    }
  }
};

export const deleteEntryFromDatabase = async (
  id: string | number,
): Promise<void> => {
  const client = await getClient();
  try {
    await client.query("BEGIN");
    const queryId = String(id);

    await client.query("DELETE FROM entry_tags WHERE entry_id = $1", [queryId]);

    await client.query(
      "DELETE FROM entry_references WHERE source_entry_id = $1 OR target_entry_id = $1",
      [queryId],
    );

    const res = await client.query("DELETE FROM entries WHERE id = $1", [
      queryId,
    ]);
    if (res.rowCount === 0) {
      console.warn(`Entry with ID ${id} not found for deletion.`);
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(`Error deleting entry with ID ${id} from database:`, err);
    throw err;
  } finally {
    client.release();
  }
};

export const getAllEntryNamesFromDatabase = async (): Promise<string[]> => {
  const client = await getClient();
  try {
    const res = await client.query(
      "SELECT title FROM entries ORDER BY title ASC",
    );
    return res.rows.map((row: { title: any }) => row.title);
  } catch (err: any) {
    const errorMessage = err.message ? String(err.message).toLowerCase() : "";
    if (errorMessage.includes('relation "entries" does not exist')) {
      const detailedErrorMsg =
        'CRITICAL SERVER LOG: The "entries" table was not found when trying to fetch entry names. This means migrations have likely not run or failed. \n1. TRIPLE-CHECK your DATABASE_URL in your .env file. \n2. Ensure PostgreSQL server is running. \n3. Run `npm run db:migrate:up` and WATCH FOR ERRORS in the terminal. \n4. Verify `pgmigrations` table in your database. Error details: ' +
        err.stack;
      console.error(detailedErrorMsg);
      throw new Error(
        'DATABASE SETUP ERROR: The "entries" table is MISSING when fetching names. This is NOT a code bug. FIX: 1. Verify DATABASE_URL in .env. 2. Run `npm run db:migrate:up` AND CHECK ITS OUTPUT FOR ERRORS. See server logs for more details.',
      );
    }
    console.error("Error fetching all entry names from database:", err);
    throw err;
  } finally {
    if (client) client.release();
  }
};

// --- Tag Management Functions ---

export const fetchTagsFromDatabase = async (): Promise<Tag[]> => {
  const client = await getClient();
  try {
    const res = await client.query(
      "SELECT id::text, name FROM tags ORDER BY name ASC",
    );
    return res.rows;
  } catch (err: any) {
    const errorMessage = err.message ? String(err.message).toLowerCase() : "";
    if (errorMessage.includes('relation "tags" does not exist')) {
      const detailedErrorMsg =
        'CRITICAL SERVER LOG: The "tags" table was not found. This means migrations have likely not run or failed. \n1. TRIPLE-CHECK your DATABASE_URL in your .env file. \n2. Ensure PostgreSQL server is running. \n3. Run `npm run db:migrate:up` and WATCH FOR ERRORS in the terminal. \n4. Verify `pgmigrations` table in your database. Error details: ' +
        err.stack;
      console.error(detailedErrorMsg);
      throw new Error(
        'DATABASE SETUP ERROR: The "tags" table is MISSING. This is NOT a code bug in this function. FIX: 1. Verify DATABASE_URL in .env. 2. Run `npm run db:migrate:up` AND CHECK ITS OUTPUT FOR ERRORS. See server logs for more details.',
      );
    }
    console.error("Error fetching tags from database:", err);
    throw err;
  } finally {
    if (client) client.release();
  }
};

export const createTagInDatabase = async (name: string): Promise<Tag> => {
  const client = await getClient();
  try {
    const res = await client.query(
      'INSERT INTO tags (id, name, "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, NOW(), NOW()) RETURNING id::text, name',
      [name],
    );
    return res.rows[0];
  } catch (err: any) {
    if (err.code === "23505") {
      throw new Error(`Tag "${name}" already exists.`);
    }
    console.error("Error creating tag in database:", err);
    throw err;
  } finally {
    if (client) client.release();
  }
};

export const updateTagInDatabase = async (
  id: string,
  name: string,
): Promise<Tag> => {
  const client = await getClient();
  try {
    const res = await client.query(
      "UPDATE tags SET name = $1 WHERE id = $2 RETURNING id::text, name",
      [name, id],
    );
    if (res.rows.length === 0) {
      throw new Error(`Tag with ID ${id} not found for update.`);
    }
    return res.rows[0];
  } catch (err: any) {
    if (err.code === "23505") {
      throw new Error(`Another tag with name "${name}" already exists.`);
    }
    console.error("Error updating tag in database:", err);
    throw err;
  } finally {
    if (client) client.release();
  }
};

export async function ensureTagsExist(
  client: PoolClient,
  tagNames: string[],
): Promise<Tag[]> {
  const ensuredTags: Tag[] = [];
  const validTagNames = tagNames.filter((tag) => tag && tag.trim() !== "");

  if (validTagNames.length === 0) {
    return ensuredTags;
  }

  const existingTagsRes = await client.query(
    "SELECT id, name FROM tags WHERE name = ANY($1::text[])",
    [validTagNames],
  );
  const existingTagsMap = new Map<string, Tag>();
  for (const row of existingTagsRes.rows) {
    existingTagsMap.set(row.name, { id: String(row.id), name: row.name });
  }

  const tagsToInsert = validTagNames.filter(
    (tagName) => !existingTagsMap.has(tagName),
  );

  if (tagsToInsert.length > 0) {
    await client.query(
      `INSERT INTO tags (name) VALUES ${tagsToInsert.map((_, i) => `($${i + 1})`).join(",")} ON CONFLICT (name) DO NOTHING`,
      tagsToInsert,
    );
    const insertedOrExistingRes = await client.query(
      "SELECT id, name FROM tags WHERE name = ANY($1::text[])",
      [validTagNames],
    );
    for (const row of insertedOrExistingRes.rows) {
      existingTagsMap.set(row.name, { id: String(row.id), name: row.name });
    }
  }

  for (const tagName of validTagNames) {
    const tag = existingTagsMap.get(tagName);
    if (tag) {
      ensuredTags.push(tag);
    } else {
      console.error(
        `ERROR: Tag "${tagName}" could not be found or created after processing.`,
      );
    }
  }
  return ensuredTags;
}

// --- Submission Management Functions ---

export const fetchPendingSubmissionsFromDatabase = async (): Promise<
  UserSubmissionBase<any>[]
> => {
  const client = await getClient();
  try {
    const res = await client.query(
      "SELECT id, submission_type, data, submitter_name, submitter_email, status, timestamp::text FROM user_submissions WHERE status = 'pending' ORDER BY timestamp ASC",
    );
    return res.rows.map(
      (row: {
        id: any;
        submission_type: any;
        data: any;
        submitter_name: any;
        submitter_email: any;
        status: any;
        timestamp: any;
        description: any;
        name: any;
      }) => ({
        id: Number(row.id),
        submissionType: row.submission_type,
        data: row.data,
        submitterName: row.submitter_name,
        submitterEmail: row.submitter_email,
        status: row.status,
        timestamp: row.timestamp,
        description: row.description,
        name: row.name,
      }),
    );
  } catch (err) {
    console.error("Error fetching pending submissions from database:", err);
    throw err;
  } finally {
    if (client) client.release();
  }
};

export async function createSubmissionInDatabase(
  submission: NewUserSubmission<
    NewEntrySuggestionData | EditEntrySuggestionData
  >,
): Promise<
  UserSubmissionBase<NewEntrySuggestionData | EditEntrySuggestionData>
> {
  const client = await getClient();
  try {
    const { submissionType, data, submitterName, submitterEmail } = submission;

    if (submissionType !== "new" && submissionType !== "edit") {
      throw new Error(`Unknown submission type: ${submissionType}`);
    }

    const submissionDataJson = JSON.stringify(data);

    const res = await client.query(
      `INSERT INTO user_submissions (submission_type, data, submitter_name, submitter_email, status, timestamp, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), NOW())
      RETURNING id, submission_type, data, submitter_name, submitter_email, status, timestamp, created_at, updated_at`,
      [
        submissionType,
        submissionDataJson,
        submitterName,
        submitterEmail,
        "pending",
      ],
    );

    const createdSubmissionRow = res.rows[0];

    return {
      id: createdSubmissionRow.id,
      submissionType: createdSubmissionRow.submission_type as "new" | "edit",
      data: createdSubmissionRow.data,
      submitterName: createdSubmissionRow.submitter_name,
      submitterEmail: createdSubmissionRow.submitter_email,
      status: createdSubmissionRow.status,
      timestamp: createdSubmissionRow.timestamp,
      createdAt: createdSubmissionRow.created_at,
      updatedAt: createdSubmissionRow.updated_at,
    };
  } catch (err) {
    console.error("Error creating submission:", err);
    throw err;
  } finally {
    client.release();
  }
}
export const updateSubmissionStatusInDatabase = async (
  id: number,
  status: "pending" | "approved" | "rejected",
): Promise<void> => {
  const client = await getClient();
  try {
    const res = await client.query(
      "UPDATE user_submissions SET status = $1, updated_at = NOW() WHERE id = $2",
      [status, id],
    );
    if (res.rowCount === 0) {
      throw new Error(`Submission with ID ${id} not found.`);
    }
  } catch (err) {
    console.error(
      `Error updating submission status for ID ${id} to ${status}:`,
      err,
    );
    throw err;
  } finally {
    client.release();
  }
};

export async function applyApprovedSubmissionToDatabase(
  submission: UserSubmissionBase<any>,
): Promise<EntryWithReferences> {
  if (submission.submissionType === "new") {
    const newEntryData = submission.data as NewEntrySuggestionData & {
      mentionedEntries?: string[];
    };
    let client;
    try {
      client = await getClient();
      const createdEntry = await createEntryInDatabase(newEntryData);

      await client.query(
        "UPDATE user_submissions SET status = $1, updated_at = NOW() WHERE id = $2",
        ["approved", submission.id],
      );
      return createdEntry;
    } catch (error) {
      console.error("Error creating entry from new submission:", error);
      throw error;
    } finally {
      if (client) client.release();
    }
  }

  const client = await getClient();
  try {
    await client.query("BEGIN");

    const editEntryData = submission.data as EditEntrySuggestionData;
    const currentEntry = await getEntryByIdFromDatabase(editEntryData.entryId);

    if (!currentEntry) {
      throw new Error(
        `Original entry with ID ${editEntryData.entryId} not found for edit submission.`,
      );
    }

    const changes = editEntryData.changes;
    const entryToUpdate: AnyEntry = { ...currentEntry };

    if (changes.name !== undefined) entryToUpdate.name = changes.name;
    if (changes.description !== undefined)
      entryToUpdate.description = changes.description;
    if (changes.aliases !== undefined) {
      entryToUpdate.aliases = changes.aliases.map((name) => ({ name }));
    }
    if (changes.entryType !== undefined) entryToUpdate.type = changes.entryType;
    if (changes.videoLink !== undefined && entryToUpdate.type === "exicon") {
      (entryToUpdate as ExiconEntry).videoLink = changes.videoLink;
    }
    if (changes.tags !== undefined && entryToUpdate.type === "exicon") {
      const tagNamesArray = Array.isArray(changes.tags) ? changes.tags : [];
      const ensuredTags = await ensureTagsExist(client, tagNamesArray);
      (entryToUpdate as ExiconEntry).tags = ensuredTags;
    }
    if (changes.mentionedEntries !== undefined) {
      entryToUpdate.mentionedEntries = changes.mentionedEntries;
    }

    const { id, name, description, type } = entryToUpdate;
    const videoLink =
      type === "exicon"
        ? (entryToUpdate as ExiconEntry).videoLink || null
        : null;

    const aliasesToStore = Array.isArray(entryToUpdate.aliases)
      ? entryToUpdate.aliases.map((alias) =>
          typeof alias === "string" ? { name: alias } : alias,
        )
      : [];
    const aliasesJson = JSON.stringify(
      aliasesToStore.filter((a) => a.name.trim() !== ""),
    );

    await client.query(
      "UPDATE entries SET title = $1, definition = $2, type = $3, aliases = $4, video_link = $5, updated_at = NOW() WHERE id = $6",
      [name, description, type, aliasesJson, videoLink, id],
    );

    if (type === "exicon") {
      await client.query("DELETE FROM entry_tags WHERE entry_id = $1", [id]);
      const tags = (entryToUpdate as ExiconEntry).tags;

      if (tags && tags.length > 0) {
        const ensuredTags = await ensureTagsExist(
          client,
          tags.map((t) => t.name),
        );
        const tagIds = ensuredTags.map((t) => t.id).filter(Boolean);
        if (tagIds.length > 0) {
          // Use parameterized query with unnest to safely insert multiple rows
          const placeholders = tagIds.map((_, i) => `($1, $${i + 2})`).join(",");
          await client.query(
            `INSERT INTO entry_tags (entry_id, tag_id) VALUES ${placeholders} ON CONFLICT (entry_id, tag_id) DO NOTHING`,
            [id, ...tagIds],
          );
        }
      }
    }

    let mentionedEntryIds: string[] = [];
    if (
      entryToUpdate.mentionedEntries &&
      entryToUpdate.mentionedEntries.length > 0
    ) {
      mentionedEntryIds = entryToUpdate.mentionedEntries;
    } else {
      const mentionRegex =
        /@([A-Za-z0-9][A-Za-z0-9\s_.-]*[A-Za-z0-9])(?=\s|$|[,.!?;:])/g;
      const mentionedNames = [
        ...new Set(
          Array.from(description.matchAll(mentionRegex)).map((match) =>
            match[1].trim(),
          ),
        ),
      ];

      const resolvedReferencesPromises = mentionedNames.map(async (name) => {
        const res = await client.query(
          "SELECT id::text FROM entries WHERE LOWER(title) = LOWER($1)",
          [name],
        );
        return res.rows.length > 0 ? res.rows[0].id : null;
      });

      const resolvedIds = (
        await Promise.all(resolvedReferencesPromises)
      ).filter(Boolean) as string[];
      mentionedEntryIds = resolvedIds;
    }

    await client.query(
      "UPDATE entries SET mentioned_entries = $1 WHERE id = $2",
      [JSON.stringify(mentionedEntryIds), id],
    );

    await client.query(
      "DELETE FROM entry_references WHERE source_entry_id = $1",
      [id],
    );

    const referencesToInsert = mentionedEntryIds.filter(
      (targetId) => targetId !== id,
    );

    if (referencesToInsert.length > 0) {
      const maxIdResult = await client.query(
        "SELECT COALESCE(MAX(id), 0) as max_id FROM entry_references",
      );
      let currentMaxId = maxIdResult.rows[0].max_id;

      const insertPromises = referencesToInsert.map((targetId, index) => {
        const newId = currentMaxId + index + 1;
        return client.query(
          "INSERT INTO entry_references (id, source_entry_id, target_entry_id, context) VALUES ($1, $2, $3, $4)",
          [newId, id, targetId, ""],
        );
      });

      await Promise.all(insertPromises);
    }

    await client.query(
      "UPDATE user_submissions SET status = $1, updated_at = NOW() WHERE id = $2",
      ["approved", submission.id],
    );

    await client.query("COMMIT");

    const finalEntry = await getEntryByIdFromDatabase(id);
    if (!finalEntry) {
      throw new Error("Failed to retrieve updated entry with references.");
    }

    return finalEntry;
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error applying approved submission to database:", error);
    throw error;
  } finally {
    if (client) client.release();
  }
}

export const createEntryInDatabase = async (
  entry: NewEntrySuggestionData & { id?: string; mentionedEntries?: string[] },
): Promise<EntryWithReferences> => {
  const client = await getClient();
  try {
    await client.query("BEGIN");

    const {
      name,
      description,
      entryType,
      aliases,
      videoLink,
      tags,
      mentionedEntries,
    } = entry;
    const entryId =
      entry.id ||
      `${entryType}-${Date.now()}-${name.toLowerCase().replace(/\s+/g, "-")}`;

    const aliasesToStore: Alias[] = Array.isArray(aliases)
      ? aliases.map((alias) =>
          typeof alias === "string" ? { name: alias.trim() } : alias,
        )
      : [];

    const aliasesJson = JSON.stringify(
      aliasesToStore.filter((a) => a && a.name && a.name.trim() !== ""),
    );

    await client.query(
      `INSERT INTO entries (id, title, definition, type, aliases, video_link, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
      [entryId, name, description, entryType, aliasesJson, videoLink],
    );

    if (entryType === "exicon" && tags && tags.length > 0) {
      const ensuredTagsWithIds = await ensureTagsExist(client, tags);
      const tagIds = ensuredTagsWithIds.map((tag) => tag.id);

      if (tagIds.length > 0) {
        // Use parameterized query to safely insert multiple rows
        const placeholders = tagIds.map((_, i) => `($1, $${i + 2})`).join(",");
        await client.query(
          `INSERT INTO entry_tags (entry_id, tag_id) VALUES ${placeholders}`,
          [entryId, ...tagIds],
        );
      }
    }

    await processAndSaveReferences(
      entryId,
      description,
      mentionedEntries,
      client,
    );

    await client.query("COMMIT");

    const createdEntry = await getEntryByIdFromDatabase(entryId);

    if (!createdEntry) {
      throw new Error(
        `Failed to retrieve created entry with ID ${entryId}. This is unexpected.`,
      );
    }

    return createdEntry;
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error creating entry in database:", err);
    throw err;
  } finally {
    client.release();
  }
};

export async function searchEntriesByName(
  query: string,
): Promise<EntryWithReferences[]> {
  const client = await getClient();
  try {
    if (!query || query.trim() === "") {
      return [];
    }

    const trimmedQuery = query.trim().toLowerCase();
    const searchQuery = `%${trimmedQuery}%`;

    const res = await client.query(
      `SELECT
            e.id,
            e.title,
            e.definition,
            e.type,
            e.aliases,
            e.video_link,
            e.mentioned_entries,
            ARRAY_AGG(DISTINCT t.id || '::' || t.name) FILTER (WHERE t.id IS NOT NULL) AS tags_array,
            -- More aggressive priority scoring
            CASE 
              -- Exact match on full title gets highest priority
              WHEN LOWER(e.title) = $2 THEN 1
              -- Title equals just the query (for single word titles)
              WHEN LOWER(e.title) = $2 THEN 1
              -- Exact match on individual words in title, prefer if it's the last word
              WHEN $2 = ANY(string_to_array(LOWER(e.title), ' ')) THEN 
                CASE WHEN LOWER(e.title) LIKE '%' || $2 THEN 2 ELSE 3 END
              -- Title starts with query gets fourth priority  
              WHEN LOWER(e.title) LIKE $3 THEN 4
              -- Exact match in aliases gets fifth priority
              WHEN EXISTS (
                SELECT 1 FROM jsonb_array_elements_text(e.aliases::jsonb) AS alias_elem
                WHERE LOWER(alias_elem) = $2
              ) THEN 5
              -- Exact match on words in aliases, prefer if it ends with the query
              WHEN EXISTS (
                SELECT 1 FROM jsonb_array_elements_text(e.aliases::jsonb) AS alias_elem
                WHERE $2 = ANY(string_to_array(LOWER(alias_elem), ' '))
              ) THEN 
                CASE WHEN EXISTS (
                  SELECT 1 FROM jsonb_array_elements_text(e.aliases::jsonb) AS alias_elem
                  WHERE LOWER(alias_elem) LIKE '%' || $2
                ) THEN 6 ELSE 7 END
              -- Alias starts with query gets eighth priority
              WHEN EXISTS (
                SELECT 1 FROM jsonb_array_elements_text(e.aliases::jsonb) AS alias_elem  
                WHERE LOWER(alias_elem) LIKE $3
              ) THEN 8
              -- Title contains query gets ninth priority
              WHEN LOWER(e.title) LIKE $1 THEN 9
              -- Alias contains query gets lowest priority
              ELSE 10
            END as priority,
            -- Prefer shorter titles and titles ending with the search term
            LENGTH(e.title) as title_length,
            -- Boost score for titles ending with the search term
            CASE WHEN LOWER(e.title) LIKE '%' || $2 THEN 0 ELSE 1 END as ending_boost
         FROM
            entries e
         LEFT JOIN
            entry_tags et ON e.id = et.entry_id
         LEFT JOIN
            tags t ON et.tag_id = t.id
         WHERE
            LOWER(e.title) LIKE $1 
            OR EXISTS (
              SELECT 1 FROM jsonb_array_elements_text(e.aliases::jsonb) AS alias_elem
              WHERE LOWER(alias_elem) LIKE $1
            )
         GROUP BY
            e.id, e.title, e.definition, e.type, e.aliases, e.video_link, e.mentioned_entries
         ORDER BY
            priority ASC, ending_boost ASC, title_length ASC, e.title ASC
         LIMIT 10`,
      [searchQuery, trimmedQuery, `${trimmedQuery}%`],
    );

    return res.rows.map((row) =>
      transformDbRowToEntry(row),
    ) as EntryWithReferences[];
  } catch (error) {
    console.error("Failed to search entries by name:", error);
    throw new Error("Failed to search entries.");
  } finally {
    client.release();
  }
}
