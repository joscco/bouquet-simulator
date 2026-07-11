import {Injectable, signal} from '@angular/core';
import {
  FlowerSubtreeDefinition,
  isFlowerSubtreeDefinition,
  normalizedFlowerSubtree,
} from '../models/flower-subtree';

const STORAGE_KEY = 'bouquet-studio.flower-subtrees.v1';

@Injectable({providedIn: 'root'})
export class FlowerSubtreeLibrary {
  readonly trees = signal<FlowerSubtreeDefinition[]>(readStoredTrees());

  save(tree: FlowerSubtreeDefinition): void {
    const normalized = normalizedFlowerSubtree(tree);
    this.trees.update((trees) => [normalized, ...trees.filter((candidate) => candidate.id !== normalized.id)]);
    this.persist();
  }

  remove(id: string): void {
    this.trees.update((trees) => trees.filter((tree) => tree.id !== id));
    this.persist();
  }

  import(tree: FlowerSubtreeDefinition): FlowerSubtreeDefinition {
    const occupied = new Set(this.trees().map((candidate) => candidate.id));
    let id = tree.id;
    let suffix = 2;
    while (occupied.has(id)) {
      id = `${tree.id}-${suffix++}`;
    }
    const imported = {...structuredClone(tree), id};
    this.save(imported);
    return imported;
  }

  private persist(): void {
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(this.trees()));
    } catch {
      // Die Library bleibt für die laufende Sitzung nutzbar, auch wenn Storage blockiert ist.
    }
  }
}

function readStoredTrees(): FlowerSubtreeDefinition[] {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter(isFlowerSubtreeDefinition).map(normalizedFlowerSubtree)
      : [];
  } catch {
    return [];
  }
}
