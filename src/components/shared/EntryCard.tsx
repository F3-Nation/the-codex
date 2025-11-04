"use client";

import type { AnyEntry, ExiconEntry } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Pencil, Copy, ExternalLink, XCircle } from "lucide-react";
import Link from "next/link";
import { useState, useMemo } from "react";
import { SuggestionEditForm } from "@/components/submission/SuggestionEditForm";
import { useToast } from "@/hooks/use-toast";
import { getYouTubeEmbedUrl } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  copyToClipboard,
  isInIframe as isInIframeUtil,
  showCopyPrompt,
} from "@/lib/clipboard";
import { generateEntryUrl, getEntryBaseUrl } from "@/lib/route-utils";

interface EntryCardProps {
  entry: AnyEntry & {
    mentionedEntries?: string[];
    resolvedMentionsData?: Record<string, AnyEntry>;
  };
}

const MAX_DESC_LENGTH_PREVIEW = 150;

const renderDescriptionWithMentions = (
  description: string | undefined,
  resolvedMentionsData?: Record<string, AnyEntry>,
  colorVariant: "default" | "vibrant" = "default",
) => {
  if (!description) {
    return <span>No description available.</span>;
  }

  const mentionColors =
    colorVariant === "vibrant"
      ? [
          "text-blue-600 hover:text-blue-700",
          "text-purple-600 hover:text-purple-700",
          "text-green-600 hover:text-green-700",
          "text-orange-600 hover:text-orange-700",
          "text-red-600 hover:text-red-700",
          "text-teal-600 hover:text-teal-700",
          "text-pink-600 hover:text-pink-700",
          "text-indigo-600 hover:text-indigo-700",
        ]
      : [
          "text-blue-500 hover:text-blue-600",
          "text-purple-500 hover:text-purple-600",
          "text-green-500 hover:text-green-600",
          "text-orange-500 hover:text-orange-600",
          "text-red-500 hover:text-red-600",
          "text-teal-500 hover:text-teal-600",
        ];

  const foundMentions: {
    index: number;
    text: string;
    entry: AnyEntry;
  }[] = [];
  const addedMentions = new Set<string>();

  if (resolvedMentionsData) {
    Object.values(resolvedMentionsData).forEach((entry) => {
      const entryKey = `${entry.type}-${entry.id}`;

      const mainSearchString = `@${entry.name}`;
      let lastIndexMain = description.indexOf(mainSearchString, 0);
      while (lastIndexMain !== -1) {
        const uniqueMentionKey = `${entryKey}-${lastIndexMain}`;
        if (!addedMentions.has(uniqueMentionKey)) {
          foundMentions.push({
            index: lastIndexMain,
            text: mainSearchString,
            entry,
          });
          addedMentions.add(uniqueMentionKey);
        }
        lastIndexMain = description.indexOf(
          mainSearchString,
          lastIndexMain + 1,
        );
      }

      entry.aliases?.forEach((alias) => {
        const aliasName = typeof alias === "string" ? alias : alias.name;
        const aliasSearchString = `@${aliasName}`;
        let lastIndexAlias = description.indexOf(aliasSearchString, 0);
        while (lastIndexAlias !== -1) {
          const uniqueMentionKey = `${entryKey}-${lastIndexAlias}`;
          if (!addedMentions.has(uniqueMentionKey)) {
            foundMentions.push({
              index: lastIndexAlias,
              text: aliasSearchString,
              entry,
            });
            addedMentions.add(uniqueMentionKey);
          }
          lastIndexAlias = description.indexOf(
            aliasSearchString,
            lastIndexAlias + 1,
          );
        }
      });
    });
  }

  foundMentions.sort((a, b) => a.index - b.index);

  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  let mentionCount = 0;

  foundMentions.forEach((mention) => {
    if (mention.index > lastIndex) {
      parts.push(description.substring(lastIndex, mention.index));
    }

    const colorClass = mentionColors[mentionCount % mentionColors.length];

    parts.push(
      <HoverCard
        key={`mention-${mention.index}-${mention.entry.id}`}
        openDelay={200}
        closeDelay={100}
      >
        <HoverCardTrigger asChild>
          <Link
            href={`/${getEntryBaseUrl(mention.entry.type as "exicon" | "lexicon")}?entryId=${mention.entry.id}`}
          >
            <span
              className={`${colorClass} underline hover:no-underline cursor-pointer font-medium transition-colors duration-200`}
            >
              {mention.text}
            </span>
          </Link>
        </HoverCardTrigger>
        <HoverCardContent className="w-80 p-4" side="top" align="center">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-primary">
                {mention.entry.name}
              </h4>
              <Badge variant="outline" className="text-xs">
                {mention.entry.type === "exicon" ? "Exercise" : "Term"}
              </Badge>
            </div>

            {mention.entry.aliases && mention.entry.aliases.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Also:{" "}
                {mention.entry.aliases
                  .map((alias) =>
                    typeof alias === "string" ? alias : alias.name,
                  )
                  .slice(0, 2)
                  .join(", ")}
                {mention.entry.aliases.length > 2 && "..."}
              </p>
            )}

            <p className="text-sm text-foreground leading-relaxed">
              {mention.entry.description
                ? (() => {
                    const cleanDesc = mention.entry.description
                      .replace(/<[^>]*>/g, "")
                      .replace(/@[A-Za-z0-9\s_.-]+/g, "[ref]");
                    return cleanDesc.length > 120
                      ? `${cleanDesc.substring(0, 120)}...`
                      : cleanDesc;
                  })()
                : "No description available."}
            </p>

            {mention.entry.type === "exicon" &&
              (mention.entry as ExiconEntry).tags &&
              (mention.entry as ExiconEntry).tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {(mention.entry as ExiconEntry).tags
                    .slice(0, 3)
                    .map((tag) => (
                      <Badge
                        key={tag.id}
                        variant="secondary"
                        className="text-xs px-1 py-0"
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  {(mention.entry as ExiconEntry).tags.length > 3 && (
                    <span className="text-xs text-muted-foreground">
                      +{(mention.entry as ExiconEntry).tags.length - 3}
                    </span>
                  )}
                </div>
              )}

            <div className="pt-2 border-t">
              <Link
                href={`/${getEntryBaseUrl(mention.entry.type as "exicon" | "lexicon")}?entryId=${mention.entry.id}`}
                className="text-xs text-blue-500 hover:text-blue-600 hover:underline"
              >
                View full entry →
              </Link>
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>,
    );
    mentionCount++;
    lastIndex = mention.index + mention.text.length;
  });

  const textAfter = description.substring(lastIndex);
  if (textAfter) {
    parts.push(textAfter);
  }

  return parts;
};

export function EntryCard({ entry }: EntryCardProps) {
  const { toast } = useToast();
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isSuggestEditFormOpen, setIsSuggestEditFormOpen] = useState(false);

  const previewDescriptionContent = useMemo(() => {
    if (!entry.description) return "";
    const needsTruncation = entry.description.length > MAX_DESC_LENGTH_PREVIEW;
    if (needsTruncation) {
      return entry.description.substring(0, MAX_DESC_LENGTH_PREVIEW) + "...";
    }
    return entry.description;
  }, [entry.description]);

  const showGradient = useMemo(() => {
    if (!entry.description) return false;
    return entry.description.length > MAX_DESC_LENGTH_PREVIEW;
  }, [entry.description]);

  const fullDescription = entry.description || "";

  const handleSuggestionSubmit = (suggestionData: any) => {
    toast({
      title: "Suggestion Submitted",
      description: `Your suggestions for "${entry.name}" have been recorded. Thank you!`,
    });
    setIsSuggestEditFormOpen(false);
  };

  const handleCopyVideoLink = async () => {
    if (entry.type === "exicon" && (entry as ExiconEntry).videoLink) {
      const videoUrl = (entry as ExiconEntry).videoLink!;
      const result = await copyToClipboard(videoUrl);

      if (result.success) {
        toast({
          title: "Video Link Copied!",
          description: `The video link has been copied to your clipboard using ${result.method}.`,
        });
      } else {
        // If all automatic methods fail, show manual copy prompt
        if (isInIframeUtil()) {
          showCopyPrompt(videoUrl);
          toast({
            title: "Manual Copy Required",
            description: "Please copy the video link from the popup dialog.",
          });
        } else {
          toast({
            title: "Failed to Copy",
            description: result.error || "Could not copy the video link.",
            variant: "destructive",
          });
        }
      }
    }
  };

  const handleCopyEntryContent = async (event: React.MouseEvent) => {
    event.stopPropagation();
    const url = generateEntryUrl(entry.id, entry.type as "exicon" | "lexicon");

    const result = await copyToClipboard(url);

    if (result.success) {
      toast({
        title: `${entry.name} URL Copied!`,
        description: `The link has been copied to your clipboard using ${result.method}.`,
      });
    } else {
      // If all automatic methods fail, show manual copy prompt
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

  const videoLink =
    entry.type === "exicon" ? (entry as ExiconEntry).videoLink : undefined;
  const embedUrl = videoLink ? getYouTubeEmbedUrl(videoLink) : null;

  const CardComponent = (
    <Card className="w-full shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col h-full cursor-pointer">
      <CardHeader>
        <div className="flex justify-between items-start gap-2">
          <div className="flex-grow">
            <CardTitle className="text-xl font-semibold text-primary">
              {entry.name}
            </CardTitle>
            {entry.aliases && entry.aliases.length > 0 ? (
              <p className="text-sm text-muted-foreground italic">
                Also known as:{" "}
                {entry.aliases
                  .map((alias) =>
                    typeof alias === "string" ? alias : alias.name,
                  )
                  .join(", ")}
              </p>
            ) : null}
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopyEntryContent}
                  className="ml-auto flex-shrink-0 h-8 w-8 text-muted-foreground hover:text-accent"
                  aria-label="Copy entry content"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Copy Entry URL</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>

      <CardContent className="flex-grow space-y-3">
        <div className="prose prose-sm max-w-none text-foreground break-words relative max-h-[4.5rem] overflow-hidden">
          <div>
            {renderDescriptionWithMentions(
              previewDescriptionContent,
              entry.resolvedMentionsData,
              "default",
            )}
          </div>
          {showGradient && (
            <div className="absolute bottom-0 left-0 w-full h-6 bg-gradient-to-t from-card via-card/80 to-transparent" />
          )}
        </div>
      </CardContent>

      <CardFooter className="flex flex-wrap gap-2 pt-4 border-t mt-auto">
        {entry.type === "exicon" &&
        Array.isArray((entry as ExiconEntry).tags) &&
        (entry as ExiconEntry).tags.length > 0
          ? (entry as ExiconEntry).tags.map((tag) => (
              <Badge key={tag.id} variant="secondary" className="font-normal">
                {tag.name}
              </Badge>
            ))
          : null}
      </CardFooter>
    </Card>
  );

  return (
    <div className="relative">
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogTrigger asChild>{CardComponent}</DialogTrigger>

        <DialogContent
          className="sm:max-w-[725px] max-h-[90vh] flex flex-col"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-2xl text-primary">
              {entry.name}
            </DialogTitle>
            {entry.aliases && entry.aliases.length > 0 ? (
              <CardDescription className="text-sm italic mt-1">
                Also known as:{" "}
                {entry.aliases
                  .map((alias) =>
                    typeof alias === "string" ? alias : alias.name,
                  )
                  .join(", ")}
              </CardDescription>
            ) : null}
          </DialogHeader>

          <div className="flex-grow overflow-y-auto space-y-4 pr-3 py-2">
            <DialogDescription asChild>
              <div className="prose prose-base max-w-none text-foreground break-words leading-relaxed">
                {renderDescriptionWithMentions(
                  fullDescription,
                  entry.resolvedMentionsData,
                  "vibrant",
                )}
              </div>
            </DialogDescription>

            {entry.type === "exicon" && (
              <div className="space-y-3">
                {embedUrl ? (
                  <>
                    <div className="aspect-video">
                      <iframe
                        width="100%"
                        height="100%"
                        src={embedUrl}
                        title={`YouTube video player for ${entry.name}`}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        className="rounded-md shadow-md"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={handleCopyVideoLink}
                        variant="outline"
                        size="sm"
                      >
                        <Copy className="mr-2 h-4 w-4" /> Copy Video Link
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <Link
                          href={videoLink || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="mr-2 h-4 w-4" /> Open
                          Original Video
                        </Link>
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No video available for this exercise.
                  </p>
                )}
              </div>
            )}

            {entry.type === "exicon" && (
              <div className="pt-2">
                <h4 className="text-md font-semibold mb-2">Tags:</h4>
                {(entry as ExiconEntry).tags &&
                (entry as ExiconEntry).tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {(entry as ExiconEntry).tags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant="secondary"
                        className="font-normal"
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No tags available for this exercise.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex-shrink-0 pt-4 border-t flex flex-col sm:flex-row justify-end gap-2">
            <Dialog
              open={isSuggestEditFormOpen}
              onOpenChange={setIsSuggestEditFormOpen}
            >
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  <Pencil className="mr-2 h-4 w-4" /> Suggest Edits
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[725px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Suggest Edits for: {entry.name}</DialogTitle>
                </DialogHeader>
                <SuggestionEditForm
                  entryToSuggestEditFor={entry}
                  onFormSubmit={handleSuggestionSubmit}
                  onClose={() => setIsSuggestEditFormOpen(false)}
                />
              </DialogContent>
            </Dialog>
            <DialogClose asChild>
              <Button variant="ghost" className="w-full sm:w-auto">
                <XCircle className="mr-2 h-4 w-4" /> Close
              </Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
