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
  const processedHtml = useMemo(() => {
    if (!htmlContent) return "";

    // If truncation is needed
    if (truncate) {
      // Strip HTML tags for character count
      const textContent = htmlContent.replace(/<[^>]*>/g, "");
      if (textContent.length > maxLength) {
        // Simple truncation - in production you might want more sophisticated logic
        const truncated = textContent.substring(0, maxLength) + "...";
        return `<p>${truncated}</p>`;
      }
    }

    return htmlContent;
  }, [htmlContent, truncate, maxLength]);

  // Parse HTML and render with React components for mentions
  const renderContent = useMemo(() => {
    if (!processedHtml) {
      return null;
    }

    // Create a temporary DOM element to parse the HTML
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = processedHtml;

    // Find all mention spans
    const mentionSpans = tempDiv.querySelectorAll("span.mention");

    // Create a unique key for React rendering
    let mentionKey = 0;

    // Replace mention spans with React components
    mentionSpans.forEach((span) => {
      const entryId = span.getAttribute("data-id");
      const entryName = span.getAttribute("data-name") || span.textContent || "";
      const entryType = span.getAttribute("data-type");
      const entryDescription = span.getAttribute("data-entry-description");

      if (entryId) {
        // Get entry data from mentionedEntries or use data attributes
        const entry = mentionedEntries[entryId] || {
          id: entryId,
          name: entryName,
          description: entryDescription || "",
          type: entryType || "lexicon",
        };

        // Create a placeholder that we'll replace with React component
        const placeholder = document.createElement("span");
        placeholder.setAttribute("data-mention-placeholder", String(mentionKey));
        placeholder.setAttribute("data-entry-id", entryId);
        placeholder.setAttribute("data-entry-name", entry.name);
        placeholder.setAttribute("data-entry-description", entry.description || "");
        placeholder.setAttribute("data-entry-type", entry.type);
        placeholder.textContent = span.textContent;
        span.replaceWith(placeholder);
        mentionKey++;
      }
    });

    return tempDiv.innerHTML;
  }, [processedHtml, mentionedEntries]);

  // Render HTML with mentions as interactive hover cards
  const renderWithMentions = () => {
    if (!renderContent) {
      return null;
    }

    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = renderContent;
    const placeholders = tempDiv.querySelectorAll("[data-mention-placeholder]");

    const parts: React.ReactNode[] = [];
    let html = renderContent;
    const mentionComponents: { [key: string]: React.ReactNode } = {};

    placeholders.forEach((placeholder) => {
      const key = placeholder.getAttribute("data-mention-placeholder");
      const entryId = placeholder.getAttribute("data-entry-id");
      const entryName = placeholder.getAttribute("data-entry-name");
      const entryDescription = placeholder.getAttribute("data-entry-description");
      const entryType = placeholder.getAttribute("data-entry-type");

      if (key && entryId) {
        const mentionText = placeholder.textContent || "";

        mentionComponents[key] = (
          <HoverCard key={`mention-${key}`}>
            <HoverCardTrigger asChild>
              <Link
                href={`/${entryType}/${entryId}`}
                className="text-blue-600 underline cursor-pointer hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950 px-1 rounded no-underline"
              >
                {mentionText}
              </Link>
            </HoverCardTrigger>
            <HoverCardContent className="prose text-sm max-w-xs p-3">
              <p className="font-semibold text-foreground mb-1">
                {entryName}
              </p>
              <CardDescription className="text-muted-foreground">
                {entryDescription || "No description available."}
              </CardDescription>
              <Link
                href={`/${entryType}/${entryId}`}
                className="text-xs text-blue-600 hover:underline mt-2 block dark:text-blue-400"
              >
                View Entry Page
              </Link>
            </HoverCardContent>
          </HoverCard>
        );

        // Replace placeholder with a unique marker
        html = html.replace(
          placeholder.outerHTML,
          `<span data-mention-${key}></span>`
        );
      }
    });

    // Split HTML by mention markers and interleave with React components
    let finalParts: React.ReactNode[] = [];
    let remainingHtml = html;
    let partKey = 0;

    Object.keys(mentionComponents).forEach((key) => {
      const marker = `<span data-mention-${key}></span>`;
      const index = remainingHtml.indexOf(marker);

      if (index !== -1) {
        const before = remainingHtml.substring(0, index);
        if (before) {
          finalParts.push(
            <span
              key={`html-${partKey++}`}
              dangerouslySetInnerHTML={{ __html: before }}
            />
          );
        }
        finalParts.push(mentionComponents[key]);
        remainingHtml = remainingHtml.substring(index + marker.length);
      }
    });

    if (remainingHtml) {
      finalParts.push(
        <span
          key={`html-${partKey}`}
          dangerouslySetInnerHTML={{ __html: remainingHtml }}
        />
      );
    }

    return finalParts;
  };

  return (
    <div className={cn("prose prose-sm dark:prose-invert max-w-none", className)}>
      {renderWithMentions()}
    </div>
  );
}
