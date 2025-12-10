"use client";

import { useMemo } from "react";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card";
import { CardDescription } from "@/components/ui/card";
import type { AnyEntry, ReferencedEntry } from "@/lib/types";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface RichTextDisplayProps {
  htmlContent: string;
  mentionedEntries?: Record<string, AnyEntry | ReferencedEntry>;
  className?: string;
  truncate?: boolean;
  maxLength?: number;
}

export function RichTextDisplay({
  htmlContent,
  mentionedEntries = {},
  className,
  truncate = false,
  maxLength = 150,
}: RichTextDisplayProps) {
  // Check if we're on the client
  const isClient = typeof window !== "undefined";

  // Process HTML and render content
  const renderedContent = useMemo(() => {
    if (!htmlContent) return null;

    let content = htmlContent;

    // If truncation is needed
    if (truncate) {
      const textContent = content.replace(/<[^>]*>/g, "");
      if (textContent.length > maxLength) {
        const truncated = textContent.substring(0, maxLength) + "...";
        content = `<p>${truncated}</p>`;
      }
    }

    // If we're on the server, just return the HTML as-is
    if (!isClient) {
      return (
        <div
          dangerouslySetInnerHTML={{ __html: content }}
          suppressHydrationWarning
        />
      );
    }

    // Client-side processing
    // Create a temporary DOM element to parse the HTML
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = content;

    // Find all mention spans
    const mentionSpans = tempDiv.querySelectorAll("span.mention");
    const mentions: Array<{
      id: string;
      name: string;
      text: string;
      type: string;
      description: string;
    }> = [];

    // Replace mentions with interactive links
    mentionSpans.forEach((span) => {
      const entryId = span.getAttribute("data-id");
      const entryName = span.getAttribute("data-name") || span.textContent || "";
      const entryType = span.getAttribute("data-type") || "lexicon";
      const entryDescription = span.getAttribute("data-entry-description") || "";
      const mentionText = span.textContent || "";

      if (entryId) {
        mentions.push({
          id: entryId,
          name: entryName,
          text: mentionText,
          type: entryType,
          description: entryDescription,
        });

        // Create a link element
        const link = document.createElement("a");
        link.href = `/${entryType}/${entryId}`;
        link.className = "mention-link inline text-blue-600 hover:underline cursor-pointer hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950 px-0.5 rounded no-underline";
        link.textContent = mentionText;

        // Wrap in hover card trigger
        const wrapper = document.createElement("span");
        wrapper.setAttribute("data-mention-id", entryId);
        wrapper.appendChild(link);

        span.replaceWith(wrapper);
      }
    });

    // Clean up blockquotes - remove any quote characters
    const blockquotes = tempDiv.querySelectorAll("blockquote");
    blockquotes.forEach((blockquote) => {
      blockquote.className = "rich-blockquote";

      // Remove any quote characters from the text content
      const children = Array.from(blockquote.childNodes);
      children.forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          let text = child.textContent || "";
          text = text.trim();

          if ((text.startsWith('"') && text.endsWith('"')) ||
            (text.startsWith("'") && text.endsWith("'"))) {
            text = text.slice(1, -1).trim();
          }

          child.textContent = text;
        }
      });
    });

    // Add table styling
    const tables = tempDiv.querySelectorAll("table");
    tables.forEach((table) => {
      table.className = "rich-text-table w-full border-collapse my-4";

      const headers = table.querySelectorAll("th");
      headers.forEach((th) => {
        th.className = "border border-gray-300 dark:border-gray-700 px-3 py-2 text-left font-semibold bg-gray-100 dark:bg-gray-800";
      });

      const cells = table.querySelectorAll("td");
      cells.forEach((td) => {
        td.className = "border border-gray-300 dark:border-gray-700 px-3 py-2";
      });
    });

    // Style lists
    const ulElements = tempDiv.querySelectorAll("ul");
    ulElements.forEach((ul) => {
      ul.className = "list-disc pl-5 my-2 space-y-1 text-gray-800 dark:text-gray-200";
    });

    const olElements = tempDiv.querySelectorAll("ol");
    olElements.forEach((ol) => {
      ol.className = "list-decimal pl-5 my-2 space-y-1 text-gray-800 dark:text-gray-200";
    });

    // Now render the HTML with hover cards for mentions
    const finalHtml = tempDiv.innerHTML;

    // If there are no mentions, just render the HTML
    if (mentions.length === 0) {
      return (
        <div
          dangerouslySetInnerHTML={{ __html: finalHtml }}
          suppressHydrationWarning
        />
      );
    }

    // If there are mentions, we need to create hover cards
    // This is a bit more complex because we need to interleave HTML and React components
    const parts: React.ReactNode[] = [];
    let html = finalHtml;

    mentions.forEach((mention, index) => {
      const marker = `<span data-mention-id="${mention.id}">`;
      const endMarker = "</span>";
      const startIndex = html.indexOf(marker);

      if (startIndex !== -1) {
        const endIndex = html.indexOf(endMarker, startIndex + marker.length);

        if (endIndex !== -1) {
          // Add HTML before the mention
          const beforeHtml = html.substring(0, startIndex);
          if (beforeHtml) {
            parts.push(
              <span
                key={`before-${index}`}
                dangerouslySetInnerHTML={{ __html: beforeHtml }}
                suppressHydrationWarning
              />
            );
          }

          // Add the mention with hover card
          const entry = mentionedEntries[mention.id] || {
            id: mention.id,
            name: mention.name,
            description: mention.description,
            type: mention.type,
          };

          parts.push(
            <HoverCard key={`mention-${index}`}>
              <HoverCardTrigger asChild>
                <Link
                  href={`/${entry.type}/${entry.id}`}
                  className="mention-link inline text-blue-600 hover:underline cursor-pointer hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950 px-0.5 rounded no-underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {mention.text}
                </Link>
              </HoverCardTrigger>
              <HoverCardContent className="w-80 p-3" align="start">
                <p className="font-semibold text-foreground mb-1">
                  {entry.name}
                </p>
                <CardDescription className="text-muted-foreground">
                  {entry.description || "No description available."}
                </CardDescription>
                <Link
                  href={`/${entry.type}/${entry.id}`}
                  className="text-xs text-blue-600 hover:underline mt-2 block dark:text-blue-400"
                  onClick={(e) => e.stopPropagation()}
                >
                  View Entry Page
                </Link>
              </HoverCardContent>
            </HoverCard>
          );

          // Update html to remaining content
          html = html.substring(endIndex + endMarker.length);
        }
      }
    });

    // Add any remaining HTML
    if (html) {
      parts.push(
        <span
          key="remaining-html"
          dangerouslySetInnerHTML={{ __html: html }}
          suppressHydrationWarning
        />
      );
    }

    return parts;
  }, [htmlContent, truncate, maxLength, mentionedEntries, isClient]);

  return (
    <div className={cn("rich-text-display max-w-none", className)}>
      {renderedContent}
    </div>
  );
}
