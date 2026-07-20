import {ChangeDetectionStrategy, Component, computed, input, output, signal} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {TranslocoPipe} from '@jsverse/transloco';
import {FlowerDefinition} from '../../core/models/flower.models';
import {FlowerThumbnailComponent} from '../flower-thumbnail/flower-thumbnail.component';

export interface FlowerSearchEntry {
  id: string;
  name: string;
  definition: FlowerDefinition;
}

interface HighlightSegment {
  text: string;
  match: boolean;
}

@Component({
  selector: 'app-flower-search-dialog',
  imports: [FlowerThumbnailComponent, MatIconModule, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './flower-search-dialog.component.html',
})
export class FlowerSearchDialogComponent {
  readonly entries = input.required<readonly FlowerSearchEntry[]>();
  readonly title = input.required<string>();
  readonly placeholder = input.required<string>();
  readonly definitionActions = input(false);
  readonly primaryActionLabel = input('');
  readonly primaryActionDescription = input('');
  readonly primaryActionIcon = input('add_circle');
  readonly query = signal('');
  readonly entrySelect = output<string>();
  readonly primaryAction = output<void>();
  readonly createDefinition = output<void>();
  readonly loadDefinition = output<void>();
  readonly close = output<void>();

  readonly queryTokens = computed(() => this.query()
    .trim()
    .split(/\s+/)
    .filter(Boolean));

  readonly filteredEntries = computed(() => {
    const tokens = this.queryTokens().map(normalizeSearch);
    if (!tokens.length) return this.entries();
    return this.entries().filter((entry) => {
      const searchable = normalizeSearch(entry.name);
      return tokens.every((token) => searchable.includes(token));
    });
  });

  highlighted(text: string): HighlightSegment[] {
    const tokens = this.queryTokens();
    if (!tokens.length || !text) return [{text, match: false}];
    const pattern = tokens
      .sort((left, right) => right.length - left.length)
      .map(escapeRegExp)
      .join('|');
    if (!pattern) return [{text, match: false}];
    const matcher = new RegExp(`(${pattern})`, 'gi');
    return text.split(matcher)
      .filter((segment) => segment.length > 0)
      .map((segment) => ({
        text: segment,
        match: tokens.some((token) => segment.localeCompare(token, undefined, {sensitivity: 'accent'}) === 0),
      }));
  }
}

function normalizeSearch(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('de')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
