import { v4 as uuidv4 } from 'uuid';
import type {
  Project,
  Step,
  TextBlock,
  ButtonsBlock,
  ButtonItem,
  ConditionNode,
  ConditionBranch,
  SoftStart,
  StickyNote,
  Anchor,
} from '@/types';
import type {
  VFFile,
  VFDiagram,
  VFNode,
  VFTextSegment,
  VFResponseMessage,
} from './types';
import { vfRichTextToHtml } from './vf-richtext';
import { vfColorToHex } from './vf-colors';
import { resolveConnections, type ConnectionContext } from './vf-connections';

export interface VFParseResult {
  project: Project;
  stats: {
    steps: number;
    connections: number;
    notes: number;
    conditions: number;
    softStarts: number;
    anchors: number;
    skippedNodes: number;
  };
}

/**
 * Parse a Voiceflow .vf JSON file and convert it to a Sefbot Project.
 */
export function parseVFFile(json: VFFile): VFParseResult {
  // Find the ROOT diagram (type=TOPIC)
  const rootDiagram = findRootDiagram(json.diagrams);
  if (!rootDiagram) {
    throw new Error('No ROOT diagram (type=TOPIC) found in .vf file');
  }

  // Build lookup maps for response messages
  const responseMessageMap = buildResponseMessageMap(json);

  // Convert all nodes
  const steps: Step[] = [];
  const conditions: ConditionNode[] = [];
  const softStarts: SoftStart[] = [];
  const notes: StickyNote[] = [];
  const anchors: Anchor[] = [];
  const nodePositions: Record<string, { x: number; y: number }> = {};

  // Maps for connection resolution
  const nodeIdMap = new Map<string, string>();      // VF nodeID -> Sefbot ID
  const blockParentMap = new Map<string, string>();  // VF child nodeID -> VF block nodeID
  const buttonHandleMap = new Map<string, string>(); // VF portID -> "button-{buttonId}"
  const buttonLabelMap = new Map<string, string>();  // VF portID -> button label
  const conditionHandleMap = new Map<string, string>(); // VF portID -> "condition-{branchId}"
  const conditionLabelMap = new Map<string, string>();  // VF portID -> branch label
  const nodeColorMap = new Map<string, string>();    // VF nodeID -> hex color

  let skippedNodes = 0;
  const nodes = rootDiagram.nodes;

  // First pass: process block nodes and register parent-child relationships
  for (const vfNodeId of Object.keys(nodes)) {
    const node = nodes[vfNodeId];
    if (node.type !== 'block') continue;

    const stepId = uuidv4();
    const stepName = node.data?.name || 'Unnamed Step';
    const stepColor = vfColorToHex(node.data?.color);
    const childNodeIds = node.data?.steps || [];

    nodeIdMap.set(vfNodeId, stepId);
    nodeColorMap.set(vfNodeId, stepColor);

    // Register child nodes
    for (const childId of childNodeIds) {
      blockParentMap.set(childId, vfNodeId);
      nodeColorMap.set(childId, stepColor);
    }

    // Convert child nodes to blocks
    const blocks = convertChildNodes(childNodeIds, nodes, responseMessageMap, {
      buttonHandleMap,
      buttonLabelMap,
    });

    const step: Step = {
      id: stepId,
      name: stepName,
      color: stepColor,
      blocks,
    };
    steps.push(step);

    // Position from coords
    if (node.coords) {
      nodePositions[stepId] = { x: node.coords[0], y: node.coords[1] };
    }
  }

  // Second pass: process non-block nodes (start, markup_text, ifV2, goToNode, visual)
  for (const vfNodeId of Object.keys(nodes)) {
    const node = nodes[vfNodeId];

    switch (node.type) {
      case 'start': {
        const ssId = uuidv4();
        nodeIdMap.set(vfNodeId, ssId);
        const ss: SoftStart = {
          id: ssId,
          name: node.data?.label || 'Start',
          buttonLabel: 'Start',
        };
        softStarts.push(ss);
        if (node.coords) {
          nodePositions[ssId] = { x: node.coords[0], y: node.coords[1] };
        }
        break;
      }

      case 'markup_text': {
        const noteId = uuidv4();
        nodeIdMap.set(vfNodeId, noteId);
        const content = node.data?.content
          ? vfRichTextToHtml(node.data.content as VFTextSegment[])
          : '';
        const pos = node.coords
          ? { x: node.coords[0], y: node.coords[1] }
          : { x: 0, y: 0 };
        const note: StickyNote = {
          id: noteId,
          content,
          position: pos,
        };
        notes.push(note);
        nodePositions[noteId] = pos;
        break;
      }

      case 'visual': {
        // Visual nodes (images) are converted to sticky notes with an image reference
        const noteId = uuidv4();
        nodeIdMap.set(vfNodeId, noteId);
        const imageUrl = node.data?.image || '';
        const content = imageUrl ? `[Image: ${imageUrl}]` : '[Visual element]';
        const pos = node.coords
          ? { x: node.coords[0], y: node.coords[1] }
          : { x: 0, y: 0 };
        const note: StickyNote = {
          id: noteId,
          content,
          position: pos,
        };
        notes.push(note);
        nodePositions[noteId] = pos;
        break;
      }

      case 'ifV2': {
        const condId = uuidv4();
        nodeIdMap.set(vfNodeId, condId);
        const expressions = node.data?.expressions || [];
        const branches: ConditionBranch[] = [];

        // Each expression becomes a branch
        for (const expr of expressions) {
          const branchId = uuidv4();
          branches.push({
            id: branchId,
            label: expr.name || 'Condition',
          });
        }

        // Add "Else" branch (from builtIn.else port)
        const elseBranchId = uuidv4();
        branches.push({ id: elseBranchId, label: 'Else' });

        // Register condition handles for connection resolution
        // Dynamic ports map to expression branches (in order)
        if (node.portsV2?.dynamic) {
          node.portsV2.dynamic.forEach((port, index) => {
            if (port.id && index < branches.length - 1) {
              conditionHandleMap.set(port.id, `condition-${branches[index].id}`);
              conditionLabelMap.set(port.id, branches[index].label);
            }
          });
        }
        // builtIn.else maps to the Else branch
        if (node.portsV2?.builtIn?.else?.id) {
          conditionHandleMap.set(
            node.portsV2.builtIn.else.id,
            `condition-${elseBranchId}`
          );
          conditionLabelMap.set(node.portsV2.builtIn.else.id, 'Else');
        }

        const condition: ConditionNode = {
          id: condId,
          conditions: branches,
        };
        conditions.push(condition);
        if (node.coords) {
          nodePositions[condId] = { x: node.coords[0], y: node.coords[1] };
        }
        break;
      }

      case 'goToNode': {
        const anchorId = uuidv4();
        nodeIdMap.set(vfNodeId, anchorId);
        const targetNodeId = node.data?.goToNodeID || '';
        const anchor: Anchor = {
          id: anchorId,
          targetElementId: targetNodeId, // Will be resolved after all nodes are mapped
          label: 'Go To',
        };
        anchors.push(anchor);
        if (node.coords) {
          nodePositions[anchorId] = { x: node.coords[0], y: node.coords[1] };
        }
        break;
      }

      case 'block':
      case 'message':
      case 'buttons':
      case 'buttons-v2':
        // Already processed or handled as child nodes
        break;

      case 'actions':
      default:
        skippedNodes++;
        break;
    }
  }

  // Post-process: resolve goToNode target references
  for (const anchor of anchors) {
    const resolvedTarget = nodeIdMap.get(anchor.targetElementId);
    if (resolvedTarget) {
      anchor.targetElementId = resolvedTarget;
    }
  }

  // Resolve connections
  const connectionCtx: ConnectionContext = {
    nodeIdMap,
    blockParentMap,
    buttonHandleMap,
    buttonLabelMap,
    conditionHandleMap,
    conditionLabelMap,
    nodeColorMap,
  };

  const connections = resolveConnections(rootDiagram, connectionCtx);

  // Build project
  const projectName = json.project?.name || 'Imported Project';
  const now = new Date().toISOString();

  const project: Project = {
    id: uuidv4(),
    name: projectName,
    status: 'draft',
    steps,
    conditions,
    softStarts,
    notes,
    connections,
    anchors,
    versions: [],
    nodePositions,
    createdAt: now,
    updatedAt: now,
  };

  return {
    project,
    stats: {
      steps: steps.length,
      connections: connections.length,
      notes: notes.length,
      conditions: conditions.length,
      softStarts: softStarts.length,
      anchors: anchors.length,
      skippedNodes,
    },
  };
}

// === Internal helpers ===

function findRootDiagram(diagrams: Record<string, VFDiagram>): VFDiagram | null {
  for (const id of Object.keys(diagrams)) {
    const diagram = diagrams[id];
    if (diagram.type === 'TOPIC') return diagram;
  }
  // Fallback: return the first diagram if no TOPIC found
  const keys = Object.keys(diagrams);
  return keys.length > 0 ? diagrams[keys[0]] : null;
}

/**
 * Build a map from messageID -> resolved HTML content.
 * Chain: message node messageID -> responseDiscriminators -> responseMessages.text
 */
function buildResponseMessageMap(json: VFFile): Map<string, string> {
  const map = new Map<string, string>();
  const { responseDiscriminators, responseMessages } = json;

  if (!responseDiscriminators || !responseMessages) return map;

  // Build discriminatorID -> responseMessage lookup
  // responseMessages are keyed by their _id, and reference discriminatorID
  const discToMessages = new Map<string, VFResponseMessage[]>();

  for (const rmId of Object.keys(responseMessages)) {
    const rm = responseMessages[rmId];
    if (rm.discriminatorID) {
      const existing = discToMessages.get(rm.discriminatorID) || [];
      existing.push(rm);
      discToMessages.set(rm.discriminatorID, existing);
    }
  }

  // Build responseID -> discriminator IDs
  // responseDiscriminators reference responseID
  const responseToDiscs = new Map<string, string[]>();
  for (const discId of Object.keys(responseDiscriminators)) {
    const disc = responseDiscriminators[discId];
    if (disc.responseID) {
      const existing = responseToDiscs.get(disc.responseID) || [];
      existing.push(discId);
      responseToDiscs.set(disc.responseID, existing);
    }
  }

  // For each response, resolve through discriminators to messages
  const responseEntries = Array.from(responseToDiscs.entries());
  for (const [responseId, discIds] of responseEntries) {
    const htmlParts: string[] = [];
    for (const discId of discIds) {
      const messages = discToMessages.get(discId) || [];
      for (const msg of messages) {
        if (msg.text && Array.isArray(msg.text)) {
          htmlParts.push(vfRichTextToHtml(msg.text));
        }
      }
    }
    if (htmlParts.length > 0) {
      map.set(responseId, htmlParts.join('<br>'));
    }
  }

  // Also build a direct messageID -> html map by looking at nodes
  // The message node has data.messageID which is the responseID (or directly links)
  // Some VF files have the messageID directly as a key in responseMessages
  for (const rmId of Object.keys(responseMessages)) {
    const rm = responseMessages[rmId];
    if (rm.text && Array.isArray(rm.text) && !map.has(rmId)) {
      map.set(rmId, vfRichTextToHtml(rm.text));
    }
  }

  return map;
}

interface ButtonMappingContext {
  buttonHandleMap: Map<string, string>;
  buttonLabelMap: Map<string, string>;
}

/**
 * Convert a block's child node IDs into Sefbot Block objects.
 */
function convertChildNodes(
  childNodeIds: string[],
  allNodes: Record<string, VFNode>,
  responseMessageMap: Map<string, string>,
  btnCtx: ButtonMappingContext
): (TextBlock | ButtonsBlock)[] {
  const blocks: (TextBlock | ButtonsBlock)[] = [];

  for (const childId of childNodeIds) {
    const childNode = allNodes[childId];
    if (!childNode) continue;

    switch (childNode.type) {
      case 'message': {
        const messageID = childNode.data?.messageID;
        let content = '';

        if (messageID) {
          // Try to resolve through the response message chain
          content = responseMessageMap.get(messageID) || '';
        }

        if (!content) {
          // Fallback: check if there's direct text content
          content = '(No text content)';
        }

        const textBlock: TextBlock = {
          id: uuidv4(),
          type: 'text',
          content,
        };
        blocks.push(textBlock);
        break;
      }

      case 'buttons': {
        const vfButtons = childNode.data?.buttons || [];
        const buttons: ButtonItem[] = [];

        // For buttons v1, dynamic ports map to buttons by index
        const dynamicPorts = childNode.portsV2?.dynamic || [];

        for (let i = 0; i < vfButtons.length; i++) {
          const btnId = uuidv4();
          const label = vfButtons[i].name || `Button ${i + 1}`;
          buttons.push({ id: btnId, label });

          // Map the dynamic port to this button's handle
          if (i < dynamicPorts.length && dynamicPorts[i].id) {
            btnCtx.buttonHandleMap.set(dynamicPorts[i].id!, `button-${btnId}`);
            btnCtx.buttonLabelMap.set(dynamicPorts[i].id!, label);
          }
        }

        const buttonsBlock: ButtonsBlock = {
          id: uuidv4(),
          type: 'buttons',
          buttons,
        };
        blocks.push(buttonsBlock);
        break;
      }

      case 'buttons-v2': {
        const items = childNode.data?.items || [];
        const buttons: ButtonItem[] = [];

        for (const item of items) {
          const btnId = uuidv4();
          // Extract label from items[].label[].text[]
          const label = item.label
            ?.map((l) => l.text?.join('') || '')
            .join('') || `Button`;
          buttons.push({ id: btnId, label });

          // For buttons-v2, byKey[itemId] maps to button connections
          if (childNode.portsV2?.byKey && item.id) {
            const port = childNode.portsV2.byKey[item.id];
            if (port?.id) {
              btnCtx.buttonHandleMap.set(port.id, `button-${btnId}`);
              btnCtx.buttonLabelMap.set(port.id, label);
            }
          }
        }

        const buttonsBlock: ButtonsBlock = {
          id: uuidv4(),
          type: 'buttons',
          buttons,
        };
        blocks.push(buttonsBlock);
        break;
      }

      default:
        // Skip unknown child node types (actions, etc.)
        break;
    }
  }

  return blocks;
}
