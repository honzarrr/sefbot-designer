import { describe, it, expect } from 'vitest';

describe('Build verification - page exports', () => {
  it('home page exports default', async () => {
    const mod = await import('@/app/page');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });

  it('project page exports default', async () => {
    const mod = await import('@/app/project/page');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });

  it('layout exports default', async () => {
    const mod = await import('@/app/layout');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });

  it('error page exports default', async () => {
    const mod = await import('@/app/error');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });

  it('not-found page exports default', async () => {
    const mod = await import('@/app/not-found');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });

  it('loading page exports default', async () => {
    const mod = await import('@/app/loading');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });
});

describe('Build verification - core modules', () => {
  it('designerStore exports useDesignerStore', async () => {
    const mod = await import('@/stores/designerStore');
    expect(mod.useDesignerStore).toBeDefined();
  });

  it('types exports STEP_COLORS', async () => {
    const mod = await import('@/types');
    expect(mod.STEP_COLORS).toBeDefined();
    expect(mod.STEP_COLORS).toHaveLength(10);
  });

  it('transform module exports transformDesignerToDevelopment', async () => {
    const mod = await import('@/lib/transform/designer-to-development');
    expect(mod.transformDesignerToDevelopment).toBeDefined();
    expect(typeof mod.transformDesignerToDevelopment).toBe('function');
  });

  it('storage module exports all functions', async () => {
    const mod = await import('@/lib/storage');
    expect(mod.loadProjectList).toBeDefined();
    expect(mod.saveProjectList).toBeDefined();
    expect(mod.loadProject).toBeDefined();
    expect(mod.saveProject).toBeDefined();
    expect(mod.deleteProjectData).toBeDefined();
  });

  it('utils module exports cn', async () => {
    const mod = await import('@/lib/utils');
    expect(mod.cn).toBeDefined();
  });
});
