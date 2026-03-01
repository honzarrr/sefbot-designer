'use client';

import { useRef, useEffect, useCallback } from 'react';

interface InlineTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function InlineTextEditor({
  value,
  onChange,
  placeholder = 'Type here...',
  className = '',
}: InlineTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isComposing = useRef(false);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value;
    }
  }, [value]);

  const handleInput = useCallback(() => {
    if (isComposing.current) return;
    if (ref.current) {
      onChange(ref.current.innerHTML);
    }
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'b' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      document.execCommand('bold');
    } else if (e.key === 'i' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      document.execCommand('italic');
    }
  }, []);

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      className={`outline-none min-h-[1.25em] empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:pointer-events-none nopan nodrag nowheel ${className}`}
      data-placeholder={placeholder}
      onInput={handleInput}
      onKeyDown={(e) => {
        e.stopPropagation();
        handleKeyDown(e);
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onCompositionStart={() => { isComposing.current = true; }}
      onCompositionEnd={() => {
        isComposing.current = false;
        handleInput();
      }}
    />
  );
}
