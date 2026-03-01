'use client';

import { useEffect, useCallback } from 'react';
import { useDesignerStore } from '@/stores/designerStore';

export function useKeyboardShortcuts() {
  const deleteSelected = useDesignerStore((s) => s.deleteSelected);
  const duplicateSelected = useDesignerStore((s) => s.duplicateSelected);
  const saveProject = useDesignerStore((s) => s.saveProject);
  const selectedIds = useDesignerStore((s) => s.selectedIds);
  const clearSelection = useDesignerStore((s) => s.clearSelection);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // Delete - Delete or Backspace key
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.length > 0) {
          e.preventDefault();
          deleteSelected();
        }
      }

      // Duplicate - Ctrl/Cmd + D
      if (isCtrlOrCmd && e.key === 'd') {
        e.preventDefault();
        duplicateSelected();
      }

      // Save - Ctrl/Cmd + S
      if (isCtrlOrCmd && e.key === 's') {
        e.preventDefault();
        saveProject();
      }

      // Escape - clear selection
      if (e.key === 'Escape') {
        clearSelection();
      }
    },
    [deleteSelected, duplicateSelected, saveProject, selectedIds, clearSelection]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
