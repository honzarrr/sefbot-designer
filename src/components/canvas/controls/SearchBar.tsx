'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDesignerStore } from '@/stores/designerStore';

export default function SearchBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const searchQuery = useDesignerStore((s) => s.searchQuery);
  const searchResults = useDesignerStore((s) => s.searchResults);
  const setSearchQuery = useDesignerStore((s) => s.setSearchQuery);
  const selectElements = useDesignerStore((s) => s.selectElements);

  // Ctrl+F to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Navigate results and highlight
  useEffect(() => {
    if (searchResults.length > 0 && currentIndex < searchResults.length) {
      selectElements([searchResults[currentIndex]]);
    }
  }, [currentIndex, searchResults, selectElements]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setSearchQuery('');
        setCurrentIndex(0);
      }
      if (e.key === 'ArrowDown' || (e.key === 'Enter' && !e.shiftKey)) {
        e.preventDefault();
        if (searchResults.length > 0) {
          setCurrentIndex((prev) => (prev + 1) % searchResults.length);
        }
      }
      if (e.key === 'ArrowUp' || (e.key === 'Enter' && e.shiftKey)) {
        e.preventDefault();
        if (searchResults.length > 0) {
          setCurrentIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
        }
      }
    },
    [searchResults, setSearchQuery]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
      setCurrentIndex(0);
    },
    [setSearchQuery]
  );

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setSearchQuery('');
    setCurrentIndex(0);
  }, [setSearchQuery]);

  if (!isOpen) return null;

  return (
    <div className="absolute top-3 right-3 z-50 bg-white border border-gray-200 rounded-lg shadow-lg flex items-center gap-2 px-3 py-2">
      <input
        ref={inputRef}
        type="text"
        placeholder="Search steps, text, buttons..."
        className="text-sm outline-none w-56"
        value={searchQuery}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        autoFocus
      />
      {searchQuery && (
        <span className="text-xs text-gray-400 whitespace-nowrap">
          {searchResults.length > 0
            ? `${currentIndex + 1}/${searchResults.length}`
            : 'No results'}
        </span>
      )}
      <button
        onClick={handleClose}
        className="text-gray-400 hover:text-gray-600 text-sm ml-1"
        title="Close search"
      >
        x
      </button>
    </div>
  );
}
