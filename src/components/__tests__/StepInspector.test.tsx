import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StepInspector } from '../canvas/StepInspector';

// Mock fetch globally
global.fetch = vi.fn();

// Mock the zustand store
const mockState: Record<string, unknown> = {
  project: {
    id: 'proj-1',
    steps: [{ id: 'step-1', name: 'Test Step', blocks: [] }],
  },
  selectedIds: ['step-1'],
  canvasMode: 'development',
};

vi.mock('@/stores/designerStore', () => ({
  useDesignerStore: (selector: (s: typeof mockState) => unknown) => selector(mockState),
}));

describe('StepInspector', () => {
  it('returns null when not in development mode', () => {
    mockState.canvasMode = 'design';
    const { container } = render(<StepInspector />);
    expect(container.innerHTML).toBe('');
    mockState.canvasMode = 'development';
  });

  it('returns null when no step is selected', () => {
    mockState.selectedIds = [];
    const { container } = render(<StepInspector />);
    expect(container.innerHTML).toBe('');
    mockState.selectedIds = ['step-1'];
  });

  it('shows loading state when fetching step data', () => {
    // Mock fetch to return a pending promise
    vi.mocked(global.fetch).mockReturnValue(new Promise(() => {}));

    render(<StepInspector />);
    // Initially should show loading
    expect(screen.getByText('Loading step data...')).toBeInTheDocument();
  });

  it('renders 4 tabs when step data is loaded', async () => {
    const stepData = {
      id: 'step-1',
      name: 'Test Step',
      type: 'message',
      output: { text: 'Hello' },
      input: { type: 'none' },
      jump: [],
      settings: { typingIndicator: true },
    };

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([stepData]),
    } as Response);

    render(<StepInspector />);

    // Wait for data to load
    const outputTab = await screen.findByText('Output');
    expect(outputTab).toBeInTheDocument();
    expect(screen.getByText('Input')).toBeInTheDocument();
    expect(screen.getByText('Jump')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });
});
