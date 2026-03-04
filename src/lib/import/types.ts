// === Voiceflow .vf File Type Definitions ===

// Top-level VF file structure
export interface VFFile {
  version: VFVersion;
  project: VFProject;
  diagrams: Record<string, VFDiagram>;
  responses: Record<string, unknown>;
  responseDiscriminators: Record<string, VFResponseDiscriminator>;
  responseMessages: Record<string, VFResponseMessage>;
  variables: Record<string, unknown>;
  flows?: Record<string, unknown>;
  entities?: Record<string, unknown>;
  intents?: Record<string, unknown>;
  utterances?: Record<string, unknown>;
  attachments?: Record<string, unknown>;
  functions?: Record<string, unknown>;
}

export interface VFVersion {
  _id?: string;
  name?: string;
  [key: string]: unknown;
}

export interface VFProject {
  _id?: string;
  name: string;
  platform?: string;
  teamID?: string;
  [key: string]: unknown;
}

// === Diagrams ===

export interface VFDiagram {
  _id: string;
  name: string;
  type: 'TOPIC' | 'TEMPLATE' | string;
  nodes: Record<string, VFNode>;
  [key: string]: unknown;
}

// === Nodes ===

export interface VFNode {
  nodeID: string;
  type: VFNodeType;
  coords?: [number, number];
  data?: VFNodeData;
  portsV2?: VFPortsV2;
  [key: string]: unknown;
}

export type VFNodeType =
  | 'block'
  | 'message'
  | 'buttons'
  | 'buttons-v2'
  | 'start'
  | 'markup_text'
  | 'visual'
  | 'ifV2'
  | 'goToNode'
  | 'actions'
  | string;

export interface VFNodeData {
  // block node
  name?: string;
  color?: string;
  steps?: string[]; // child node IDs

  // message node
  messageID?: string;

  // buttons node (v1)
  buttons?: VFButton[];

  // buttons-v2 node
  items?: VFButtonV2Item[];

  // start node
  label?: string;

  // markup_text node
  content?: VFTextSegment[];

  // visual node
  image?: string;

  // ifV2 node
  expressions?: VFExpression[];

  // goToNode
  goToNodeID?: string;
  diagramID?: string;

  [key: string]: unknown;
}

// === Buttons ===

export interface VFButton {
  name: string;
  actions?: unknown[];
  [key: string]: unknown;
}

export interface VFButtonV2Item {
  id: string;
  label?: VFButtonV2Label[];
  [key: string]: unknown;
}

export interface VFButtonV2Label {
  text?: string[];
  [key: string]: unknown;
}

// === Conditions (ifV2) ===

export interface VFExpression {
  name?: string;
  value?: unknown[];
  [key: string]: unknown;
}

// === Ports ===

export interface VFPortsV2 {
  byKey?: Record<string, VFPort>;
  builtIn?: Record<string, VFPort>;
  dynamic?: VFPort[];
}

export interface VFPort {
  id?: string;
  target?: string | null;
  type?: string;
  data?: {
    points?: number[][];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

// === Response Messages (text content chain) ===

export interface VFResponseDiscriminator {
  _id: string;
  responseID?: string;
  channel?: string;
  [key: string]: unknown;
}

export interface VFResponseMessage {
  _id: string;
  discriminatorID?: string;
  text?: VFTextSegment[];
  [key: string]: unknown;
}

// === Rich Text ===

export type VFTextSegment = string | VFRichTextNode;

export interface VFRichTextNode {
  text: VFTextSegment[];
  attributes?: {
    fontWeight?: string;  // "700" = bold
    fontStyle?: string;   // "italic"
    __type?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}
