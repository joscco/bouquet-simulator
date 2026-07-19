import {TestBed} from '@angular/core/testing';
import {describe, expect, it} from 'vitest';
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
