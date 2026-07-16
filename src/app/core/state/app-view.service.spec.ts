import {TestBed} from '@angular/core/testing';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {AppViewState} from './app-view.service';

describe('AppViewState', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    window.history.replaceState({}, '', '/?view=bouquet&project=demo');
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    window.history.replaceState({}, '', '/');
  });

  it('switches views through the query parameter without changing the document path', () => {
    const state = TestBed.inject(AppViewState);

    state.setView('components');

    expect(state.activeView()).toBe('components');
    expect(window.location.pathname).toBe('/');
    expect(new URL(window.location.href).searchParams.get('view')).toBe('components');
    expect(new URL(window.location.href).searchParams.get('project')).toBe('demo');
  });

  it('reacts to browser history popstate changes', () => {
    const state = TestBed.inject(AppViewState);
    state.setView('components');
    window.history.replaceState({}, '', '/?view=bouquet');

    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(state.activeView()).toBe('bouquet');
  });

  it('migrates the legacy editor path to the components query parameter', () => {
    window.history.replaceState({}, '', '/editor');

    const state = TestBed.inject(AppViewState);

    expect(state.activeView()).toBe('components');
    expect(window.location.pathname).toBe('/');
    expect(new URL(window.location.href).searchParams.get('view')).toBe('components');
  });
});
