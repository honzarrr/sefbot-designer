'use client';

import { memo, useState } from 'react';
import {
  getBezierPath,
  EdgeLabelRenderer,
  type EdgeProps,
} from '@xyflow/react';
import { useDesignerStore } from '@/stores/designerStore';

function CustomEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style = {},
}: EdgeProps) {
  const deleteConnection = useDesignerStore((s) => s.deleteConnection);
  const [hovered, setHovered] = useState(false);

  const edgeData = data as Record<string, unknown> | undefined;
  const label = (edgeData?.label as string) || '';
  const color = (edgeData?.color as string) || '#4A90D9';

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      {/* Invisible wider path for hover detection */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />
      {/* Visible edge path */}
      <path
        d={edgePath}
        fill="none"
        stroke={color}
        strokeWidth={2}
        style={style}
        className="react-flow__edge-path"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />
      <EdgeLabelRenderer>
        {/* Label at midpoint */}
        {label && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-gray-200 shadow-sm text-gray-600 nodrag nopan"
          >
            {label}
          </div>
        )}
        {/* Delete button on hover */}
        {hovered && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -100%) translate(${labelX}px,${labelY - 12}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            <button
              onClick={() => deleteConnection(id)}
              className="w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center hover:bg-red-600 shadow"
              title="Delete connection"
            >
              x
            </button>
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(CustomEdgeComponent);
