'use client';

import { useState, useCallback } from 'react';
import { OutputBlock, OutputBlockType } from '@/types/chatbot';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  GripVertical,
  Copy,
  Trash2,
  Type,
  Code,
  Info,
  AlertTriangle,
  Image,
  Video,
  ChevronDown,
  Bold,
  Italic,
  Link,
  Smile,
  Variable,
} from 'lucide-react';
import { v4 as uuid } from 'uuid';

const BLOCK_TYPES: { type: OutputBlockType; label: string; icon: React.ElementType }[] = [
  { type: 'text', label: 'Text', icon: Type },
  { type: 'html', label: 'HTML', icon: Code },
  { type: 'info', label: 'Info', icon: Info },
  { type: 'warning', label: 'Warning', icon: AlertTriangle },
  { type: 'image', label: 'Image', icon: Image },
  { type: 'video', label: 'Video', icon: Video },
];

interface OutputEditorProps {
  blocks: OutputBlock[];
  onChange: (blocks: OutputBlock[]) => void;
}

export function OutputEditor({ blocks, onChange }: OutputEditorProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const addBlock = (type: OutputBlockType) => {
    const newBlock: OutputBlock = {
      id: uuid(),
      type,
      content: '',
    };
    onChange([...blocks, newBlock]);
    setEditingId(newBlock.id);
  };

  const updateBlock = (id: string, content: string) => {
    onChange(blocks.map((b) => (b.id === id ? { ...b, content } : b)));
  };

  const deleteBlock = (id: string) => {
    onChange(blocks.filter((b) => b.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const duplicateBlock = (id: string) => {
    const index = blocks.findIndex((b) => b.id === id);
    if (index < 0) return;
    const original = blocks[index];
    const copy: OutputBlock = { ...original, id: uuid() };
    const next = [...blocks];
    next.splice(index + 1, 0, copy);
    onChange(next);
  };

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetIndex: number) => {
      e.preventDefault();
      if (dragIndex === null || dragIndex === targetIndex) return;
      const next = [...blocks];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(targetIndex, 0, moved);
      onChange(next);
      setDragIndex(null);
    },
    [dragIndex, blocks, onChange]
  );

  const insertFormatting = (id: string, format: string) => {
    const block = blocks.find((b) => b.id === id);
    if (!block) return;
    let content = block.content;
    switch (format) {
      case 'bold':
        content += '**bold**';
        break;
      case 'italic':
        content += '*italic*';
        break;
      case 'link':
        content += '[link text](url)';
        break;
      case 'emoji':
        content += '😊';
        break;
      case 'variable':
        content += '{{variable_name}}';
        break;
    }
    updateBlock(id, content);
  };

  const getBlockIcon = (type: OutputBlockType) => {
    const found = BLOCK_TYPES.find((b) => b.type === type);
    return found ? found.icon : Type;
  };

  const getBlockLabel = (type: OutputBlockType) => {
    const found = BLOCK_TYPES.find((b) => b.type === type);
    return found ? found.label : type;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Output Blocks</h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 gap-1">
              <Plus className="h-3 w-3" />
              Add Block
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {BLOCK_TYPES.map(({ type, label, icon: Icon }) => (
              <DropdownMenuItem key={type} onClick={() => addBlock(type)}>
                <Icon className="h-4 w-4 mr-2" />
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {blocks.length === 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
          No output blocks. Add one to show messages to the user.
        </div>
      )}

      <div className="space-y-2">
        {blocks.map((block, index) => {
          const BlockIcon = getBlockIcon(block.type);
          const isEditing = editingId === block.id;

          return (
            <div
              key={block.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              className={`border rounded-lg ${dragIndex === index ? 'opacity-50' : ''} ${
                block.type === 'info'
                  ? 'border-blue-200 bg-blue-50/50 dark:bg-blue-900/10'
                  : block.type === 'warning'
                  ? 'border-amber-200 bg-amber-50/50 dark:bg-amber-900/10'
                  : ''
              }`}
            >
              {/* Block header */}
              <div className="flex items-center gap-2 px-3 py-1.5 border-b">
                <GripVertical className="h-3 w-3 text-muted-foreground/50 cursor-grab shrink-0" />
                <BlockIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs font-medium text-muted-foreground">
                  {getBlockLabel(block.type)}
                </span>

                {/* Text formatting toolbar */}
                {block.type === 'text' && isEditing && (
                  <div className="flex items-center gap-0.5 ml-2">
                    <button
                      className="p-1 rounded hover:bg-muted"
                      onClick={() => insertFormatting(block.id, 'bold')}
                      title="Bold"
                    >
                      <Bold className="h-3 w-3" />
                    </button>
                    <button
                      className="p-1 rounded hover:bg-muted"
                      onClick={() => insertFormatting(block.id, 'italic')}
                      title="Italic"
                    >
                      <Italic className="h-3 w-3" />
                    </button>
                    <button
                      className="p-1 rounded hover:bg-muted"
                      onClick={() => insertFormatting(block.id, 'link')}
                      title="Link"
                    >
                      <Link className="h-3 w-3" />
                    </button>
                    <button
                      className="p-1 rounded hover:bg-muted"
                      onClick={() => insertFormatting(block.id, 'emoji')}
                      title="Emoji"
                    >
                      <Smile className="h-3 w-3" />
                    </button>
                    <button
                      className="p-1 rounded hover:bg-muted"
                      onClick={() => insertFormatting(block.id, 'variable')}
                      title="Variable"
                    >
                      <Variable className="h-3 w-3" />
                    </button>
                  </div>
                )}

                <div className="ml-auto flex items-center gap-0.5">
                  <button
                    className="p-1 rounded hover:bg-muted"
                    onClick={() => duplicateBlock(block.id)}
                    title="Duplicate"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                  <button
                    className="p-1 rounded hover:bg-muted text-destructive"
                    onClick={() => deleteBlock(block.id)}
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Block content */}
              <div className="p-3">
                {(block.type === 'text' || block.type === 'html' || block.type === 'info' || block.type === 'warning') && (
                  <textarea
                    value={block.content}
                    onChange={(e) => updateBlock(block.id, e.target.value)}
                    onFocus={() => setEditingId(block.id)}
                    onBlur={() => setEditingId(null)}
                    placeholder={
                      block.type === 'html'
                        ? '<p>Enter HTML content...</p>'
                        : block.type === 'info'
                        ? 'Info message...'
                        : block.type === 'warning'
                        ? 'Warning message...'
                        : 'Type a message...'
                    }
                    className="w-full min-h-[60px] text-sm bg-transparent resize-y focus:outline-none"
                    rows={3}
                  />
                )}

                {block.type === 'image' && (
                  <Input
                    value={block.content}
                    onChange={(e) => updateBlock(block.id, e.target.value)}
                    placeholder="Image URL..."
                    className="text-sm"
                  />
                )}

                {block.type === 'video' && (
                  <Input
                    value={block.content}
                    onChange={(e) => updateBlock(block.id, e.target.value)}
                    placeholder="Video URL (YouTube, Vimeo, etc.)..."
                    className="text-sm"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
