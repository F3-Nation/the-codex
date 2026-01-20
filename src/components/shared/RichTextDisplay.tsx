"use client";

import { useState, useEffect } from "react";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card";
import { CardDescription } from "@/components/ui/card";
import type { AnyEntry, ReferencedEntry } from "@/lib/types";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { getEntryBaseUrl } from "@/lib/route-utils";

interface RichTextDisplayProps {
  htmlContent: string;
  mentionedEntries?: Record<string, AnyEntry | ReferencedEntry>;
  className?: string;
  truncate?: boolean;
  maxLength?: number;
}

interface ProcessedMention {
  id: string;
  name: string;
  text: string;
  type: string;
  description: string;
}

export function RichTextDisplay({
  htmlContent,
  mentionedEntries = {},
  className,
  truncate = false,
  maxLength = 150,
}: RichTextDisplayProps) {
  // State to track if we've mounted (for hydration-safe rendering)
  const [hasMounted, setHasMounted] = useState(false);
  const [processedData, setProcessedData] = useState<{
    html: string;
    mentions: ProcessedMention[];
  } | null>(null);

  // Get the initial/server-side content
  const getInitialContent = () => {
    if (!htmlContent) return "";

    let content = htmlContent;
    if (truncate) {
      const textContent = content.replace(/<[^>]*>/g, "");
      if (textContent.length > maxLength) {
        const truncated = textContent.substring(0, maxLength) + "...";
        content = `<p>${truncated}</p>`;
      }
    }
    return content;
  };

  const initialContent = getInitialContent();

  // Process mentions after mount to avoid hydration mismatch
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Valid pattern for detecting client-side mount
    setHasMounted(true);

    if (!htmlContent) return;

    let content = htmlContent;
    if (truncate) {
      const textContent = content.replace(/<[^>]*>/g, "");
      if (textContent.length > maxLength) {
        const truncated = textContent.substring(0, maxLength) + "...";
        content = `<p>${truncated}</p>`;
      }
    }

    // Create a temporary DOM element to parse the HTML
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = content;

    // Find all mention spans
    const mentionSpans = tempDiv.querySelectorAll("span.mention");
    const mentions: ProcessedMention[] = [];

    // Replace mentions with interactive links
    mentionSpans.forEach((span) => {
      const entryId = span.getAttribute("data-id");
      const entryName = span.getAttribute("data-label") || span.getAttribute("data-name") || span.textContent?.replace(/^@/, "") || "";
      const entry = entryId ? mentionedEntries[entryId] : undefined;
      const entryType = entry?.type || span.getAttribute("data-type") || "exicon";
      const entryDescription = entry?.description || span.getAttribute("data-entry-description") || "";

      if (entryId) {
        const displayName = entry?.name || entryName;

        mentions.push({
          id: entryId,
          name: displayName,
          text: `@${displayName}`,
          type: entryType,
          description: entryDescription,
        });

        // Create a link element with correct route format
        const baseUrl = getEntryBaseUrl(entryType as "exicon" | "lexicon");
        const link = document.createElement("a");
        link.href = `/${baseUrl}?entryId=${entryId}`;
        link.className = "mention-link inline text-blue-600 hover:underline cursor-pointer hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950 px-0.5 rounded no-underline";
        link.textContent = `@${displayName}`;

        // Wrap in hover card trigger
        const wrapper = document.createElement("span");
        wrapper.setAttribute("data-mention-id", entryId);
        wrapper.appendChild(link);

        span.replaceWith(wrapper);
      }
    });

    // Process plain text mentions (like @Arm circles)
    const textNodes: Node[] = [];
    const walker = document.createTreeWalker(
      tempDiv,
      NodeFilter.SHOW_TEXT,
      null
    );

    let node;
    while ((node = walker.nextNode())) {
      textNodes.push(node);
    }

    // Regex to match @mentions
    const mentionRegex = /@([a-zA-Z][a-zA-Z0-9\s_.-]*[a-zA-Z0-9]|[a-zA-Z])/g;

    textNodes.forEach((textNode) => {
      const text = textNode.textContent || "";
      if (!text.includes("@")) return;

      const matches = Array.from(text.matchAll(mentionRegex));
      if (matches.length === 0) return;

      const fragment = document.createDocumentFragment();
      let lastIndex = 0;

      matches.forEach((match) => {
        let mentionText = match[0];
        const mentionName = match[1].trim();
        const index = match.index!;

        if (index > lastIndex) {
          fragment.appendChild(
            document.createTextNode(text.substring(lastIndex, index))
          );
        }

        // Try to find the entry in mentionedEntries by name
        let entry = Object.values(mentionedEntries).find(
          (e) => e.name.toLowerCase() === mentionName.toLowerCase()
        );

        // If no exact match and mention has multiple words, try progressively shorter versions
        if (!entry && mentionName.includes(' ')) {
          const words = mentionName.split(' ');
          for (let i = words.length - 1; i > 0; i--) {
            const shorterName = words.slice(0, i).join(' ');
            entry = Object.values(mentionedEntries).find(
              (e) => e.name.toLowerCase() === shorterName.toLowerCase()
            );
            if (entry) {
              mentionText = `@${entry.name}`;
              break;
            }
          }
        }

        if (entry) {
          const entryBaseUrl = getEntryBaseUrl(entry.type as "exicon" | "lexicon");
          const link = document.createElement("a");
          link.href = `/${entryBaseUrl}?entryId=${entry.id}`;
          link.className = "mention-link inline text-blue-600 hover:underline cursor-pointer hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950 px-0.5 rounded no-underline";
          link.textContent = mentionText;

          const wrapper = document.createElement("span");
          wrapper.setAttribute("data-mention-id", entry.id);
          wrapper.appendChild(link);

          fragment.appendChild(wrapper);

          mentions.push({
            id: entry.id,
            name: entry.name,
            text: mentionText,
            type: entry.type || "exicon",
            description: entry.description || "",
          });
        } else {
          fragment.appendChild(document.createTextNode(mentionText));
        }

        lastIndex = index + mentionText.length;
      });

      if (lastIndex < text.length) {
        fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
      }

      textNode.parentNode?.replaceChild(fragment, textNode);
    });

    // Clean up blockquotes
    const blockquotes = tempDiv.querySelectorAll("blockquote");
    blockquotes.forEach((blockquote) => {
      blockquote.className = "rich-blockquote";
    });

    // Add table styling
    const tables = tempDiv.querySelectorAll("table");
    tables.forEach((table) => {
      table.className = "rich-text-table w-full border-collapse my-4";
      table.querySelectorAll("th").forEach((th) => {
        th.className = "border border-gray-300 dark:border-gray-700 px-3 py-2 text-left font-semibold bg-gray-100 dark:bg-gray-800";
      });
      table.querySelectorAll("td").forEach((td) => {
        td.className = "border border-gray-300 dark:border-gray-700 px-3 py-2";
      });
    });

    // Style lists
    tempDiv.querySelectorAll("ul").forEach((ul) => {
      ul.className = "list-disc pl-5 my-2 space-y-1 text-gray-800 dark:text-gray-200";
    });
    tempDiv.querySelectorAll("ol").forEach((ol) => {
      ol.className = "list-decimal pl-5 my-2 space-y-1 text-gray-800 dark:text-gray-200";
    });

    setProcessedData({
      html: tempDiv.innerHTML,
      mentions,
    });
  }, [htmlContent, truncate, maxLength, mentionedEntries]);

  // Server-side and initial client render - just show the HTML
  if (!hasMounted || !processedData) {
    return (
      <div className={cn("rich-text-display max-w-none", className)}>
        <div
          dangerouslySetInnerHTML={{ __html: initialContent }}
          suppressHydrationWarning
        />
      </div>
    );
  }

  // Client-side render after processing
  const { html, mentions } = processedData;

  // If no mentions, just render the processed HTML
  if (mentions.length === 0) {
    return (
      <div className={cn("rich-text-display max-w-none", className)}>
        <div
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    );
  }

  // Render with hover cards for mentions
  const parts: React.ReactNode[] = [];
  let remainingHtml = html;

  mentions.forEach((mention, index) => {
    const marker = `<span data-mention-id="${mention.id}">`;
    const endMarker = "</span>";
    const startIndex = remainingHtml.indexOf(marker);

    if (startIndex !== -1) {
      const endIndex = remainingHtml.indexOf(endMarker, startIndex + marker.length);

      if (endIndex !== -1) {
        // Add HTML before the mention
        const beforeHtml = remainingHtml.substring(0, startIndex);
        if (beforeHtml) {
          parts.push(
            <span
              key={`before-${index}`}
              dangerouslySetInnerHTML={{ __html: beforeHtml }}
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
        const entryUrl = `/${getEntryBaseUrl(entry.type as "exicon" | "lexicon")}?entryId=${entry.id}`;

        parts.push(
          <HoverCard key={`mention-${index}`}>
            <HoverCardTrigger asChild>
              <Link
                href={entryUrl}
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
                {entry.description
                  ? entry.description.replace(/<[^>]*>/g, "").substring(0, 150) + (entry.description.length > 150 ? "..." : "")
                  : "No description available."}
              </CardDescription>
              <Link
                href={entryUrl}
                className="text-xs text-blue-600 hover:underline mt-2 block dark:text-blue-400"
                onClick={(e) => e.stopPropagation()}
              >
                View Entry Page
              </Link>
            </HoverCardContent>
          </HoverCard>
        );

        remainingHtml = remainingHtml.substring(endIndex + endMarker.length);
      }
    }
  });

  // Add any remaining HTML
  if (remainingHtml) {
    parts.push(
      <span
        key="remaining-html"
        dangerouslySetInnerHTML={{ __html: remainingHtml }}
      />
    );
  }

  return (
    <div className={cn("rich-text-display max-w-none", className)}>
      {parts}
    </div>
  );
}
