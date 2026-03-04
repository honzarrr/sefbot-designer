import { v4 as uuidv4 } from 'uuid';
import type {
  Project,
  Step,
  Connection,
  TransformResult,
  TransformedStep,
  TransformWarning,
  TransformOutput,
  TransformInput,
  TransformJump,
  TransformStepSettings,
  JumpRule,
} from '@/types';

/**
 * Transforms a designer project into development-ready chatbot steps and connections.
 *
 * Algorithm:
 * 1. Build adjacency map from design connections
 * 2. BFS from start block to find all reachable nodes
 * 3. Map each block to a chatbot step with output/input/jump
 * 4. Create development-layer connections with jump rules
 * 5. Detect warnings (dead ends, orphans, missing connections, loops)
 */
export function transformDesignerToDevelopment(project: Project): TransformResult {
  const steps: TransformedStep[] = [];
  const devConnections: Connection[] = [];
  const warnings: TransformWarning[] = [];

  const designConnections = project.connections.filter(
    (c) => !c.layer || c.layer === 'design'
  );

  // Build adjacency map: sourceId -> { targetId, sourceHandleId, label, connectionId }[]
  const adjacency = new Map<string, { targetId: string; sourceHandleId?: string; label?: string; connectionId: string }[]>();
  for (const conn of designConnections) {
    const existing = adjacency.get(conn.sourceId) || [];
    existing.push({
      targetId: conn.targetId,
      sourceHandleId: conn.sourceHandleId,
      label: conn.label,
      connectionId: conn.id,
    });
    adjacency.set(conn.sourceId, existing);
  }

  // Find start block (first soft start, or first step if no soft start)
  const startId = project.softStarts.length > 0
    ? project.softStarts[0].id
    : project.steps.length > 0
      ? project.steps[0].id
      : null;

  if (!startId) {
    return { steps: [], connections: [], warnings: [{ blockId: '', type: 'dead_end', message: 'No start block found' }] };
  }

  // BFS traversal
  const visited = new Set<string>();
  const queue: string[] = [startId];
  let stepNumber = 1;

  // Create lookup maps
  const stepMap = new Map<string, Step>();
  project.steps.forEach((s) => stepMap.set(s.id, s));

  const conditionMap = new Map<string, typeof project.conditions[0]>();
  project.conditions.forEach((c) => conditionMap.set(c.id, c));

  const softStartMap = new Map<string, typeof project.softStarts[0]>();
  project.softStarts.forEach((s) => softStartMap.set(s.id, s));

  while (queue.length > 0) {
    const nodeId = queue.shift()!;

    if (visited.has(nodeId)) {
      warnings.push({
        blockId: nodeId,
        type: 'loop_detected',
        message: `Loop detected: node "${getNodeName(nodeId, project)}" is revisited`,
      });
      continue;
    }

    visited.add(nodeId);
    const outgoing = adjacency.get(nodeId) || [];

    // Handle steps
    const step = stepMap.get(nodeId);
    if (step) {
      const transformed = transformStep(step, stepNumber++, outgoing);
      steps.push(transformed.step);
      devConnections.push(...transformed.connections);
      warnings.push(...transformed.warnings);
    }

    // Handle conditions
    const condition = conditionMap.get(nodeId);
    if (condition) {
      const transformed = transformCondition(condition, stepNumber++, outgoing);
      steps.push(transformed.step);
      devConnections.push(...transformed.connections);
    }

    // Handle soft starts
    const softStart = softStartMap.get(nodeId);
    if (softStart) {
      const transformed = transformSoftStart(softStart, stepNumber++, outgoing);
      steps.push(transformed.step);
      devConnections.push(...transformed.connections);
    }

    // Queue connected targets
    for (const out of outgoing) {
      if (!visited.has(out.targetId)) {
        queue.push(out.targetId);
      }
    }
  }

  // Detect orphans: nodes not visited by BFS
  const allNodeIds = [
    ...project.steps.map((s) => s.id),
    ...project.conditions.map((c) => c.id),
    ...project.softStarts.map((s) => s.id),
  ];

  for (const nodeId of allNodeIds) {
    if (!visited.has(nodeId)) {
      warnings.push({
        blockId: nodeId,
        type: 'orphan',
        message: `"${getNodeName(nodeId, project)}" is not reachable from the start block`,
      });
    }
  }

  return { steps, connections: devConnections, warnings };
}

function getNodeName(nodeId: string, project: Project): string {
  const step = project.steps.find((s) => s.id === nodeId);
  if (step) return step.name;
  const condition = project.conditions.find((c) => c.id === nodeId);
  if (condition) return `Condition (${condition.conditions.map((b) => b.label).join(', ')})`;
  const softStart = project.softStarts.find((s) => s.id === nodeId);
  if (softStart) return softStart.name;
  return nodeId;
}

interface TransformStepResult {
  step: TransformedStep;
  connections: Connection[];
  warnings: TransformWarning[];
}

function transformStep(
  step: Step,
  number: number,
  outgoing: { targetId: string; sourceHandleId?: string; label?: string; connectionId: string }[]
): TransformStepResult {
  const connections: Connection[] = [];
  const warnings: TransformWarning[] = [];

  // Determine step type based on blocks
  const hasButtons = step.blocks.some((b) => b.type === 'buttons');
  const hasUserInput = step.blocks.some((b) => b.type === 'user-input');

  let type: 'message' | 'button' | 'answer' = 'message';
  if (hasButtons) type = 'button';
  else if (hasUserInput) type = 'answer';

  // Build output from text blocks
  const output: TransformOutput = {};
  const textBlocks = step.blocks.filter((b) => b.type === 'text');
  if (textBlocks.length > 0) {
    output.text = textBlocks.map((b) => b.type === 'text' ? b.content : '').join('\n');
  }

  // Build input
  const input: TransformInput = { type: 'none' };
  if (hasButtons) {
    const buttonsBlock = step.blocks.find((b) => b.type === 'buttons');
    if (buttonsBlock && buttonsBlock.type === 'buttons') {
      input.type = 'button';
      input.options = buttonsBlock.buttons.map((btn) => ({
        label: btn.label,
        value: btn.label,
      }));
    }
  } else if (hasUserInput) {
    const uiBlock = step.blocks.find((b) => b.type === 'user-input');
    if (uiBlock && uiBlock.type === 'user-input') {
      input.type = 'text';
      input.placeholder = uiBlock.placeholder;
    }
  }

  // Build jumps
  const jumps: TransformJump[] = [];

  if (hasButtons) {
    // Per-button jump targets
    const buttonsBlock = step.blocks.find((b) => b.type === 'buttons');
    if (buttonsBlock && buttonsBlock.type === 'buttons') {
      for (const btn of buttonsBlock.buttons) {
        const handleId = `button-${btn.id}`;
        const conn = outgoing.find((o) => o.sourceHandleId === handleId);
        if (conn) {
          jumps.push({
            targetStepId: conn.targetId,
            buttonLabel: btn.label,
          });

          const jumpRule: JumpRule = {
            type: 'button',
            targetStepId: conn.targetId,
            buttonLabel: btn.label,
          };

          connections.push({
            id: uuidv4(),
            sourceId: step.id,
            sourceHandleId: handleId,
            targetId: conn.targetId,
            label: btn.label,
            layer: 'development',
            jumpRule,
          });
        } else {
          warnings.push({
            blockId: step.id,
            stepId: step.id,
            type: 'missing_connection',
            message: `Button "${btn.label}" in step "${step.name}" has no target`,
          });
        }
      }
    }
  } else {
    // Direct jump: first outgoing connection without a specific handle
    const directConn = outgoing.find((o) => !o.sourceHandleId || (!o.sourceHandleId.startsWith('button-') && !o.sourceHandleId.startsWith('condition-')));
    if (directConn) {
      jumps.push({
        targetStepId: directConn.targetId,
        isDefault: true,
      });

      const jumpRule: JumpRule = {
        type: 'direct',
        targetStepId: directConn.targetId,
      };

      connections.push({
        id: uuidv4(),
        sourceId: step.id,
        targetId: directConn.targetId,
        label: 'direct',
        layer: 'development',
        jumpRule,
      });
    } else if (outgoing.length === 0) {
      warnings.push({
        blockId: step.id,
        stepId: step.id,
        type: 'dead_end',
        message: `Step "${step.name}" has no outgoing connections (dead end)`,
      });
    }
  }

  const settings: TransformStepSettings = {
    typingIndicator: true,
    delayMs: 0,
  };

  const transformedStep: TransformedStep = {
    id: uuidv4(),
    sourceBlockId: step.id,
    sourceStepId: step.id,
    number,
    name: step.name,
    type,
    color: step.color,
    output,
    input,
    jump: jumps,
    settings,
  };

  return { step: transformedStep, connections, warnings };
}

function transformCondition(
  condition: { id: string; conditions: { id: string; label: string }[] },
  number: number,
  outgoing: { targetId: string; sourceHandleId?: string; label?: string; connectionId: string }[]
) {
  const connections: Connection[] = [];
  const jumps: TransformJump[] = [];

  for (const branch of condition.conditions) {
    const handleId = `condition-${branch.id}`;
    const conn = outgoing.find((o) => o.sourceHandleId === handleId);
    if (conn) {
      jumps.push({
        targetStepId: conn.targetId,
        condition: {
          variable: branch.label,
          operator: 'equals',
          value: 'true',
        },
      });

      const jumpRule: JumpRule = {
        type: 'conditional',
        targetStepId: conn.targetId,
        condition: {
          variable: branch.label,
          operator: 'equals',
          value: 'true',
        },
      };

      connections.push({
        id: uuidv4(),
        sourceId: condition.id,
        sourceHandleId: handleId,
        targetId: conn.targetId,
        label: branch.label,
        layer: 'development',
        jumpRule,
      });
    }
  }

  const step: TransformedStep = {
    id: uuidv4(),
    sourceBlockId: condition.id,
    sourceStepId: condition.id,
    number,
    name: `Condition`,
    type: 'logic',
    color: '#607D8B',
    output: {},
    input: { type: 'none' },
    jump: jumps,
    settings: { typingIndicator: false },
  };

  return { step, connections };
}

function transformSoftStart(
  softStart: { id: string; name: string; buttonLabel: string },
  number: number,
  outgoing: { targetId: string; sourceHandleId?: string; label?: string; connectionId: string }[]
) {
  const connections: Connection[] = [];
  const jumps: TransformJump[] = [];

  const directConn = outgoing[0];
  if (directConn) {
    jumps.push({
      targetStepId: directConn.targetId,
      isDefault: true,
    });

    connections.push({
      id: uuidv4(),
      sourceId: softStart.id,
      targetId: directConn.targetId,
      label: softStart.buttonLabel,
      layer: 'development',
      jumpRule: {
        type: 'direct',
        targetStepId: directConn.targetId,
      },
    });
  }

  const step: TransformedStep = {
    id: uuidv4(),
    sourceBlockId: softStart.id,
    sourceStepId: softStart.id,
    number,
    name: softStart.name,
    type: 'message',
    color: '#27AE60',
    output: { text: softStart.buttonLabel },
    input: { type: 'button', options: [{ label: softStart.buttonLabel, value: softStart.buttonLabel }] },
    jump: jumps,
    settings: { typingIndicator: false },
  };

  return { step, connections };
}
