import type { AnyEntry, ReferencedEntry, Alias } from "./types";

/**
 * Escapes HTML special characters to prevent XSS
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Converts plain text with @mentions to HTML format
 * This is used for backward compatibility with existing plain text entries
 *
 * @param text - Plain text content with @mentions
 * @param mentionedEntries - Array of mentioned entries (optional)
 * @returns HTML string with mentions wrapped in span tags
 */
export function convertPlainTextToHtml(
  text: string,
  mentionedEntries?: Array<AnyEntry | ReferencedEntry>
): string {
  if (!text) {
    return "<p></p>";
  }

  // Create a map of entry names to entry data for quick lookup
  const entryMap = new Map<string, AnyEntry | ReferencedEntry>();
  if (mentionedEntries) {
    mentionedEntries.forEach((entry) => {
      entryMap.set(entry.name.toLowerCase(), entry);
      // Also add aliases to the map (only AnyEntry has aliases)
      if ("aliases" in entry && entry.aliases && Array.isArray(entry.aliases)) {
        entry.aliases.forEach((alias: string | Alias) => {
          const aliasName =
            typeof alias === "string" ? alias : alias.name;
          entryMap.set(aliasName.toLowerCase(), entry);
        });
      }
    });
  }

  // Regex to match @mentions (same pattern as mentionUtils.ts)
  const mentionRegex = /@([a-zA-Z0-9\s_.-]+)(?=[\s,.!?;:]|$)/g;

  // Split text by newlines to create paragraphs
  const paragraphs = text.split("\n\n");

  const htmlParagraphs = paragraphs.map((paragraph) => {
    if (!paragraph.trim()) {
      return "";
    }

    // Process mentions in the paragraph
    let processedText = "";
    let lastIndex = 0;
    let match;

    // Reset regex lastIndex
    mentionRegex.lastIndex = 0;

    while ((match = mentionRegex.exec(paragraph)) !== null) {
      const mentionText = match[1];
      const entry = entryMap.get(mentionText.toLowerCase());

      // Add text before the mention (escaped)
      processedText += escapeHtml(paragraph.slice(lastIndex, match.index));

      if (entry) {
        // Create mention span with data attributes
        processedText += `<span class="mention" data-id="${entry.id}" data-name="${escapeHtml(entry.name)}" data-type="${entry.type}" data-entry-description="${escapeHtml(entry.description || "")}">@${escapeHtml(mentionText)}</span>`;
      } else {
        // If no entry found, just keep the @mention as plain text
        processedText += escapeHtml(match[0]);
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text after last mention
    processedText += escapeHtml(paragraph.slice(lastIndex));

    // Convert single newlines within a paragraph to <br> tags
    processedText = processedText.replace(/\n/g, "<br>");

    return `<p>${processedText}</p>`;
  });

  // Filter out empty paragraphs and join
  const html = htmlParagraphs.filter((p) => p).join("");

  return html || "<p></p>";
}

/**
 * Converts plain text to simple HTML paragraphs without mention processing
 * Useful for simple text conversion
 *
 * @param text - Plain text content
 * @returns HTML string with paragraphs
 */
export function textToSimpleHtml(text: string): string {
  if (!text) {
    return "<p></p>";
  }

  const paragraphs = text
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean);

  const html = paragraphs
    .map((p) => {
      const escapedText = escapeHtml(p).replace(/\n/g, "<br>");
      return `<p>${escapedText}</p>`;
    })
    .join("");

  return html || "<p></p>";
}
