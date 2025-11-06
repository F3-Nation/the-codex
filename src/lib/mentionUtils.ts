// src/lib/mentionUtils.ts
import type { EntryWithReferences } from "./types";

import { getEntryByIdFromDatabase } from "./api";

/**
 * Processes a description string, identifies mentions (@Entry Name),
 * and generates HTML with HoverCard markup for resolved mentions.
 * @param description The description string.
 * @returns A promise that resolves to the HTML string with formatted mentions.
 */
export async function formatDescriptionWithMentions(
  description: string,
): Promise<string> {
  if (!description) {
    return "";
  }

  const mentionRegex = /@([a-zA-Z0-9\s_.-]+)(?=[s,.!?;:]|$)/g; // Improved regex to handle more punctuation after mention
  let lastIndex = 0;
  let html = "";
  let match;

  const mentionsToResolve: string[] = [];
  const mentionMatches: { name: string; index: number; fullMatch: string }[] =
    [];

  // First pass: Find all mentions and collect unique names to resolve
  while ((match = mentionRegex.exec(description)) !== null) {
    const mentionName = match[1].trim();
    if (mentionName) {
      mentionsToResolve.push(mentionName);
      mentionMatches.push({
        name: mentionName,
        index: match.index,
        fullMatch: match[0],
      });
    }
  }

  // Resolve all unique mention names in one go (or in batches)
  const uniqueMentionNames = Array.from(new Set(mentionsToResolve));
  const resolvedEntries: Record<string, EntryWithReferences> = {};

  for (const name of uniqueMentionNames) {
    try {
      const entry = await getEntryByIdFromDatabase(name); // Assume this function exists
      if (entry) {
        resolvedEntries[name] = entry;
      }
    } catch (error) {
      console.error(`Error resolving mention "${name}":`, error);
    }
  }

  lastIndex = 0;
  for (const mentionMatch of mentionMatches) {
    const { name, index, fullMatch } = mentionMatch;
    const entry = resolvedEntries[name];
    const textBeforeMention = description.substring(lastIndex, index);
    html += textBeforeMention;

    if (entry) {
      html += `
              <span
                  class="entry-mention text-blue-700 underline cursor-pointer"
                  data-entry-id="${entry.id}"
                  data-entry-name="${entry.name}"
                  data-entry-description="${entry.description.replace(/"/g, "&quot;")}" // Escape quotes
                  data-entry-type="${entry.type}"
              >
                  ${entry.name}
              </span>
          `;
    } else {
      html += fullMatch;
    }
    lastIndex = index + fullMatch.length;
  }

  html += description.substring(lastIndex);

  return html;
}
