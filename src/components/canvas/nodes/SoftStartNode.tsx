'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { SoftStartNodeType } from '@/types';

function SoftStartNodeComponent({ data }: NodeProps<SoftStartNodeType>) {
  const { softStart } = data;

  return (
    <div className="min-w-[160px] rounded-full bg-green-50 border-2 border-green-400 shadow-md px-5 py-3 text-center">
      <div className="text-sm font-semibold text-green-700">{softStart.name}</div>
      <div className="text-xs text-green-500 mt-1 bg-green-100 rounded-full px-3 py-0.5 inline-block">
        {softStart.buttonLabel}
      </div>

      {/* Output handle only (entry point - no input) */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-green-500 !border-2 !border-white"
      />
    </div>
  );
}

export default memo(SoftStartNodeComponent);
