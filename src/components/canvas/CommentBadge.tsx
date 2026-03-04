'use client';

import { memo } from 'react';
import { MessageCircle } from 'lucide-react';

interface CommentBadgeProps {
  count: number;
  hasUnresolved: boolean;
  onClick?: () => void;
}

function CommentBadgeComponent({ count, hasUnresolved, onClick }: CommentBadgeProps) {
  if (count === 0) return null;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      onMouseDown={(e) => e.stopPropagation()}
      className={`absolute -top-2 -right-2 z-10 flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold shadow-sm border transition-colors nopan nodrag ${
        hasUnresolved
          ? 'bg-orange-500 text-white border-orange-600 hover:bg-orange-600'
          : 'bg-green-500 text-white border-green-600 hover:bg-green-600'
      }`}
      title={`${count} comment${count !== 1 ? 's' : ''}`}
    >
      <MessageCircle className="w-2.5 h-2.5" />
      {count}
    </button>
  );
}

export const CommentBadge = memo(CommentBadgeComponent);
