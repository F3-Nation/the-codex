"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card";
import { CardDescription } from "@/components/ui/card";
import type { EntryWithReferences } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Dispatch, SetStateAction } from "react";

interface MentionTextAreaProps {
  value: string;
  onChange: (value: string) => void;
  searchEntries: (query: string) => Promise<EntryWithReferences[]>;
  placeholder?: string;
  rows?: number;
  onMentionsChange?: (mentions: { id: string; name: string }[]) => void;
  onAutocompleteToggle?: Dispatch<SetStateAction<boolean>>;
}

export function MentionTextArea({
  value,
  onChange,
  searchEntries,
  placeholder,
  rows,
  onMentionsChange,
  onAutocompleteToggle,
}: MentionTextAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EntryWithReferences[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [mentions, setMentions] = useState<
    { id: string; name: string; description?: string; type?: string }[]
  >([]);
  const [focusIndex, setFocusIndex] = useState(-1);

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
          setFocusIndex(data.length > 0 ? 0 : -1);
        } catch (e) {
          console.error(e);
          setResults([]);
          setFocusIndex(-1);
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
      setFocusIndex(-1);
    }
  }, [query, showAutocomplete, debouncedSearch]);

  useEffect(() => {
    setMentions((prevMentions) => {
      const stillMentioned = prevMentions.filter((m) =>
        value.includes(`@${m.name}`),
      );
      const hasChanged =
        stillMentioned.length !== prevMentions.length ||
        !stillMentioned.every((m) => prevMentions.some((p) => p.id === m.id));

      if (hasChanged) {
        setTimeout(() => {
          onMentionsChange?.(
            stillMentioned.map(({ id, name }) => ({ id, name })),
          );
        }, 0);
      }
      return stillMentioned;
    });
  }, [value, onMentionsChange]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onAutocompleteToggle?.(showAutocomplete);
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [showAutocomplete, onAutocompleteToggle]);

  useEffect(() => {
    if (showAutocomplete) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showAutocomplete]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    onChange(val);
    const cursorPos = e.target.selectionStart;
    setCursor(cursorPos);
    const textBeforeCursor = val.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      if (!textAfterAt.includes(" ") && textAfterAt.length <= 50) {
        setQuery(textAfterAt);
        setShowAutocomplete(true);
      } else {
        setShowAutocomplete(false);
        setQuery("");
        setFocusIndex(-1);
      }
    } else {
      setShowAutocomplete(false);
      setQuery("");
      setFocusIndex(-1);
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

    setShowAutocomplete(false);
    setQuery("");
    setResults([]);
    setCursor(newCursor);
    setFocusIndex(-1);
    onChange(updated);

    setMentions((prev) => {
      const exists = prev.some((m) => m.id === entry.id);
      const next = exists ? prev : [...prev, { ...entry }];
      if (!exists) {
        setTimeout(() => {
          onMentionsChange?.(next.map(({ id, name }) => ({ id, name })));
        }, 0);
      }
      return next;
    });

    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursor, newCursor);
      }
    });
  };

  const renderFormatted = (text: string) => {
    const parts: React.ReactNode[] = [];
    const mentionOccurrences: {
      startIndex: number;
      endIndex: number;
      mention: {
        id: string;
        name: string;
        description?: string;
        type?: string;
      };
    }[] = [];

    mentions.forEach((mention) => {
      let searchString = `@${mention.name}`;
      let lastIndex = text.indexOf(searchString, 0);
      while (lastIndex !== -1) {
        mentionOccurrences.push({
          startIndex: lastIndex,
          endIndex: lastIndex + searchString.length,
          mention,
        });
        lastIndex = text.indexOf(searchString, lastIndex + 1);
      }
    });

    mentionOccurrences.sort((a, b) => a.startIndex - b.startIndex);

    let lastIndex = 0;
    mentionOccurrences.forEach(({ startIndex, endIndex, mention }, i) => {
      if (startIndex > lastIndex) {
        parts.push(text.substring(lastIndex, startIndex));
      }
      parts.push(
        <HoverCard key={`mention-${i}-${mention.id}`}>
          <HoverCardTrigger asChild>
            <span className="text-blue-600 underline cursor-pointer hover:bg-blue-50 dark:text-blue-400 px-1 rounded">
              @{mention.name}
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
                  className="text-xs text-white-700 hover:underline mt-2 block dark:text-white-300"
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
      lastIndex = endIndex;
    });

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts;
  };

  return (
    <div className="relative z-10">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        rows={rows}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setShowAutocomplete(false);
            setFocusIndex(-1);
            textareaRef.current?.focus();
          } else if (e.key === "Enter" && showAutocomplete && focusIndex >= 0) {
            e.preventDefault();
            handleSelect(results[focusIndex]);
          } else if (
            e.key === "ArrowDown" &&
            showAutocomplete &&
            results.length > 0
          ) {
            e.preventDefault();
            setFocusIndex((prev) => (prev + 1) % results.length);
          } else if (
            e.key === "ArrowUp" &&
            showAutocomplete &&
            results.length > 0
          ) {
            e.preventDefault();
            setFocusIndex(
              (prev) => (prev - 1 + results.length) % results.length,
            );
          }
        }}
        onBlur={(e) => {
          const relatedTarget = e.relatedTarget as HTMLElement;
          if (!relatedTarget || !relatedTarget.closest(".autocomplete-list")) {
            setTimeout(() => setShowAutocomplete(false), 150);
          }
        }}
      />
      {showAutocomplete && (
        <div
          ref={listRef}
          className="absolute z-[9999] mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-[200px] overflow-y-auto pointer-events-auto autocomplete-list dark:bg-gray-800"
        >
          {loading ? (
            <div className="p-4 text-center text-sm text-gray-800 dark:text-gray-200">
              <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />{" "}
              Loading...
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-sm text-gray-800 dark:text-gray-200">
              {query
                ? `No entries found for "${query}"`
                : "Start typing to search entries..."}
            </div>
          ) : (
            <div className="flex flex-col w-full">
              {results.map((entry, index) => (
                <button
                  key={entry.id}
                  className={cn(
                    "w-full text-left h-auto py-2 px-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors",
                    focusIndex === index ? "bg-gray-100 dark:bg-gray-700" : "",
                  )}
                  onClick={() => handleSelect(entry)}
                >
                  <div className="flex flex-col w-full">
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {entry.name}
                    </span>
                    {entry.description && (
                      <span className="text-xs text-gray-700 dark:text-gray-300 whitespace-normal break-words">
                        {entry.description}
                      </span>
                    )}
                    <a
                      href={`/entries/${entry.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline mt-1 dark:text-blue-400"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View Entry
                    </a>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="mt-4 p-3 border rounded-md bg-secondary text-secondary-foreground min-h-[50px] overflow-auto">
        <p className="text-sm text-muted-foreground mb-2">Formatted Preview:</p>
        <div className="text-base leading-relaxed whitespace-pre-wrap">
          {renderFormatted(value)}
        </div>
      </div>
    </div>
  );
}
