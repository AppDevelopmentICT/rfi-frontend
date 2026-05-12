"use client";

import { type Editor } from "@tiptap/react";
import { cn } from "@/lib/utils";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
  Type,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TipTapToolbarProps {
  editor: Editor | null;
  compact?: boolean;
}

function ToolbarButton({
  onClick,
  isActive,
  disabled,
  children,
  tooltip,
  size = "sm",
}: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  tooltip: string;
  size?: "sm" | "xs";
}) {
  const btn = (
    <Button
      variant="ghost"
      size={size === "xs" ? "icon" : "icon"}
      disabled={disabled}
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={cn(
        "size-8 rounded-md font-normal transition-all",
        "hover:bg-accent hover:text-accent-foreground",
        isActive && "bg-accent text-accent-foreground shadow-sm",
        disabled && "opacity-40 hover:bg-transparent hover:text-muted-foreground",
      )}
    >
      {children}
    </Button>
  );

  return (
    <Tooltip>
      <TooltipTrigger>{btn}</TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs font-medium">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

export function TipTapToolbar({ editor, compact }: TipTapToolbarProps) {
  if (!editor) return null;

  const headings: { level: 1 | 2 | 3; icon: React.ReactNode; tooltip: string }[] = [
    { level: 1, icon: <Heading1 className="size-4" />, tooltip: "Heading 1" },
    { level: 2, icon: <Heading2 className="size-4" />, tooltip: "Heading 2" },
    { level: 3, icon: <Heading3 className="size-4" />, tooltip: "Heading 3" },
  ];

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-0.5 rounded-xl border border-border/60 bg-background/95 px-2 py-1.5 backdrop-blur-sm",
        compact ? "justify-center" : "justify-start",
      )}
      role="toolbar"
      aria-label="Text formatting toolbar"
    >
      {/* Headings dropdown-style group */}
      <div className="flex items-center gap-0.5">
        {headings.map(({ level, icon, tooltip }) => (
          <ToolbarButton
            key={level}
            onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
            isActive={editor.isActive("heading", { level })}
            tooltip={tooltip}
          >
            {icon}
          </ToolbarButton>
        ))}
        <ToolbarButton
          onClick={() => editor.chain().focus().setParagraph().run()}
          isActive={editor.isActive("paragraph")}
          tooltip="Paragraph"
        >
          <Type className="size-4" />
        </ToolbarButton>
      </div>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Basic formatting */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          tooltip="Bold"
        >
          <Bold className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          tooltip="Italic"
        >
          <Italic className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive("underline")}
          tooltip="Underline"
        >
          <Underline className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive("strike")}
          tooltip="Strikethrough"
        >
          <Strikethrough className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive("code")}
          tooltip="Inline Code"
        >
          <Code className="size-4" />
        </ToolbarButton>
      </div>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Lists */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
          tooltip="Bullet List"
        >
          <List className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
          tooltip="Numbered List"
        >
          <ListOrdered className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          isActive={editor.isActive("taskList")}
          tooltip="Task List"
        >
          <ListTodo className="size-4" />
        </ToolbarButton>
      </div>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Block elements */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive("blockquote")}
          tooltip="Quote"
        >
          <Quote className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          tooltip="Horizontal Rule"
        >
          <Minus className="size-4" />
        </ToolbarButton>
      </div>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Alignment */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          isActive={editor.isActive({ textAlign: "left" })}
          tooltip="Align Left"
        >
          <AlignLeft className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          isActive={editor.isActive({ textAlign: "center" })}
          tooltip="Align Center"
        >
          <AlignCenter className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          isActive={editor.isActive({ textAlign: "right" })}
          tooltip="Align Right"
        >
          <AlignRight className="size-4" />
        </ToolbarButton>
      </div>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* History */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          tooltip="Undo"
        >
          <Undo className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          tooltip="Redo"
        >
          <Redo className="size-4" />
        </ToolbarButton>
      </div>
    </div>
  );
}
