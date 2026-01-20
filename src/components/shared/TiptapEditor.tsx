"use client";

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { useEditor, EditorContent, ReactRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Mention from "@tiptap/extension-mention";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import Placeholder from "@tiptap/extension-placeholder";
import Blockquote from "@tiptap/extension-blockquote";
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

// Custom blockquote extension without quotes
const CustomBlockquote = Blockquote.extend({
  name: 'blockquote',

  // Override the renderHTML method to not add quotes
  renderHTML({ HTMLAttributes }) {
    return ['blockquote', HTMLAttributes, 0]
  },
});

// Mention list ref interface for Tiptap's suggestion plugin
interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

interface MentionListProps {
  items: EntryWithReferences[];
  command: (item: { id: string; label: string }) => void;
}

// Mention suggestion component
const MentionList = forwardRef<MentionListRef, MentionListProps>(
  function MentionList({ items, command }, ref) {
    const [selectedIndex, setSelectedIndex] = useState(0);

    // Reset selected index when items change - this is the official Tiptap pattern
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => setSelectedIndex(0), [items]);

    // Handle selecting a mention item
    const selectItem = (index: number) => {
      const item = items[index];
      if (item) {
        // Transform to use 'label' instead of 'name' for Tiptap Mention extension
        command({ id: item.id, label: item.name });
      }
    };

    const upHandler = () => {
      setSelectedIndex((selectedIndex + items.length - 1) % items.length);
    };

    const downHandler = () => {
      setSelectedIndex((selectedIndex + 1) % items.length);
    };

    const enterHandler = () => {
      selectItem(selectedIndex);
    };

    // Expose onKeyDown via ref for Tiptap's suggestion plugin
    // Note: Tiptap calls this with { event } object, not just event
    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (event.key === "ArrowUp") {
          upHandler();
          return true;
        }

        if (event.key === "ArrowDown") {
          downHandler();
          return true;
        }

        if (event.key === "Enter") {
          enterHandler();
          return true;
        }

        return false;
      },
    }));

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
            onClick={() => selectItem(index)}
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
);

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
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        // Disable the default blockquote
        blockquote: false,
        heading: {
          levels: [2, 3],
        },
      }),
      // Use our custom blockquote without quotes
      CustomBlockquote.configure({
        HTMLAttributes: {
          class: 'rich-blockquote',
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

            return new Promise((resolve) => {
              if (searchTimerRef.current) {
                clearTimeout(searchTimerRef.current);
              }

              searchTimerRef.current = setTimeout(async () => {
                try {
                  setIsLoading(true);
                  const results = await searchEntries(query);
                  resolve(results.slice(0, 10));
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
            let component: ReactRenderer<MentionListRef, MentionListProps>;
            let popup: TippyInstance[];

            return {
              onStart: (props) => {
                component = new ReactRenderer(MentionList, {
                  props,
                  editor: props.editor,
                });

                if (!props.clientRect) {
                  return;
                }

                popup = tippy("body", {
                  getReferenceClientRect: props.clientRect as () => DOMRect,
                  appendTo: () => containerRef.current || document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: "manual",
                  placement: "bottom-start",
                  zIndex: 99999,
                });
              },

              onUpdate(props) {
                component.updateProps(props);

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

                // Pass the props object (which contains { event }) to the ref's onKeyDown
                return component.ref?.onKeyDown({ event: props.event }) ?? false;
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

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

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
    <div ref={containerRef} className={cn("tiptap-editor-container", className)}>
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
