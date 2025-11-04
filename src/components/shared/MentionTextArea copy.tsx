// Updated MentionTextArea component
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card";
import { CardDescription } from "@/components/ui/card";
import type { EntryWithReferences } from "@/lib/types";

interface MentionTextAreaProps {
  value: string;
  onChange: (value: string) => void;
  searchEntries: (query: string) => Promise<EntryWithReferences[]>;
  placeholder?: string;
  rows?: number;
  onMentionsChange?: (mentions: { id: string; name: string }[]) => void;
}

export function MentionTextArea({
  value,
  onChange,
  searchEntries,
  placeholder,
  rows,
  onMentionsChange,
}: MentionTextAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EntryWithReferences[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [mentions, setMentions] = useState<
    { id: string; name: string; description?: string; type?: string }[]
  >([]);

  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedSearch = useCallback(
    (text: string) => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }

      searchTimerRef.current = setTimeout(async () => {
        setLoading(true);
        try {
          const data = await searchEntries(text);
          setResults(data);
        } catch (e) {
          console.error(e);
          setResults([]);
        } finally {
          setLoading(false);
        }
      }, 300);
    },
    [searchEntries],
  );

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (showAutocomplete && query) {
      debouncedSearch(query);
    } else {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
      setResults([]);
    }
  }, [query, showAutocomplete, debouncedSearch]);

  const extractMentionsFromText = useCallback((text: string) => {
    const parts = text.split("@");
    const mentions: string[] = [];

    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      const match = part.match(/^([A-Za-z0-9][^@]*?)(?=\s+[a-z]|\s*$|$)/);
      if (match) {
        const mentionName = match[1].trim();
        if (mentionName) {
          mentions.push(mentionName.toLowerCase());
        }
      }
    }

    return mentions;
  }, []);

  useEffect(() => {
    const currentMentionNamesInText = extractMentionsFromText(value);

    setMentions((prev) => {
      const stillMentioned = prev.filter((m) =>
        currentMentionNamesInText.includes(m.name.toLowerCase()),
      );

      if (
        stillMentioned.length !== prev.length ||
        !stillMentioned.every((m) => prev.some((p) => p.id === m.id))
      ) {
        onMentionsChange?.(
          stillMentioned.map(({ id, name }) => ({ id, name })),
        );
      }

      return stillMentioned;
    });
  }, [value, onMentionsChange, extractMentionsFromText]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    onChange(val);
    const cursorPos = e.target.selectionStart;
    setCursor(cursorPos);

    const textBeforeCursor = val.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      const spaceFollowedByLowercase = textAfterAt.match(/\s+[a-z]/);

      if (!spaceFollowedByLowercase && textAfterAt.length <= 50) {
        setQuery(textAfterAt);
        setShowAutocomplete(true);
      } else {
        setShowAutocomplete(false);
        setQuery("");
      }
    } else {
      setShowAutocomplete(false);
      setQuery("");
    }
  };

  const handleSelect = (entry: EntryWithReferences) => {
    if (!textareaRef.current) return;
    const text = value;
    const pre = text.slice(0, cursor);
    const post = text.slice(cursor);
    const atIdx = pre.lastIndexOf("@");
    const replaced = pre.slice(0, atIdx) + `@${entry.name} `;
    const updated = replaced + post;
    const newCursor = replaced.length;

    onChange(updated);
    setCursor(newCursor);

    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(newCursor, newCursor);
    }, 0);

    setMentions((prev) => {
      const exists = prev.some((m) => m.id === entry.id);
      const next = exists ? prev : [...prev, { ...entry }];

      if (!exists) {
        onMentionsChange?.(next.map(({ id, name }) => ({ id, name })));
      }

      return next;
    });

    setShowAutocomplete(false);
    setQuery("");
    setResults([]);
  };

  const renderFormatted = (text: string) => {
    const parts: React.ReactNode[] = [];

    const textParts = text.split("@");

    if (textParts[0]) {
      parts.push(textParts[0]);
    }

    for (let i = 1; i < textParts.length; i++) {
      const part = textParts[i];

      const match = part.match(/^([A-Za-z0-9][^@]*?)(?=\s+[a-z]|\s*$|$)(.*)/);

      if (match) {
        const mentionName = match[1].trim();
        const remaining = match[2] || "";

        const mention = mentions.find(
          (m) => m.name.toLowerCase() === mentionName.toLowerCase(),
        );

        parts.push(
          <HoverCard key={`mention-${i}-${mentionName}`}>
            <HoverCardTrigger asChild>
              <span className="text-blue-600 underline cursor-pointer hover:bg-blue-50 dark:text-blue-400 px-1 rounded">
                @{mentionName}
              </span>
            </HoverCardTrigger>
            <HoverCardContent className="prose text-sm max-w-xs p-3">
              {mention ? (
                <>
                  <p className="font-semibold text-foreground mb-1">
                    {mention.name}
                  </p>
                  <CardDescription className="text-muted-foreground">
                    {mention.description || "No description available."}
                  </CardDescription>
                  <a
                    href={`/entries/${mention.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-700 hover:underline mt-2 block dark:text-blue-300"
                  >
                    View Entry Page
                  </a>
                </>
              ) : (
                <span className="text-gray-500">
                  Mention not found in current selection.
                </span>
              )}
            </HoverCardContent>
          </HoverCard>,
        );

        if (remaining) {
          parts.push(remaining);
        }
      } else {
        parts.push("@" + part);
      }
    }

    return parts;
  };

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        rows={rows}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setShowAutocomplete(false);
          }
          if (e.key === "Enter" && showAutocomplete && results.length > 0) {
            e.preventDefault();
            handleSelect(results[0]);
          }
          if (e.key === "ArrowDown" && showAutocomplete && results.length > 0) {
            e.preventDefault();
          }
          if (e.key === "ArrowUp" && showAutocomplete && results.length > 0) {
            e.preventDefault();
          }
        }}
      />

      <Popover open={showAutocomplete}>
        <PopoverTrigger asChild>
          <span
            style={{
              position: "absolute",
              width: 1,
              height: 1,
              opacity: 0,
              pointerEvents: "none",
            }}
          />
        </PopoverTrigger>
        <PopoverContent
          className="p-0 z-[9999] max-h-60 overflow-y-auto shadow-md border rounded-md bg-popover text-popover-foreground w-80"
          align="start"
          side="bottom"
          sideOffset={4}
        >
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />{" "}
              Loading...
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">
              {query
                ? `No entries found for "${query}"`
                : "Start typing to search entries..."}
            </div>
          ) : (
            <div className="flex flex-col w-full">
              {results.map((entry) => (
                <Button
                  key={entry.id}
                  variant="ghost"
                  className="group w-full justify-start text-left h-auto py-2 px-3 text-sm hover:bg-accent"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(entry);
                  }}
                >
                  <div className="flex flex-col w-full">
                    <span className="font-semibold">{entry.name}</span>
                    {entry.description && (
                      <span className="text-xs text-muted-foreground group-hover:text-accent-foreground whitespace-normal break-words">
                        {entry.description}
                      </span>
                    )}
                    <a
                      href={`/entries/${entry.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-700 hover:underline mt-1 dark:text-blue-300 group-hover:text-accent-foreground"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View Entry
                    </a>
                  </div>
                </Button>
              ))}
            </div>
          )}
        </PopoverContent>
      </Popover>

      <div className="mt-4 p-3 border rounded-md bg-secondary text-secondary-foreground min-h-[50px] overflow-auto">
        <p className="text-sm text-muted-foreground mb-2">Formatted Preview:</p>
        <div className="text-base leading-relaxed whitespace-pre-wrap">
          {renderFormatted(value)}
        </div>
      </div>
    </div>
  );
}
