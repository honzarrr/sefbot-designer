'use client';

import { memo } from 'react';
import { STEP_COLORS } from '@/types';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

function ColorPickerComponent({ value, onChange }: ColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {STEP_COLORS.map((color) => (
        <button
          key={color}
          onClick={() => onChange(color)}
          className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
          style={{
            backgroundColor: color,
            borderColor: value === color ? '#000' : 'transparent',
          }}
          title={color}
        />
      ))}
    </div>
  );
}

export default memo(ColorPickerComponent);
