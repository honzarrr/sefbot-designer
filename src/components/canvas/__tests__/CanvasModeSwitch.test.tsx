import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CanvasModeSwitch } from '../CanvasModeSwitch';

// Mock the zustand store
const mockState = {
  canvasMode: 'design' as const,
  setCanvasMode: vi.fn(),
  project: { status: 'draft' },
};

vi.mock('@/stores/designerStore', () => ({
  useDesignerStore: (selector: (s: typeof mockState) => unknown) => selector(mockState),
}));

describe('CanvasModeSwitch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.canvasMode = 'design';
    mockState.project = { status: 'draft' };
  });

  it('renders 3 mode buttons', () => {
    render(<CanvasModeSwitch />);

    expect(screen.getByTitle('Client View')).toBeInTheDocument();
    expect(screen.getByTitle('Design')).toBeInTheDocument();
    // Development should be disabled for draft status
    expect(screen.getByTitle('Available when project status is Development or later')).toBeInTheDocument();
  });

  it('disables development mode when status is draft', () => {
    render(<CanvasModeSwitch />);

    const devButton = screen.getByTitle('Available when project status is Development or later');
    expect(devButton).toBeDisabled();
  });

  it('enables development mode when status is development', () => {
    mockState.project = { status: 'development' };
    render(<CanvasModeSwitch />);

    const devButton = screen.getByTitle('Development');
    expect(devButton).not.toBeDisabled();
  });

  it('enables development mode when status is live', () => {
    mockState.project = { status: 'live' };
    render(<CanvasModeSwitch />);

    const devButton = screen.getByTitle('Development');
    expect(devButton).not.toBeDisabled();
  });
});
