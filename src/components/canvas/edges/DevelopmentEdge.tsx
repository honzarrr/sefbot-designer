'use client';

import { memo, useState } from 'react';
import {
  getSmoothStepPath,
  EdgeLabelRenderer,
  type EdgeProps,
} from '@xyflow/react';
import { useDesignerStore } from '@/stores/designerStore';

const TYPE_COLORS: Record<string, string> = {
  direct: '#4A90D9',
  conditional: '#F5A623',
  button: '#7ED321',
};

function DevelopmentEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  style = {},
}: EdgeProps) {
  const deleteConnection = useDesignerStore((s) => s.deleteConnection);
  const [hovered, setHovered] = useState(false);

  const edgeData = data as Record<string, unknown> | undefined;
  const label = (edgeData?.label as string) || '';
  const connectionType = (edgeData?.connectionType as string) || 'direct';
  const color = TYPE_COLORS[connectionType] || TYPE_COLORS.direct;
  const opacity = edgeData?.opacity as number | undefined;

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const effectiveOpacity = opacity ?? 1;

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
        strokeWidth={selected ? 3 : 2}
        strokeOpacity={effectiveOpacity}
        style={style}
        className={`react-flow__edge-path ${selected ? 'react-flow__edge-path--animated' : ''}`}
        markerEnd={`url(#dev-arrow-${connectionType})`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />
      {/* Arrow marker definitions */}
      <defs>
        <marker
          id={`dev-arrow-${connectionType}`}
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth={8}
          markerHeight={8}
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={color} fillOpacity={effectiveOpacity} />
        </marker>
      </defs>
      <EdgeLabelRenderer>
        {label && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              opacity: effectiveOpacity,
              borderColor: color,
              color: color,
            }}
            className="text-[10px] bg-white px-1.5 py-0.5 rounded border shadow-sm nodrag nopan"
          >
            {label}
          </div>
        )}
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

export default memo(DevelopmentEdgeComponent);
