'use client';

import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ConditionNodeType } from '@/types';
import { useDesignerStore } from '@/stores/designerStore';

function ConditionNodeComponent({ data, id }: NodeProps<ConditionNodeType>) {
  const { condition } = data;
  const addConditionBranch = useDesignerStore((s) => s.addConditionBranch);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Hexagonal / diamond shape via clip-path */}
      <div className="min-w-[180px] bg-amber-50 border-2 border-amber-400 rounded-lg shadow-md">
        {/* Input Handle */}
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !bg-amber-400 !border-2 !border-white"
        />

        {/* Header */}
        <div className="bg-amber-400 px-3 py-1.5 rounded-t-md">
          <span className="text-white text-xs font-bold uppercase tracking-wide">
            Condition
          </span>
        </div>

        {/* Branches */}
        <div className="px-3 py-2 space-y-1.5">
          {condition.conditions.map((branch) => (
            <div
              key={branch.id}
              className="relative text-xs text-gray-700 bg-white rounded px-2 py-1 border border-amber-200"
            >
              {branch.label}
              <Handle
                type="source"
                position={Position.Right}
                id={`condition-${branch.id}`}
                className="!w-2.5 !h-2.5 !bg-amber-500 !border-2 !border-white"
                style={{ top: 'auto', right: -6 }}
              />
            </div>
          ))}
        </div>

        {/* Add branch button on hover */}
        {hovered && (
          <div className="absolute -top-3 right-1">
            <button
              onClick={() => addConditionBranch(id)}
              className="w-5 h-5 rounded bg-white shadow border border-gray-200 text-amber-600 text-xs flex items-center justify-center hover:bg-amber-50"
              title="Add branch"
            >
              +
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(ConditionNodeComponent);
