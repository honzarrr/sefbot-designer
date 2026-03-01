'use client';

import { useEffect, useRef } from 'react';
import { useDesignerStore } from '@/stores/designerStore';

const DEBOUNCE_MS = 1000;
const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function useAutoSave() {
  const project = useDesignerStore((s) => s.project);
  const saveProject = useDesignerStore((s) => s.saveProject);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced save on project changes
  useEffect(() => {
    if (!project) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      saveProject();
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [project, saveProject]);

  // Interval-based save every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      saveProject();
    }, INTERVAL_MS);

    return () => clearInterval(interval);
  }, [saveProject]);

  // Save on beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveProject();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveProject]);
}
