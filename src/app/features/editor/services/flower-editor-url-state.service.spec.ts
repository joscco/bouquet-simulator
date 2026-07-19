import {TestBed} from '@angular/core/testing';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {FlowerEditorUrlState} from './flower-editor-url-state.service';

describe('FlowerEditorUrlState', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    window.history.replaceState({}, '', '/?view=components&project=demo#editor');
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    window.history.replaceState({}, '', '/');
  });

  it('writes a definition id while preserving other URL state', () => {
    const state = TestBed.inject(FlowerEditorUrlState);

    state.writeCatalogKey('definition:rose');

    const url = new URL(window.location.href);
    expect(url.searchParams.get('flower')).toBe('rose');
    expect(url.searchParams.get('view')).toBe('components');
    expect(url.searchParams.get('project')).toBe('demo');
    expect(url.hash).toBe('#editor');
    expect(state.readCatalogKey()).toBe('definition:rose');
  });

  it('keeps the source prefix for a saved component', () => {
    const state = TestBed.inject(FlowerEditorUrlState);

    state.writeCatalogKey('saved:leaf-cluster');

    expect(new URL(window.location.href).searchParams.get('flower')).toBe('saved:leaf-cluster');
    expect(state.readCatalogKey()).toBe('saved:leaf-cluster');
  });
});
