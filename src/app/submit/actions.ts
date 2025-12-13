"use server";

import {
  createSubmissionInDatabase,
  fetchTagsFromDatabase as apiFetchTagsFromDatabase,
  getEntryByIdFromDatabase,
} from "@/lib/api";
import type {
  NewUserSubmission,
  NewEntrySuggestionData,
  EditEntrySuggestionData,
  Tag,
  EntryWithReferences,
} from "@/lib/types";
import { getClient } from "@/lib/db";
import { transformDbRowToEntry } from "@/lib/api";
import sgMail from "@sendgrid/mail";

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

/**
 * Sends email notification for new submissions
 */
async function sendSubmissionNotification(
  type: "new" | "edit",
  submissionData: NewEntrySuggestionData | EditEntrySuggestionData,
  submitterEmail: string,
  submitterName: string,
) {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn(
      "SENDGRID_API_KEY not configured - skipping email notification",
    );
    return;
  }

  if (!process.env.FROM_EMAIL) {
    console.warn("FROM_EMAIL not configured - skipping email notification");
    return;
  }

  try {
    const isEdit = type === "edit";
    const entryName = isEdit
      ? (submissionData as EditEntrySuggestionData).entryName
      : (submissionData as NewEntrySuggestionData).name;

    // Email to submitter
    const submitterMsg = {
      to: submitterEmail,
      from: process.env.FROM_EMAIL!,
      subject: `Submission Received: ${entryName}`,
      html: `
        <h2>Thank you for your submission!</h2>
        <p>Hi ${submitterName},</p>
        <p>We've received your ${isEdit ? "edit suggestion" : "new entry suggestion"} for "<strong>${entryName}</strong>".</p>
        <p>Our team will review it and get back to you soon.</p>
        <br>
        <p>Thanks for contributing to the F3 community!</p>
      `,
    };

    await sgMail.send(submitterMsg);

    // Send admin notification to the same email address as FROM_EMAIL (support@f3nation.com)
    const adminMsg = {
      to: process.env.FROM_EMAIL!, // Admin receives at support@f3nation.com
      from: process.env.FROM_EMAIL!,
      subject: `New ${isEdit ? "Edit" : "Entry"} Submission: ${entryName}`,
      html: `
        <h2>New Submission Received</h2>
        <p><strong>Type:</strong> ${isEdit ? "Edit Suggestion" : "New Entry"}</p>
        <p><strong>Entry:</strong> ${entryName}</p>
        <p><strong>Submitter:</strong> ${submitterName} (${submitterEmail})</p>
        <p><strong>Description:</strong> ${isEdit ? "Edit to existing entry" : (submissionData as NewEntrySuggestionData).description?.substring(0, 200) + "..."}</p>
        <br>
        <p>Please review this submission in the admin panel.</p>
      `,
    };


    await sgMail.send(adminMsg);

  } catch (error) {
    console.error("Error sending email notification:", error);
    console.error("Email error details:", {
      hasApiKey: !!process.env.SENDGRID_API_KEY,
      hasFromEmail: !!process.env.FROM_EMAIL,
      submitterEmail,
      submitterName,
      entryName:
        type === "edit"
          ? (submissionData as EditEntrySuggestionData).entryName
          : (submissionData as NewEntrySuggestionData).name,
    });
  }
}

/**
 * Fetches a single entry by its ID.
 * @param id The ID of the entry to fetch.
 * @returns A promise that resolves to the matching entry or null if not found.
 */
export async function getEntryById(
  id: string | number,
): Promise<EntryWithReferences | null> {
  return getEntryByIdFromDatabase(String(id));
}

/**
 * Searches for entries by name or alias for autocomplete suggestions.
 * @param query The search string.
 * @returns A promise that resolves to an array of matching entries with references.
 */
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

/**
 * Submits a new entry suggestion to the database.
 * @param submission The new user submission data.
 * @returns A promise that resolves when the submission is created.
 */
export async function submitNewEntrySuggestion(
  submission: NewUserSubmission<NewEntrySuggestionData>,
): Promise<void> {
  await createSubmissionInDatabase(submission);

  // Send email notification after successful submission
  await sendSubmissionNotification(
    "new",
    submission.data,
    submission.submitterEmail,
    submission.submitterName,
  );
}

/**
 * Submits an edit suggestion for an existing entry to the database.
 * @param submission The edit user submission data.
 * @returns A promise that resolves when the submission is created.
 */
export async function submitEditEntrySuggestion(
  submission: NewUserSubmission<EditEntrySuggestionData>,
): Promise<void> {
  await createSubmissionInDatabase(submission);

  // Send email notification after successful submission

  await sendSubmissionNotification(
    "edit",
    submission.data,
    submission.submitterEmail,
    submission.submitterName,
  );
}

/**
 * Fetches all available tags from the database.
 * @returns A promise that resolves to an array of Tag objects.
 */
export async function fetchAllTags(): Promise<Tag[]> {
  return apiFetchTagsFromDatabase();
}
