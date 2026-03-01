'use client';

import { memo } from 'react';
import type { UserInputBlock as UserInputBlockType } from '@/types';
import { MessageSquare } from 'lucide-react';

interface UserInputBlockProps {
  block: UserInputBlockType;
}

function UserInputBlockComponent({ block }: UserInputBlockProps) {
  return (
    <div className="pt-1 border-t border-gray-100">
      <div className="flex items-center gap-2 text-xs text-gray-400 italic bg-gray-50 rounded px-2 py-1.5 border border-dashed border-gray-200">
        <MessageSquare className="w-3 h-3 shrink-0" />
        <span>{block.placeholder || 'User types here...'}</span>
      </div>
    </div>
  );
}

export default memo(UserInputBlockComponent);
