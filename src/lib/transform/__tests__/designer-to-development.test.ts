import { describe, it, expect, vi, beforeEach } from 'vitest';
import { transformDesignerToDevelopment } from '../designer-to-development';
import type { Project, Step, Connection, ConditionNode, SoftStart } from '@/types';

// Mock uuid to return predictable IDs
vi.mock('uuid', () => {
  let counter = 0;
  return {
    v4: () => `uuid-${++counter}`,
  };
});

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'project-1',
    name: 'Test Project',
    status: 'draft',
    steps: [],
    conditions: [],
    softStarts: [],
    notes: [],
    connections: [],
    anchors: [],
    versions: [],
    nodePositions: {},
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    ...overrides,
  };
}

function makeStep(id: string, name: string, blocks: Step['blocks'] = []): Step {
  return {
    id,
    name,
    color: '#4A90D9',
    blocks: blocks.length > 0 ? blocks : [{ id: `text-${id}`, type: 'text', content: `Content of ${name}` }],
  };
}

function makeConnection(sourceId: string, targetId: string, sourceHandleId?: string, label?: string): Connection {
  return {
    id: `conn-${sourceId}-${targetId}`,
    sourceId,
    targetId,
    sourceHandleId,
    label,
    layer: 'design',
  };
}

function makeSoftStart(id: string, name: string = 'Start'): SoftStart {
  return { id, name, buttonLabel: 'Begin' };
}

function makeCondition(id: string, branches: { id: string; label: string }[]): ConditionNode {
  return { id, conditions: branches };
}

describe('transformDesignerToDevelopment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty result with warning when no blocks exist', () => {
    const project = makeProject();
    const result = transformDesignerToDevelopment(project);

    expect(result.steps).toHaveLength(0);
    expect(result.connections).toHaveLength(0);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].type).toBe('dead_end');
    expect(result.warnings[0].message).toContain('No start block found');
  });

  it('transforms a single step with no connections (dead end)', () => {
    const project = makeProject({
      steps: [makeStep('step-a', 'Welcome')],
    });

    const result = transformDesignerToDevelopment(project);

    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].name).toBe('Welcome');
    expect(result.steps[0].type).toBe('message');
    expect(result.steps[0].output.text).toBe('Content of Welcome');
    expect(result.steps[0].sourceStepId).toBe('step-a');

    // Should have dead_end warning
    const deadEnd = result.warnings.find((w) => w.type === 'dead_end');
    expect(deadEnd).toBeDefined();
    expect(deadEnd!.message).toContain('dead end');
  });

  it('transforms a linear flow A→B→C with correct steps and connections', () => {
    const steps = [
      makeStep('a', 'Step A'),
      makeStep('b', 'Step B'),
      makeStep('c', 'Step C'),
    ];
    const connections = [
      makeConnection('a', 'b'),
      makeConnection('b', 'c'),
    ];
    const project = makeProject({ steps, connections });

    const result = transformDesignerToDevelopment(project);

    expect(result.steps).toHaveLength(3);
    expect(result.steps[0].name).toBe('Step A');
    expect(result.steps[1].name).toBe('Step B');
    expect(result.steps[2].name).toBe('Step C');

    // A→B and B→C connections
    expect(result.connections).toHaveLength(2);
    expect(result.connections[0].sourceId).toBe('a');
    expect(result.connections[0].targetId).toBe('b');
    expect(result.connections[1].sourceId).toBe('b');
    expect(result.connections[1].targetId).toBe('c');

    // C has no outgoing → dead end
    const deadEnd = result.warnings.find((w) => w.type === 'dead_end');
    expect(deadEnd).toBeDefined();
    expect(deadEnd!.blockId).toBe('c');
  });

  it('transforms branching flow with buttons creating jump rules', () => {
    const btnBlock = {
      id: 'btn-block',
      type: 'buttons' as const,
      buttons: [
        { id: 'btn-1', label: 'Option A' },
        { id: 'btn-2', label: 'Option B' },
        { id: 'btn-3', label: 'Option C' },
      ],
    };
    const steps = [
      makeStep('main', 'Main Menu', [
        { id: 'text-1', type: 'text', content: 'Choose an option' },
        btnBlock,
      ]),
      makeStep('target-a', 'Target A'),
      makeStep('target-b', 'Target B'),
      makeStep('target-c', 'Target C'),
    ];
    const connections = [
      makeConnection('main', 'target-a', 'button-btn-1', 'Option A'),
      makeConnection('main', 'target-b', 'button-btn-2', 'Option B'),
      makeConnection('main', 'target-c', 'button-btn-3', 'Option C'),
    ];
    const project = makeProject({ steps, connections });

    const result = transformDesignerToDevelopment(project);

    // Main step should be type 'button'
    const mainStep = result.steps.find((s) => s.name === 'Main Menu');
    expect(mainStep).toBeDefined();
    expect(mainStep!.type).toBe('button');
    expect(mainStep!.input.type).toBe('button');
    expect(mainStep!.input.options).toHaveLength(3);

    // Should have 3 jump rules
    expect(mainStep!.jump).toHaveLength(3);
    expect(mainStep!.jump[0].buttonLabel).toBe('Option A');
    expect(mainStep!.jump[1].buttonLabel).toBe('Option B');
    expect(mainStep!.jump[2].buttonLabel).toBe('Option C');

    // 3 button connections from main
    const mainConns = result.connections.filter((c) => c.sourceId === 'main');
    expect(mainConns).toHaveLength(3);
    mainConns.forEach((c) => {
      expect(c.jumpRule?.type).toBe('button');
      expect(c.layer).toBe('development');
    });
  });

  it('detects dead end when step has no outgoing connections', () => {
    const project = makeProject({
      steps: [
        makeStep('a', 'Step A'),
        makeStep('b', 'Dead End Step'),
      ],
      connections: [makeConnection('a', 'b')],
    });

    const result = transformDesignerToDevelopment(project);
    const deadEnd = result.warnings.find((w) => w.type === 'dead_end' && w.blockId === 'b');
    expect(deadEnd).toBeDefined();
    expect(deadEnd!.message).toContain('Dead End Step');
  });

  it('detects orphan nodes not reachable from start', () => {
    const project = makeProject({
      steps: [
        makeStep('a', 'Step A'),
        makeStep('orphan', 'Orphan Step'),
      ],
      connections: [],
    });

    const result = transformDesignerToDevelopment(project);

    // 'a' is visited (first step = start), 'orphan' is not reachable
    const orphan = result.warnings.find((w) => w.type === 'orphan' && w.blockId === 'orphan');
    expect(orphan).toBeDefined();
    expect(orphan!.message).toContain('Orphan Step');
    expect(orphan!.message).toContain('not reachable');
  });

  it('detects loops A→B→C→A', () => {
    const project = makeProject({
      steps: [
        makeStep('a', 'Step A'),
        makeStep('b', 'Step B'),
        makeStep('c', 'Step C'),
      ],
      connections: [
        makeConnection('a', 'b'),
        makeConnection('b', 'c'),
        makeConnection('c', 'a'),
      ],
    });

    const result = transformDesignerToDevelopment(project);

    const loop = result.warnings.find((w) => w.type === 'loop_detected');
    expect(loop).toBeDefined();
    expect(loop!.message).toContain('revisited');
  });

  it('uses soft start as entry point when available', () => {
    const project = makeProject({
      softStarts: [makeSoftStart('start-1', 'Welcome Start')],
      steps: [makeStep('a', 'First Step')],
      connections: [makeConnection('start-1', 'a')],
    });

    const result = transformDesignerToDevelopment(project);

    expect(result.steps).toHaveLength(2);
    expect(result.steps[0].name).toBe('Welcome Start');
    expect(result.steps[0].output.text).toBe('Begin');
    expect(result.steps[1].name).toBe('First Step');
  });

  it('transforms condition nodes with branch connections', () => {
    const condition = makeCondition('cond-1', [
      { id: 'branch-yes', label: 'Yes' },
      { id: 'branch-no', label: 'No' },
    ]);
    const project = makeProject({
      steps: [
        makeStep('a', 'Question'),
        makeStep('b', 'Yes Path'),
        makeStep('c', 'No Path'),
      ],
      conditions: [condition],
      connections: [
        makeConnection('a', 'cond-1'),
        makeConnection('cond-1', 'b', 'condition-branch-yes', 'Yes'),
        makeConnection('cond-1', 'c', 'condition-branch-no', 'No'),
      ],
    });

    const result = transformDesignerToDevelopment(project);

    const condStep = result.steps.find((s) => s.name === 'Condition');
    expect(condStep).toBeDefined();
    expect(condStep!.type).toBe('logic');
    expect(condStep!.jump).toHaveLength(2);
    expect(condStep!.jump[0].condition).toBeDefined();
    expect(condStep!.jump[0].condition!.variable).toBe('Yes');
  });

  it('handles user-input blocks as answer type', () => {
    const step = makeStep('a', 'Email Input', [
      { id: 'text-1', type: 'text', content: 'Enter your email' },
      { id: 'ui-1', type: 'user-input', placeholder: 'email@example.com' },
    ]);
    const project = makeProject({ steps: [step] });

    const result = transformDesignerToDevelopment(project);

    expect(result.steps[0].type).toBe('answer');
    expect(result.steps[0].input.type).toBe('text');
    expect(result.steps[0].input.placeholder).toBe('email@example.com');
  });

  it('detects missing button connections', () => {
    const btnBlock = {
      id: 'btn-block',
      type: 'buttons' as const,
      buttons: [
        { id: 'btn-1', label: 'Connected' },
        { id: 'btn-2', label: 'Not Connected' },
      ],
    };
    const project = makeProject({
      steps: [
        makeStep('a', 'Menu', [btnBlock]),
        makeStep('b', 'Target'),
      ],
      connections: [
        makeConnection('a', 'b', 'button-btn-1', 'Connected'),
      ],
    });

    const result = transformDesignerToDevelopment(project);

    const missing = result.warnings.find(
      (w) => w.type === 'missing_connection' && w.message.includes('Not Connected')
    );
    expect(missing).toBeDefined();
  });

  it('handles complex flow with 10+ steps', () => {
    const steps: Step[] = [];
    const connections: Connection[] = [];

    // Create 12 steps
    for (let i = 0; i < 12; i++) {
      steps.push(makeStep(`s${i}`, `Step ${i}`));
    }

    // Linear chain: s0→s1→s2→s3
    connections.push(makeConnection('s0', 's1'));
    connections.push(makeConnection('s1', 's2'));
    connections.push(makeConnection('s2', 's3'));

    // Branch from s3 with buttons
    steps[3] = makeStep('s3', 'Step 3', [
      { id: 'text-s3', type: 'text', content: 'Choose' },
      {
        id: 'btns-s3', type: 'buttons', buttons: [
          { id: 'b1', label: 'Path A' },
          { id: 'b2', label: 'Path B' },
        ],
      },
    ]);
    connections.push(makeConnection('s3', 's4', 'button-b1', 'Path A'));
    connections.push(makeConnection('s3', 's7', 'button-b2', 'Path B'));

    // Path A: s4→s5→s6
    connections.push(makeConnection('s4', 's5'));
    connections.push(makeConnection('s5', 's6'));

    // Path B: s7→s8→s9
    connections.push(makeConnection('s7', 's8'));
    connections.push(makeConnection('s8', 's9'));

    // s10, s11 are orphans
    const project = makeProject({ steps, connections });
    const result = transformDesignerToDevelopment(project);

    // 10 steps reachable (s0-s9), 2 orphans (s10, s11)
    expect(result.steps).toHaveLength(10);
    const orphans = result.warnings.filter((w) => w.type === 'orphan');
    expect(orphans).toHaveLength(2);
  });

  it('filters out development-layer connections during transformation', () => {
    const project = makeProject({
      steps: [makeStep('a', 'Step A'), makeStep('b', 'Step B')],
      connections: [
        makeConnection('a', 'b'),
        { id: 'dev-conn', sourceId: 'a', targetId: 'b', layer: 'development' },
      ],
    });

    const result = transformDesignerToDevelopment(project);

    // Only the design connection should produce a transformed connection
    expect(result.steps).toHaveLength(2);
    expect(result.connections).toHaveLength(1);
  });

  it('assigns sequential step numbers', () => {
    const project = makeProject({
      steps: [
        makeStep('a', 'First'),
        makeStep('b', 'Second'),
        makeStep('c', 'Third'),
      ],
      connections: [
        makeConnection('a', 'b'),
        makeConnection('b', 'c'),
      ],
    });

    const result = transformDesignerToDevelopment(project);

    expect(result.steps[0].number).toBe(1);
    expect(result.steps[1].number).toBe(2);
    expect(result.steps[2].number).toBe(3);
  });
});
