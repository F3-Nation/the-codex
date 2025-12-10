"use client";

import { type Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Code,
  List,
  ListOrdered,
  Quote,
  Heading2,
  Heading3,
  Table,
  RemoveFormatting,
} from "lucide-react";

// Define the ToolbarButton component outside of the TiptapToolbar function
interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title: string;
}

const ToolbarButton = ({
  onClick,
  isActive = false,
  disabled = false,
  children,
  title,
}: ToolbarButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={isActive ? "is-active" : ""}
    title={title}
  >
    {children}
  </button>
);

interface TiptapToolbarProps {
  editor: Editor;
}

export function TiptapToolbar({ editor }: TiptapToolbarProps) {
  if (!editor) {
    return null;
  }

  return (
    <div className="tiptap-toolbar">
      {/* Text Formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
        title="Bold"
      >
        <Bold size={16} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
        title="Italic"
      >
        <Italic size={16} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive("code")}
        title="Inline Code"
      >
        <Code size={16} />
      </ToolbarButton>

      <div className="divider" />

      {/* Headings */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive("heading", { level: 2 })}
        title="Heading 2"
      >
        <Heading2 size={16} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive("heading", { level: 3 })}
        title="Heading 3"
      >
        <Heading3 size={16} />
      </ToolbarButton>

      <div className="divider" />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
        title="Bullet List"
      >
        <List size={16} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive("orderedList")}
        title="Numbered List"
      >
        <ListOrdered size={16} />
      </ToolbarButton>

      <div className="divider" />

      {/* Blockquote */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive("blockquote")}
        title="Blockquote"
      >
        <Quote size={16} />
      </ToolbarButton>

      <div className="divider" />

      {/* Table */}
      <ToolbarButton
        onClick={() =>
          editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run()
        }
        disabled={editor.isActive("table")}
        title="Insert Table"
      >
        <Table size={16} />
      </ToolbarButton>

      {editor.isActive("table") && (
        <>
          <ToolbarButton
            onClick={() => editor.chain().focus().addRowBefore().run()}
            title="Add Row Above"
          >
            Row↑
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().addRowAfter().run()}
            title="Add Row Below"
          >
            Row↓
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().addColumnBefore().run()}
            title="Add Column Left"
          >
            Col←
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            title="Add Column Right"
          >
            Col→
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().deleteRow().run()}
            title="Delete Row"
          >
            Del Row
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().deleteColumn().run()}
            title="Delete Column"
          >
            Del Col
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().deleteTable().run()}
            title="Delete Table"
          >
            Del Table
          </ToolbarButton>
        </>
      )}

      <div className="divider" />

      {/* Clear Formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
        title="Clear Formatting"
      >
        <RemoveFormatting size={16} />
      </ToolbarButton>
    </div>
  );
}
