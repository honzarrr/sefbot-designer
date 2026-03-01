// === BLOCK TYPES ===
export type BlockType = 'text' | 'buttons' | 'user-input';

export interface TextBlock {
  id: string;
  type: 'text';
  content: string; // supports basic HTML: <b>, <i>
}

export interface ButtonItem {
  id: string;
  label: string;
}

export interface ButtonsBlock {
  id: string;
  type: 'buttons';
  buttons: ButtonItem[];
}

export interface UserInputBlock {
  id: string;
  type: 'user-input';
  placeholder?: string;
}

export type Block = TextBlock | ButtonsBlock | UserInputBlock;

// === STEP (a node on the canvas) ===
export interface Step {
  id: string;
  name: string;
  color: string; // one of 10 predefined colors
  blocks: Block[]; // ordered list — buttons/user-input must be last, max 1
}

// === CONDITION NODE ===
export interface ConditionBranch {
  id: string;
  label: string;
}

export interface ConditionNode {
  id: string;
  conditions: ConditionBranch[];
}

// === SOFT START NODE ===
export interface SoftStart {
  id: string;
  name: string;
  buttonLabel: string;
}

// === NOTE (sticky note on canvas) ===
export interface StickyNote {
  id: string;
  content: string;
  position: { x: number; y: number };
}

// === ANCHOR (kotva) ===
export interface Anchor {
  id: string;
  targetElementId: string; // references any element
  label?: string;
}

// === CONNECTION (edge) ===
export interface Connection {
  id: string;
  sourceId: string;
  sourceHandleId?: string; // for button-specific connections
  targetId: string;
  label?: string; // auto-filled from button label if from button
  color?: string; // defaults to source step color
}

// === PROJECT ===
export interface ProjectListItem {
  id: string;
  name: string;
  status: 'progress' | 'approval' | 'done';
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  status: 'progress' | 'approval' | 'done';
  steps: Step[];
  conditions: ConditionNode[];
  softStarts: SoftStart[];
  notes: StickyNote[];
  connections: Connection[];
  anchors: Anchor[];
  versions: ProjectVersion[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectVersion {
  id: string;
  name: string;
  date: string;
  snapshot: string; // JSON stringified project state
}

// === REACT FLOW NODE DATA TYPES ===
export type StepNodeData = {
  step: Step;
  [key: string]: unknown;
};

export type ConditionNodeData = {
  condition: ConditionNode;
  [key: string]: unknown;
};

export type SoftStartNodeData = {
  softStart: SoftStart;
  [key: string]: unknown;
};

export type NoteNodeData = {
  note: StickyNote;
  [key: string]: unknown;
};

// React Flow typed nodes
import type { Node } from '@xyflow/react';
export type StepNodeType = Node<StepNodeData, 'stepNode'>;
export type ConditionNodeType = Node<ConditionNodeData, 'conditionNode'>;
export type SoftStartNodeType = Node<SoftStartNodeData, 'softStartNode'>;
export type NoteNodeType = Node<NoteNodeData, 'noteNode'>;
export type AppNode = StepNodeType | ConditionNodeType | SoftStartNodeType | NoteNodeType;

// === COLOR PALETTE ===
export const STEP_COLORS = [
  '#4A90D9', // Blue
  '#7B68EE', // Purple
  '#E74C3C', // Red
  '#F39C12', // Orange
  '#27AE60', // Green
  '#1ABC9C', // Teal
  '#E91E63', // Pink
  '#8D6E63', // Brown
  '#607D8B', // Grey-blue
  '#2C3E50', // Dark navy
] as const;

// === ELEMENT TYPES FOR DRAG & DROP ===
export type DragElementType = 'step' | 'condition' | 'soft-start' | 'note';
