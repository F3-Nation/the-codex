import DOMPurify from "dompurify";

/**
 * Sanitizes HTML content to prevent XSS attacks while preserving rich text formatting
 * and mention data attributes.
 *
 * @param html - The HTML string to sanitize
 * @returns Sanitized HTML string safe for rendering
 */
export function sanitizeEditorHtml(html: string): string {
  // Configure DOMPurify with allowed tags and attributes
  const cleanHtml = DOMPurify.sanitize(html, {
    // Allow only safe HTML tags for rich text formatting
    ALLOWED_TAGS: [
      "p",
      "h2",
      "h3",
      "ul",
      "ol",
      "li",
      "blockquote",
      "code",
      "pre",
      "table",
      "thead",
      "tbody",
      "tr",
      "td",
      "th",
      "strong",
      "em",
      "span",
      "br",
      "a",
      "hr",
    ],
    // Allow only safe attributes
    ALLOWED_ATTR: [
      "class",
      "data-id",
      "data-name",
      "data-type",
      "data-entry-id",
      "data-entry-name",
      "data-entry-type",
      "data-entry-description",
      "href",
      "target",
      "rel",
    ],
    // Keep content even if tags are removed
    KEEP_CONTENT: true,
    // Allow external links but sanitize them
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|\/|#)/i,
  });

  return cleanHtml;
}

/**
 * Detects if a string contains HTML tags
 *
 * @param content - The string to check
 * @returns True if the content contains HTML tags
 */
export function isHtmlContent(content: string): boolean {
  return /<[a-z][\s\S]*>/i.test(content);
}
