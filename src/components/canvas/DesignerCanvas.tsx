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
import DevelopmentEdge from '@/components/canvas/edges/DevelopmentEdge';
import CanvasContextMenu from '@/components/canvas/controls/CanvasContextMenu';
import SearchBar from '@/components/canvas/controls/SearchBar';
import { CanvasModeSwitch } from '@/components/canvas/CanvasModeSwitch';
import { FocusModeToggle } from '@/components/canvas/FocusModeToggle';
import { ShowHiddenToggle } from '@/components/canvas/ShowHiddenToggle';
import { WarningsPanel } from '@/components/canvas/WarningsPanel';
import { ChainStackOverlay } from '@/components/canvas/ChainStack';

const nodeTypes: NodeTypes = {
  stepNode: StepNode,
  conditionNode: ConditionNodeComponent,
  softStartNode: SoftStartNode,
  noteNode: NoteNode,
};

const edgeTypes: EdgeTypes = {
  customEdge: CustomEdge,
  developmentEdge: DevelopmentEdge,
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
  const canvasMode = useDesignerStore((s) => s.canvasMode);
  const focusedBlockId = useDesignerStore((s) => s.focusedBlockId);
  const setFocusedBlock = useDesignerStore((s) => s.setFocusedBlock);
  const showHidden = useDesignerStore((s) => s.showHidden);

  // Enable keyboard shortcuts and auto-save
  useKeyboardShortcuts();
  useAutoSave();

  // Build focus sets for determining opacity
  const focusSets = useMemo(() => {
    if (!focusedBlockId || !project) return null;
    const connectedNodeIds = new Set<string>();
    connectedNodeIds.add(focusedBlockId);
    const connectedEdgeIds = new Set<string>();
    project.connections.forEach((conn) => {
      if (conn.sourceId === focusedBlockId || conn.targetId === focusedBlockId) {
        connectedNodeIds.add(conn.sourceId);
        connectedNodeIds.add(conn.targetId);
        connectedEdgeIds.add(conn.id);
      }
    });
    return { connectedNodeIds, connectedEdgeIds };
  }, [focusedBlockId, project]);

  // Convert store data to React Flow nodes
  const nodes: AppNode[] = useMemo(() => {
    if (!project) return [];
    const result: AppNode[] = [];

    project.steps.forEach((step) => {
      const isFaded = focusSets && !focusSets.connectedNodeIds.has(step.id);
      result.push({
        id: step.id,
        type: 'stepNode',
        position: nodePositions[step.id] || { x: 100, y: 100 },
        data: { step },
        style: isFaded ? { opacity: 0.3 } : undefined,
        // In client mode, nodes are non-interactive
        ...(canvasMode === 'client' ? { draggable: false, selectable: false, connectable: false } : {}),
      });
    });

    // In client mode, hide condition nodes and soft starts (only show content)
    if (canvasMode !== 'client') {
      project.conditions.forEach((condition) => {
        const isFaded = focusSets && !focusSets.connectedNodeIds.has(condition.id);
        result.push({
          id: condition.id,
          type: 'conditionNode',
          position: nodePositions[condition.id] || { x: 300, y: 100 },
          data: { condition },
          style: isFaded ? { opacity: 0.3 } : undefined,
        });
      });

      project.softStarts.forEach((softStart) => {
        const isFaded = focusSets && !focusSets.connectedNodeIds.has(softStart.id);
        result.push({
          id: softStart.id,
          type: 'softStartNode',
          position: nodePositions[softStart.id] || { x: 50, y: 50 },
          data: { softStart },
          style: isFaded ? { opacity: 0.3 } : undefined,
        });
      });
    }

    project.notes.forEach((note) => {
      result.push({
        id: note.id,
        type: 'noteNode',
        position: nodePositions[note.id] || note.position,
        data: { note },
      });
    });

    return result;
  }, [project, nodePositions, canvasMode, focusSets]);

  // Convert store connections to React Flow edges filtered by canvas mode
  const edges: Edge[] = useMemo(() => {
    if (!project) return [];

    // Client mode: no edges at all
    if (canvasMode === 'client') return [];

    return project.connections
      .filter((conn) => {
        const layer = conn.layer || 'design';
        // Filter hidden connections
        if (conn.isHidden && !showHidden) return false;
        // Design mode: only design-layer connections
        if (canvasMode === 'design' && layer !== 'design') return false;
        // Development mode: all connections
        return true;
      })
      .map((conn) => {
        const sourceStep = project.steps.find((s) => s.id === conn.sourceId);
        const layer = conn.layer || 'design';
        const isDev = layer === 'development';
        const isHidden = conn.isHidden;

        // Determine focus-based opacity
        let opacity = 1;
        if (focusSets) {
          opacity = focusSets.connectedEdgeIds.has(conn.id) ? 1 : 0.1;
        }
        if (canvasMode === 'development' && !isDev) {
          // Design connections in dev mode shown at 40% opacity
          opacity = Math.min(opacity, 0.4);
        }
        if (isHidden && showHidden) {
          opacity = Math.min(opacity, 0.2);
        }

        // Determine connection type for dev edges
        let connectionType = 'direct';
        if (conn.sourceHandleId?.startsWith('button-')) connectionType = 'button';
        else if (conn.sourceHandleId?.startsWith('condition-')) connectionType = 'conditional';

        if (isDev) {
          return {
            id: conn.id,
            source: conn.sourceId,
            sourceHandle: conn.sourceHandleId || null,
            target: conn.targetId,
            type: 'developmentEdge',
            data: {
              label: conn.label || '',
              connectionType,
              opacity,
            },
          };
        }

        // Design layer edge
        return {
          id: conn.id,
          source: conn.sourceId,
          sourceHandle: conn.sourceHandleId || null,
          target: conn.targetId,
          type: 'customEdge',
          data: {
            label: conn.label || '',
            color: conn.color || sourceStep?.color || '#4A90D9',
            opacity,
          },
          style: canvasMode === 'development'
            ? { strokeDasharray: '5 5', opacity: opacity }
            : isHidden
              ? { strokeDasharray: '3 3', opacity: opacity }
              : { opacity },
        };
      });
  }, [project, canvasMode, focusSets, showHidden]);

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

  // Focus mode: click node in development mode to focus its connections
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: AppNode) => {
      if (canvasMode === 'development') {
        setFocusedBlock(focusedBlockId === node.id ? null : node.id);
      }
    },
    [canvasMode, focusedBlockId, setFocusedBlock]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();

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
    // Reset focus mode when clicking canvas background
    if (focusedBlockId) setFocusedBlock(null);
  }, [focusedBlockId, setFocusedBlock]);

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
        onNodeClick={onNodeClick}
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
        nodesConnectable={canvasMode !== 'client'}
        nodesDraggable={canvasMode !== 'client'}
        elementsSelectable={canvasMode !== 'client'}
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

      {/* Canvas Mode + Toolbar Overlays */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
        <CanvasModeSwitch />
        {canvasMode === 'development' && <FocusModeToggle />}
        <ShowHiddenToggle />
      </div>

      {/* Search Overlay */}
      <SearchBar />

      {/* Warnings Panel (development mode) */}
      <WarningsPanel />

      {/* Chain Collapsing (development mode) */}
      <ChainStackOverlay />

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
