// src/lib/utils.ts - Modify getYouTubeEmbedUrl

import type { AnyEntry } from "./types";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
/**
 * Formats a description string, identifies mentions (@Entry Name),
 * and generates HTML with markup for hover effects.
 *
 * @param description The description string.
 * @param allEntries A list of all available entries to resolve mentions against.
 * @returns A promise that resolves to the HTML string with formatted mentions.
 */
export async function formatDescriptionWithMentionsHTML(
  description: string,
  allEntries: AnyEntry[],
): Promise<string> {
  if (!description) {
    return "";
  }

  const mentionRegex = /@([a-zA-Z0-9s_.-]+)(?=[s,.!?;:]|$)/g;
  let lastIndex = 0;
  let html = "";
  let match;

  const entryMap = new Map<string, AnyEntry>();
  for (const entry of allEntries) {
    entryMap.set(entry.name.toLowerCase(), entry);
    if (entry.aliases) {
      for (const alias of entry.aliases) {
        const aliasName = typeof alias === "string" ? alias : alias.name;
        if (aliasName) {
          entryMap.set(aliasName.toLowerCase(), entry);
        }
      }
    }
  }

  while ((match = mentionRegex.exec(description)) !== null) {
    const before = description.substring(lastIndex, match.index);
    html += before;

    const mentionName = match[1].trim();
    const matchedEntry = entryMap.get(mentionName.toLowerCase());

    if (matchedEntry) {
      html += `<span
                 class="entry-mention text-blue-700 underline hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-900 cursor-pointer"
                 data-entry-id="${matchedEntry.id}"
                 data-entry-name="${matchedEntry.name}"
                 data-entry-description="${matchedEntry.description.replace(/"/g, "&quot;")}" // Escape quotes for HTML attribute
                 data-entry-type="${matchedEntry.type}"
               >
                 ${matchedEntry.name}
               </span>`;
    } else {
      html += `<span class="entry-mention text-yellow-700 dark:text-yellow-300 cursor-help" title="Could not find entry for &quot;${mentionName}&quot;">
                 @${mentionName}
               </span>`;
    }

    lastIndex = mentionRegex.lastIndex;
  }

  html += description.substring(lastIndex);

  return html;
}

export const getYouTubeEmbedUrl = (url: string): string | null => {
  if (!url) return null;

  const youtubeRegex =
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;

  const match = url.match(youtubeRegex);

  if (match && match[1]) {
    return `https://www.youtube.com/embed/${match[1]}`;
  }

  return null;
};

export function exportToCSV(
  entries: AnyEntry[],
  filename: string = "f3-codex-export.csv",
) {
  if (!entries || entries.length === 0) {
    return;
  }

  const replacer = (_key: string, value: any) =>
    value === null || value === undefined ? "" : value;

  const header = ["ID", "Name", "Description", "Aliases"];
  const csvRows = [
    header.join(","),
    ...entries.map((entry) =>
      [
        JSON.stringify(entry.id, replacer),
        JSON.stringify(entry.name, replacer),
        JSON.stringify(entry.description, replacer),
        JSON.stringify(entry.aliases?.join("; ") || "", replacer),
      ].join(","),
    ),
  ];

  const csvString = csvRows.join("\n");
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
