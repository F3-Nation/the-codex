"use client";

import { useState } from "react";
import { Copy, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  copyToClipboard,
  isInIframe as isInIframeUtil,
  showCopyPrompt,
} from "@/lib/clipboard";
import { generateEntryUrl } from "@/lib/route-utils";
import type { AnyEntry } from "@/lib/types";

interface CopyEntryButtonProps {
  entry: AnyEntry;
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
  showLabel?: boolean;
  className?: string;
}

export function CopyEntryButton({
  entry,
  variant = "ghost",
  size = "icon",
  showLabel = false,
  className = "",
}: CopyEntryButtonProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const stripHtml = (html: string) => {
    return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
  };

  const handleCopyUrl = async (event?: React.MouseEvent) => {
    event?.stopPropagation();
    const url = generateEntryUrl(entry.id, entry.type as "exicon" | "lexicon");

    const result = await copyToClipboard(url);

    if (result.success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: `${entry.name} URL Copied!`,
      });
    } else {
      if (isInIframeUtil()) {
        showCopyPrompt(url);
        toast({
          title: "Manual Copy Required",
          description: "Please copy the link from the popup dialog.",
        });
      } else {
        toast({
          title: "Failed to Copy URL",
          description: result.error || "Could not copy the entry URL.",
          variant: "destructive",
        });
      }
    }
  };

  const handleCopyDetails = async (event?: React.MouseEvent) => {
    event?.stopPropagation();

    const cleanDescription = entry.description
      ? stripHtml(entry.description)
      : "No description available.";

    const details = `${entry.name}

${cleanDescription}`;

    const result = await copyToClipboard(details);

    if (result.success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Details Copied!",
        description: `${entry.name} name and description copied to clipboard.`,
      });
    } else {
      if (isInIframeUtil()) {
        showCopyPrompt(details);
        toast({
          title: "Manual Copy Required",
          description: "Please copy the details from the popup dialog.",
        });
      } else {
        toast({
          title: "Failed to Copy Details",
          description: result.error || "Could not copy the entry details.",
          variant: "destructive",
        });
      }
    }
  };

  const handleCopyAll = async (event?: React.MouseEvent) => {
    event?.stopPropagation();

    const url = generateEntryUrl(entry.id, entry.type as "exicon" | "lexicon");
    const cleanDescription = entry.description
      ? stripHtml(entry.description)
      : "No description available.";

    // Build comprehensive content with formatting
    const parts: string[] = [];

    // Title
    parts.push(`📖 ${entry.name}`);
    parts.push(""); // Empty line

    // Type
    const typeLabel = entry.type === "exicon" ? "Exercise" : "Term";
    parts.push(`Type: ${typeLabel}`);
    parts.push(""); // Empty line

    // Description
    parts.push("Description:");
    parts.push(cleanDescription);
    parts.push(""); // Empty line

    // Aliases
    if (entry.aliases && entry.aliases.length > 0) {
      const aliasNames = entry.aliases.map((a) => a.name).join(", ");
      parts.push(`Also known as: ${aliasNames}`);
      parts.push(""); // Empty line
    }

    // Tags (only for exicon entries)
    if (entry.type === "exicon" && entry.tags && entry.tags.length > 0) {
      const tagNames = entry.tags.map((t) => t.name).join(", ");
      parts.push(`Tags: ${tagNames}`);
      parts.push(""); // Empty line
    }

    // Video Link (only for exicon entries)
    if (entry.type === "exicon" && entry.videoLink) {
      parts.push(`Video: ${entry.videoLink}`);
      parts.push(""); // Empty line
    }

    // URL
    parts.push(`Link: ${url}`);

    const allContent = parts.join("\n");

    const result = await copyToClipboard(allContent);

    if (result.success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "All Details Copied!",
        description: `${entry.name} complete information copied to clipboard.`,
      });
    } else {
      if (isInIframeUtil()) {
        showCopyPrompt(allContent);
        toast({
          title: "Manual Copy Required",
          description: "Please copy the details from the popup dialog.",
        });
      } else {
        toast({
          title: "Failed to Copy",
          description: result.error || "Could not copy the entry content.",
          variant: "destructive",
        });
      }
    }
  };

  if (!showLabel && size === "icon") {
    // Icon button with dropdown
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={variant}
            size={size}
            className={`h-8 w-8 text-muted-foreground hover:text-accent ${className}`}
            aria-label="Copy entry options"
            onClick={(e) => e.stopPropagation()}
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={handleCopyUrl}>
            <Copy className="mr-2 h-4 w-4" />
            Copy URL
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCopyDetails}>
            <Copy className="mr-2 h-4 w-4" />
            Copy Name & Description
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCopyAll}>
            <Copy className="mr-2 h-4 w-4" />
            Copy All
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Button with label and dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={className}
          onClick={(e) => e.stopPropagation()}
        >
          {copied ? (
            <>
              <Check className="mr-2 h-4 w-4 text-green-600" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="mr-2 h-4 w-4" />
              Copy
              <ChevronDown className="ml-1 h-3 w-3" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={handleCopyUrl}>
          <Copy className="mr-2 h-4 w-4" />
          Copy URL
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyDetails}>
          <Copy className="mr-2 h-4 w-4" />
          Copy Name & Description
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyAll}>
          <Copy className="mr-2 h-4 w-4" />
          Copy All
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
