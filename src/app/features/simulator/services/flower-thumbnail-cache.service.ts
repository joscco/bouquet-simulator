import {Injectable, signal} from '@angular/core';
import {FlowerDefinition} from '../../../core/models/flower.models';

@Injectable({providedIn: 'root'})
export class FlowerThumbnailCache {
  private readonly snapshots = signal<Record<string, string>>({});

  keyFor(definition: FlowerDefinition): string {
    return `${definition.id}:${hashString(JSON.stringify(definition))}`;
  }

  snapshot(key: string): string | null {
    return this.snapshots()[key] ?? null;
  }

  store(key: string, dataUrl: string): void {
    if (!key || !dataUrl.startsWith('data:image/')) return;
    this.snapshots.update((snapshots) => snapshots[key]
      ? snapshots
      : {...snapshots, [key]: dataUrl});
  }
}

function hashString(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}
