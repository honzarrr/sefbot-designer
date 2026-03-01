'use client';

import { useCallback, useRef, useMemo, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  SelectionMode,
  type Edge,
  type OnConnect,
  type OnNodesChange,
  type OnSelectionChangeFunc,
  type NodeTypes,
  type EdgeTypes,
  type ReactFlowInstance,
  type Connection as RFConnection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useDesignerStore } from '@/stores/designerStore';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useAutoSave } from '@/hooks/useAutoSave';
import type { DragElementType, AppNode } from '@/types';
import StepNode from '@/components/canvas/nodes/StepNode';
import ConditionNodeComponent from '@/components/canvas/nodes/ConditionNode';
import SoftStartNode from '@/components/canvas/nodes/SoftStartNode';
import NoteNode from '@/components/canvas/nodes/NoteNode';
import CustomEdge from '@/components/canvas/edges/CustomEdge';
import CanvasContextMenu from '@/components/canvas/controls/CanvasContextMenu';
import SearchBar from '@/components/canvas/controls/SearchBar';

const nodeTypes: NodeTypes = {
  stepNode: StepNode,
  conditionNode: ConditionNodeComponent,
  softStartNode: SoftStartNode,
  noteNode: NoteNode,
};

const edgeTypes: EdgeTypes = {
  customEdge: CustomEdge,
};

interface ContextMenuState {
  x: number;
  y: number;
  sourceNodeId: string;
  sourceHandleId?: string;
}

function DesignerCanvasInner() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useRef<ReactFlowInstance<AppNode, Edge> | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const project = useDesignerStore((s) => s.project);
  const nodePositions = useDesignerStore((s) => s.nodePositions);
  const updateNodePosition = useDesignerStore((s) => s.updateNodePosition);
  const addStep = useDesignerStore((s) => s.addStep);
  const addCondition = useDesignerStore((s) => s.addCondition);
  const addSoftStart = useDesignerStore((s) => s.addSoftStart);
  const addNote = useDesignerStore((s) => s.addNote);
  const addConnection = useDesignerStore((s) => s.addConnection);
  const selectElements = useDesignerStore((s) => s.selectElements);
  const clearSelection = useDesignerStore((s) => s.clearSelection);

  // Enable keyboard shortcuts and auto-save
  useKeyboardShortcuts();
  useAutoSave();

  // Convert store data to React Flow nodes
  const nodes: AppNode[] = useMemo(() => {
    if (!project) return [];
    const result: AppNode[] = [];

    project.steps.forEach((step) => {
      result.push({
        id: step.id,
        type: 'stepNode',
        position: nodePositions[step.id] || { x: 100, y: 100 },
        data: { step },
      });
    });

    project.conditions.forEach((condition) => {
      result.push({
        id: condition.id,
        type: 'conditionNode',
        position: nodePositions[condition.id] || { x: 300, y: 100 },
        data: { condition },
      });
    });

    project.softStarts.forEach((softStart) => {
      result.push({
        id: softStart.id,
        type: 'softStartNode',
        position: nodePositions[softStart.id] || { x: 50, y: 50 },
        data: { softStart },
      });
    });

    project.notes.forEach((note) => {
      result.push({
        id: note.id,
        type: 'noteNode',
        position: nodePositions[note.id] || note.position,
        data: { note },
      });
    });

    return result;
  }, [project, nodePositions]);

  // Convert store connections to React Flow edges
  const edges: Edge[] = useMemo(() => {
    if (!project) return [];
    return project.connections.map((conn) => {
      const sourceStep = project.steps.find((s) => s.id === conn.sourceId);
      return {
        id: conn.id,
        source: conn.sourceId,
        sourceHandle: conn.sourceHandleId || null,
        target: conn.targetId,
        type: 'customEdge',
        data: {
          label: conn.label || '',
          color: conn.color || sourceStep?.color || '#4A90D9',
        },
      };
    });
  }, [project]);

  const onNodesChange: OnNodesChange<AppNode> = useCallback(
    (changes) => {
      changes.forEach((change) => {
        if (change.type === 'position' && change.position) {
          updateNodePosition(change.id, change.position);
        }
      });
    },
    [updateNodePosition]
  );

  // Sync React Flow selection to Zustand store
  const onSelectionChange: OnSelectionChangeFunc = useCallback(
    ({ nodes: selectedNodes }) => {
      const ids = selectedNodes.map((n) => n.id);
      if (ids.length > 0) {
        selectElements(ids);
      } else {
        clearSelection();
      }
    },
    [selectElements, clearSelection]
  );

  const onConnect: OnConnect = useCallback(
    (connection: RFConnection) => {
      if (!connection.source || !connection.target) return;

      let label: string | undefined;
      if (connection.sourceHandle?.startsWith('button-')) {
        const buttonId = connection.sourceHandle.replace('button-', '');
        const step = project?.steps.find((s) => s.id === connection.source);
        if (step) {
          for (const block of step.blocks) {
            if (block.type === 'buttons') {
              const btn = block.buttons.find((b) => b.id === buttonId);
              if (btn) label = btn.label;
            }
          }
        }
      }

      if (connection.sourceHandle?.startsWith('condition-')) {
        const branchId = connection.sourceHandle.replace('condition-', '');
        const condition = project?.conditions.find((c) => c.id === connection.source);
        if (condition) {
          const branch = condition.conditions.find((b) => b.id === branchId);
          if (branch) label = branch.label;
        }
      }

      addConnection({
        sourceId: connection.source,
        sourceHandleId: connection.sourceHandle || undefined,
        targetId: connection.target,
        label,
      });
    },
    [addConnection, project]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/sefbot-type') as DragElementType;
      if (!type) return;

      if (!reactFlowInstance.current) return;
      const position = reactFlowInstance.current.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      switch (type) {
        case 'step':
          addStep(position);
          break;
        case 'condition':
          addCondition(position);
          break;
        case 'soft-start':
          addSoftStart(position);
          break;
        case 'note':
          addNote(position);
          break;
      }
    },
    [addStep, addCondition, addSoftStart, addNote]
  );

  const onInit = useCallback((instance: ReactFlowInstance<AppNode, Edge>) => {
    reactFlowInstance.current = instance;
  }, []);

  // Handle right-click context menu on nodes (for creating connections)
  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: AppNode) => {
      event.preventDefault();
      // Only show context menu for nodes that can be connection sources
      if (node.type === 'noteNode') return;
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        sourceNodeId: node.id,
      });
    },
    []
  );

  const onPaneClick = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleContextMenuConnect = useCallback(
    (targetId: string) => {
      if (!contextMenu) return;
      addConnection({
        sourceId: contextMenu.sourceNodeId,
        sourceHandleId: contextMenu.sourceHandleId,
        targetId,
      });
      setContextMenu(null);
    },
    [contextMenu, addConnection]
  );

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        No project loaded
      </div>
    );
  }

  return (
    <div ref={reactFlowWrapper} className="h-full w-full relative">
      <ReactFlow<AppNode, Edge>
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onSelectionChange={onSelectionChange}
        onConnect={onConnect}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onInit={onInit}
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{ type: 'customEdge' }}
        fitView
        deleteKeyCode={null}
        selectionMode={SelectionMode.Partial}
        selectionOnDrag
        panOnDrag={[1]}
        snapToGrid
        snapGrid={[16, 16]}
        multiSelectionKeyCode="Shift"
      >
        <Controls />
        <MiniMap
          zoomable
          pannable
          nodeStrokeWidth={3}
          style={{ height: 120, width: 160 }}
        />
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
      </ReactFlow>

      {/* Search Overlay */}
      <SearchBar />

      {/* Context Menu */}
      {contextMenu && (
        <CanvasContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          sourceNodeId={contextMenu.sourceNodeId}
          onConnect={handleContextMenuConnect}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}

export default function DesignerCanvas() {
  return (
    <ReactFlowProvider>
      <DesignerCanvasInner />
    </ReactFlowProvider>
  );
}
