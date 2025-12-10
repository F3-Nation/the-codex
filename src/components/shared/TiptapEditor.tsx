"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, ReactRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Mention from "@tiptap/extension-mention";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import Placeholder from "@tiptap/extension-placeholder";
import { TiptapToolbar } from "./TiptapToolbar";
import type { EntryWithReferences } from "@/lib/types";
import { cn } from "@/lib/utils";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import "tippy.js/dist/tippy.css";

interface TiptapEditorProps {
  value: string;
  onChange: (html: string) => void;
  searchEntries: (query: string) => Promise<EntryWithReferences[]>;
  placeholder?: string;
  onMentionsChange?: (mentions: { id: string; name: string }[]) => void;
  className?: string;
  editable?: boolean;
}

// Mention suggestion component
function MentionList({
  items,
  command,
  resetKey,
}: {
  items: EntryWithReferences[];
  command: (item: EntryWithReferences) => void;
  resetKey: number;
}) {
  // selectedIndex starts at 0. It resets automatically because the Tiptap
  // extension logic is now designed to destroy and recreate (remount)
  // this component when the items change by leveraging the 'resetKey'.
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Wrap onKeyDown in useCallback to prevent it from changing on every render
  const onKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      // Ensure calculation wraps around correctly
      setSelectedIndex((prevIndex) => (prevIndex + items.length - 1) % items.length);
      return true;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      // Ensure calculation wraps around correctly
      setSelectedIndex((prevIndex) => (prevIndex + 1) % items.length);
      return true;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (items[selectedIndex]) {
        command(items[selectedIndex]);
      }
      return true;
    }

    return false;
  }, [items, selectedIndex, command]); // Dependencies for useCallback

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // We check to see if the event has been handled to prevent calling onKeyDown multiple times.
      if (!onKeyDown(event)) {
        // If onKeyDown returns false, it means the key was not handled by the mention list
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onKeyDown]); // Now onKeyDown is stable thanks to useCallback

  if (items.length === 0) {
    return (
      <div className="mention-suggestions">
        <div className="no-results">No entries found</div>
      </div>
    );
  }

  return (
    <div className="mention-suggestions">
      {items.map((item, index) => (
        <div
          key={item.id}
          className={cn(
            "suggestion-item",
            index === selectedIndex ? "is-selected" : ""
          )}
          onClick={() => command(item)}
        >
          <span className="suggestion-item-name">{item.name}</span>
          {item.description && (
            <span className="suggestion-item-description">
              {item.description}
            </span>
          )}
          <span className="suggestion-item-link">View Entry</span>
        </div>
      ))}
    </div>
  );
}

export function TiptapEditor({
  value,
  onChange,
  searchEntries,
  placeholder = "Start typing...",
  onMentionsChange,
  className,
  editable = true,
}: TiptapEditorProps) {
  const [isLoading, setIsLoading] = useState(false);
  // State to track changes in search results to force remount (key prop mechanism)
  const [suggestionKey, setSuggestionKey] = useState(0);
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({
        placeholder,
      }),
      Mention.configure({
        HTMLAttributes: {
          class: "mention",
        },
        suggestion: {
          char: "@",
          allowSpaces: true,
          items: async ({ query }) => {
            if (query.length < 1) return [];

            // Debounced search
            return new Promise((resolve) => {
              if (searchTimerRef.current) {
                clearTimeout(searchTimerRef.current);
              }

              searchTimerRef.current = setTimeout(async () => {
                try {
                  setIsLoading(true);
                  const results = await searchEntries(query);

                  // Increment key when new results are fetched to force MentionList remount
                  setSuggestionKey(k => k + 1);

                  resolve(results.slice(0, 10)); // Limit to 10 results
                } catch (error) {
                  console.error("Error searching entries:", error);
                  resolve([]);
                } finally {
                  setIsLoading(false);
                }
              }, 300);
            });
          },
          render: () => {
            let component: ReactRenderer<
              typeof MentionList,
              { items: EntryWithReferences[]; command: (item: EntryWithReferences) => void; resetKey: number }
            >;
            let popup: TippyInstance[];

            return {
              onStart: (props) => {
                // Pass the suggestionKey as the 'resetKey' prop
                component = new ReactRenderer(MentionList, {
                  props: { ...props, resetKey: suggestionKey },
                  editor: props.editor,
                  // The key property must be set when the component is rendered, not after.
                  // We rely on Tiptap's internal logic which often remounts the component
                  // when props change, especially if a new set of items is returned.
                });

                if (!props.clientRect) {
                  return;
                }

                popup = tippy("body", {
                  getReferenceClientRect: props.clientRect as () => DOMRect,
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: "manual",
                  placement: "bottom-start",
                });
              },

              onUpdate(props) {
                // Pass the updated key during prop updates
                component.updateProps({ ...props, resetKey: suggestionKey });
                // REMOVED: component.key = suggestionKey; // Avoids TypeScript error

                if (!props.clientRect) {
                  return;
                }

                popup[0].setProps({
                  getReferenceClientRect: props.clientRect as () => DOMRect,
                });
              },

              onKeyDown(props) {
                if (props.event.key === "Escape") {
                  popup[0].hide();
                  return true;
                }

                // @ts-ignore
                return component.ref?.onKeyDown(props.event);
              },

              onExit() {
                popup[0].destroy();
                component.destroy();
              },
            };
          },
        },
        renderLabel({ node }) {
          return `@${node.attrs.label ?? node.attrs.id}`;
        },
      }),
    ],
    content: value,
    editable,
    editorProps: {
      attributes: {
        class: "tiptap",
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);

      // Extract mentions and notify parent
      if (onMentionsChange) {
        const mentions: { id: string; name: string }[] = [];
        editor.state.doc.descendants((node) => {
          if (node.type.name === "mention") {
            mentions.push({
              id: node.attrs.id,
              name: node.attrs.label || node.attrs.id,
            });
          }
        });
        onMentionsChange(mentions);
      }
    },
  });

  // Update editor content when value prop changes
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, []);

  if (!editor) {
    return null;
  }

  return (
    <div className={cn("tiptap-editor-container", className)}>
      {editable && <TiptapToolbar editor={editor} />}
      <EditorContent editor={editor} />
      {isLoading && (
        <div className="text-xs text-muted-foreground mt-1">
          Searching entries...
        </div>
      )}
    </div>
  );
}
