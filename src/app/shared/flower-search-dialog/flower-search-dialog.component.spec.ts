import {TestBed} from '@angular/core/testing';
import {describe, expect, it, vi} from 'vitest';
import {FlowerDefinition} from '../../core/models/flower.models';
import {provideTestTransloco} from '../../testing/transloco-testing';
import {FlowerSearchDialogComponent, FlowerSearchEntry} from './flower-search-dialog.component';

describe('FlowerSearchDialogComponent', () => {
  it('filters entries by every query token in the name', () => {
    const fixture = createFixture();
    fixture.componentInstance.query.set('rosa rose');

    expect(fixture.componentInstance.filteredEntries().map((entry) => entry.id)).toEqual(['rose']);
  });

  it('splits matching text into highlighted segments without changing its content', () => {
    const fixture = createFixture();
    fixture.componentInstance.query.set('lil');

    const segments = fixture.componentInstance.highlighted('Lilienblüte');

    expect(segments.map((segment) => segment.text).join('')).toBe('Lilienblüte');
    expect(segments.some((segment) => segment.match && segment.text === 'Lil')).toBe(true);
  });

  it('only exposes definition actions when requested', () => {
    const fixture = createFixture();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-definition-action]')).toBeNull();

    const create = vi.fn();
    const load = vi.fn();
    fixture.componentInstance.createDefinition.subscribe(create);
    fixture.componentInstance.loadDefinition.subscribe(load);
    fixture.componentRef.setInput('definitionActions', true);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('[data-definition-action="create"]').click();
    fixture.nativeElement.querySelector('[data-definition-action="load"]').click();
    expect(create).toHaveBeenCalledOnce();
    expect(load).toHaveBeenCalledOnce();
  });

  it('can be contained by a parent workspace instead of covering the viewport', () => {
    const fixture = createFixture();
    fixture.componentRef.setInput('contained', true);
    fixture.detectChanges();

    const backdrop: HTMLDivElement = fixture.nativeElement.firstElementChild;
    expect(backdrop.classList.contains('absolute')).toBe(true);
    expect(backdrop.classList.contains('fixed')).toBe(false);
  });

  it('renders an optional primary action independently from search results', () => {
    const fixture = createFixture();
    const action = vi.fn();
    fixture.componentInstance.primaryAction.subscribe(action);
    fixture.componentRef.setInput('primaryActionLabel', 'Neuer Basisknoten');
    fixture.componentRef.setInput('primaryActionDescription', 'Leer starten');
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('[data-primary-action]');
    expect(button.textContent).toContain('Neuer Basisknoten');
    button.click();

    expect(action).toHaveBeenCalledOnce();
  });
});

function createFixture() {
  TestBed.configureTestingModule({
    imports: [FlowerSearchDialogComponent],
    providers: [provideTestTransloco()],
  });
  const fixture = TestBed.createComponent(FlowerSearchDialogComponent);
  fixture.componentRef.setInput('entries', entries());
  fixture.componentRef.setInput('title', 'Suchen');
  fixture.componentRef.setInput('placeholder', 'Blume suchen');
  return fixture;
}

function entries(): FlowerSearchEntry[] {
  return [
    {id: 'rose', name: 'Rosa Rose', definition: definition('rose', 'Rosa Rose')},
    {id: 'lily', name: 'Lilienblüte', definition: definition('lily', 'Lilienblüte')},
  ];
}

function definition(id: string, name: string): FlowerDefinition {
  return {
    schemaVersion: 2,
    id,
    name,
    rootNodeId: 'root',
    stem: {color: '#008000', highlightColor: '#00a000', width: 4, taper: 0.8},
    nodes: [{id: 'root', name: 'Wurzel', draggable: false, graphic: null, connections: []}],
  };
}
