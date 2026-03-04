import { v4 as uuidv4 } from 'uuid';
import type { Connection } from '@/types';
import type { VFNode, VFPort, VFDiagram } from './types';
import { vfColorToHex } from './vf-colors';

/**
 * Context needed to resolve VF connections into Sefbot Connection objects.
 *
 * nodeIdMap: maps VF nodeID -> Sefbot element ID (step, condition, softStart, etc.)
 * blockParentMap: maps VF child nodeID -> parent block VF nodeID (to find the step)
 * buttonHandleMap: maps VF portID -> Sefbot button handle ID (e.g. "button-{buttonId}")
 * buttonLabelMap: maps VF portID -> button label text (for connection labels)
 * conditionHandleMap: maps VF portID -> Sefbot condition handle ID (e.g. "condition-{branchId}")
 * conditionLabelMap: maps VF portID -> condition branch label text
 * nodeColorMap: maps VF nodeID -> hex color string
 */
export interface ConnectionContext {
  nodeIdMap: Map<string, string>;
  blockParentMap: Map<string, string>;
  buttonHandleMap: Map<string, string>;
  buttonLabelMap: Map<string, string>;
  conditionHandleMap: Map<string, string>;
  conditionLabelMap: Map<string, string>;
  nodeColorMap: Map<string, string>;
}

/**
 * Resolve all connections from a VF diagram's nodes.
 * Walks portsV2 on every node and creates Sefbot Connection objects.
 */
export function resolveConnections(
  diagram: VFDiagram,
  ctx: ConnectionContext
): Connection[] {
  const connections: Connection[] = [];
  const nodes = diagram.nodes;

  for (const vfNodeId of Object.keys(nodes)) {
    const node = nodes[vfNodeId];
    if (!node.portsV2) continue;

    const conns = resolveNodePorts(node, ctx);
    connections.push(...conns);
  }

  return connections;
}

function resolveNodePorts(
  node: VFNode,
  ctx: ConnectionContext
): Connection[] {
  const connections: Connection[] = [];
  const ports = node.portsV2;
  if (!ports) return connections;

  const sourceVfId = node.nodeID;

  // Determine the Sefbot source ID.
  // For child nodes (message, buttons, etc.), the source is their parent block's step.
  // For block nodes, the source is the step itself.
  const sourceId = resolveSourceId(sourceVfId, ctx);
  if (!sourceId) return connections;

  const sourceColor = ctx.nodeColorMap.get(sourceVfId) ??
    ctx.nodeColorMap.get(getBlockParent(sourceVfId, ctx) ?? '') ??
    undefined;

  // byKey ports (e.g., "next" for simple flow, or buttonItemId for buttons-v2)
  if (ports.byKey) {
    for (const [key, port] of Object.entries(ports.byKey)) {
      const conn = resolvePort(port, key, sourceId, sourceColor, ctx);
      if (conn) connections.push(conn);
    }
  }

  // builtIn ports ("next" for flow, "else" for fallback)
  if (ports.builtIn) {
    for (const [key, port] of Object.entries(ports.builtIn)) {
      const conn = resolvePort(port, key, sourceId, sourceColor, ctx);
      if (conn) connections.push(conn);
    }
  }

  // dynamic ports (one per button in buttons v1, or per condition branch)
  if (ports.dynamic) {
    for (const port of ports.dynamic) {
      const conn = resolveDynamicPort(port, sourceId, sourceColor, ctx);
      if (conn) connections.push(conn);
    }
  }

  return connections;
}

function resolvePort(
  port: VFPort,
  key: string,
  sourceId: string,
  sourceColor: string | undefined,
  ctx: ConnectionContext
): Connection | null {
  if (!port.target) return null;

  const targetId = resolveTargetId(port.target, ctx);
  if (!targetId) return null;

  // Check if this is a button-v2 connection (byKey[buttonItemId])
  const buttonHandle = port.id ? ctx.buttonHandleMap.get(port.id) : undefined;
  const buttonLabel = port.id ? ctx.buttonLabelMap.get(port.id) : undefined;

  // Check if this is a condition branch connection
  const conditionHandle = port.id ? ctx.conditionHandleMap.get(port.id) : undefined;
  const conditionLabel = port.id ? ctx.conditionLabelMap.get(port.id) : undefined;

  const sourceHandleId = buttonHandle ?? conditionHandle ?? undefined;
  const label = buttonLabel ?? conditionLabel ?? (key === 'else' ? 'Else' : undefined);

  return {
    id: uuidv4(),
    sourceId,
    sourceHandleId,
    targetId,
    label,
    color: sourceColor,
  };
}

function resolveDynamicPort(
  port: VFPort,
  sourceId: string,
  sourceColor: string | undefined,
  ctx: ConnectionContext
): Connection | null {
  if (!port.target) return null;

  const targetId = resolveTargetId(port.target, ctx);
  if (!targetId) return null;

  // Dynamic ports map to button handles or condition handles via their port ID
  const buttonHandle = port.id ? ctx.buttonHandleMap.get(port.id) : undefined;
  const buttonLabel = port.id ? ctx.buttonLabelMap.get(port.id) : undefined;
  const conditionHandle = port.id ? ctx.conditionHandleMap.get(port.id) : undefined;
  const conditionLabel = port.id ? ctx.conditionLabelMap.get(port.id) : undefined;

  const sourceHandleId = buttonHandle ?? conditionHandle ?? undefined;
  const label = buttonLabel ?? conditionLabel ?? undefined;

  return {
    id: uuidv4(),
    sourceId,
    sourceHandleId,
    targetId,
    label,
    color: sourceColor,
  };
}

/**
 * Resolve a VF nodeID to its Sefbot element ID.
 * For child nodes (message, buttons), walks up to the parent block.
 */
function resolveSourceId(vfNodeId: string, ctx: ConnectionContext): string | null {
  // Direct mapping (block, start, condition, etc.)
  const direct = ctx.nodeIdMap.get(vfNodeId);
  if (direct) return direct;

  // Child node — find parent block
  const parentVfId = ctx.blockParentMap.get(vfNodeId);
  if (parentVfId) {
    return ctx.nodeIdMap.get(parentVfId) ?? null;
  }

  return null;
}

/**
 * Resolve a VF target nodeID to a Sefbot element ID.
 * The target might be a block node (maps to a step) or another element.
 */
function resolveTargetId(vfNodeId: string, ctx: ConnectionContext): string | null {
  // Direct mapping
  const direct = ctx.nodeIdMap.get(vfNodeId);
  if (direct) return direct;

  // If the target is a child node, resolve to its parent
  const parentVfId = ctx.blockParentMap.get(vfNodeId);
  if (parentVfId) {
    return ctx.nodeIdMap.get(parentVfId) ?? null;
  }

  return null;
}

function getBlockParent(vfNodeId: string, ctx: ConnectionContext): string | null {
  return ctx.blockParentMap.get(vfNodeId) ?? null;
}

/**
 * Helper: get the hex color for a VF block node (used when building context).
 */
export function getBlockColor(node: VFNode): string {
  return vfColorToHex(node.data?.color);
}
