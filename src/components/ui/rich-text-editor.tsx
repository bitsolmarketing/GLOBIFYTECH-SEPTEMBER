"use client";

import * as React from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, List, ListOrdered, Quote, Code, Heading2, Heading3, Undo, Redo, Link2, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconButton } from "./button";

export interface RichTextEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: number;
  disabled?: boolean;
  name?: string;
}

function RichTextEditor({ value = "", onChange, placeholder = "Write something…", className, minHeight = 200, disabled, name }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [2, 3] } })],
    content: value,
    editable: !disabled,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "prose-globify tiptap min-h-[var(--min-h)] px-4 py-3 text-sm focus:outline-none",
        "data-placeholder": placeholder,
        style: `--min-h:${minHeight}px`,
      },
    },
    onUpdate: ({ editor: e }) => onChange?.(e.getHTML()),
  });

  React.useEffect(() => {
    if (editor && value !== editor.getHTML() && !editor.isFocused) editor.commands.setContent(value, { emitUpdate: false });
  }, [value, editor]);

  const setLink = () => {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previous ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const tools = editor
    ? [
        { label: "Bold", icon: <Bold />, active: editor.isActive("bold"), run: () => editor.chain().focus().toggleBold().run() },
        { label: "Italic", icon: <Italic />, active: editor.isActive("italic"), run: () => editor.chain().focus().toggleItalic().run() },
        { label: "Heading 2", icon: <Heading2 />, active: editor.isActive("heading", { level: 2 }), run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
        { label: "Heading 3", icon: <Heading3 />, active: editor.isActive("heading", { level: 3 }), run: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
        { label: "Bullet list", icon: <List />, active: editor.isActive("bulletList"), run: () => editor.chain().focus().toggleBulletList().run() },
        { label: "Numbered list", icon: <ListOrdered />, active: editor.isActive("orderedList"), run: () => editor.chain().focus().toggleOrderedList().run() },
        { label: "Quote", icon: <Quote />, active: editor.isActive("blockquote"), run: () => editor.chain().focus().toggleBlockquote().run() },
        { label: "Code block", icon: <Code />, active: editor.isActive("codeBlock"), run: () => editor.chain().focus().toggleCodeBlock().run() },
        { label: "Link", icon: <Link2 />, active: editor.isActive("link"), run: setLink },
        { label: "Divider", icon: <Minus />, active: false, run: () => editor.chain().focus().setHorizontalRule().run() },
      ]
    : [];

  return (
    <div className={cn("overflow-hidden rounded-md border border-border bg-surface shadow-xs focus-within:border-accent focus-within:ring-3 focus-within:ring-ring/30", disabled && "opacity-60", className)}>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-bg-subtle px-2 py-1" role="toolbar" aria-label="Formatting">
        {tools.map((t) => (
          <IconButton key={t.label} label={t.label} size="sm" type="button" onClick={t.run} disabled={disabled} className={cn(t.active && "bg-bg-muted text-fg")}>
            {t.icon}
          </IconButton>
        ))}
        <span className="mx-1 h-5 w-px bg-border" />
        <IconButton label="Undo" size="sm" type="button" onClick={() => editor?.chain().focus().undo().run()} disabled={disabled}>
          <Undo />
        </IconButton>
        <IconButton label="Redo" size="sm" type="button" onClick={() => editor?.chain().focus().redo().run()} disabled={disabled}>
          <Redo />
        </IconButton>
      </div>
      <EditorContent editor={editor} />
      {name ? <input type="hidden" name={name} value={editor?.getHTML() ?? value} /> : null}
    </div>
  );
}

export { RichTextEditor };
