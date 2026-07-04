import {computed, Injectable, signal} from '@angular/core';
import {DEFAULT_FLOWERS} from '../data/default-flowers';
import {BouquetFlower, BouquetState, FlowerDefinition, ProjectExport} from '../models/flower.models';
import {validateFlowerDefinition} from '../models/flower-validation';

@Injectable({providedIn: 'root'})
export class BouquetStore {
  readonly definitions = signal<FlowerDefinition[]>(structuredClone(DEFAULT_FLOWERS));
  readonly state = signal<BouquetState>({
    schemaVersion: 2,
    rotation: 0,
    flowers: [
      this.createPlacement('garden-rose', -62, -6, 24, 1.03),
      this.createPlacement('meadow-daisy', 55, 8, -22, 0.92),
      this.createPlacement('lilac', 4, 0, 60, 1),
    ],
  });
  readonly flowerCount = computed(() => this.state().flowers.length);

  addFlower(definitionId: string): void {
    this.state.update((state) => this.withArrangedFlowers({
      ...state,
      flowers: [...state.flowers, this.createPlacement(definitionId, 0, 0, 0, 1)],
    }));
  }

  shuffleBouquet(): void {
    this.state.update((state) => this.withArrangedFlowers({
      ...state,
      flowers: state.flowers.map((flower) => ({...flower, seed: Math.random()})),
    }));
  }

  removeFlower(instanceId: string): void {
    this.state.update((state) => this.withArrangedFlowers({
      ...state,
      flowers: state.flowers.filter((flower) => flower.instanceId !== instanceId),
    }));
  }

  setRotation(rotation: number): void {
    this.state.update((state) => ({...state, rotation}));
  }

  rotateBy(delta: number): void {
    this.setRotation(this.state().rotation + delta);
  }

  moveNode(instanceId: string, nodeId: string, deltaX: number, deltaY: number): void {
    this.state.update((state) => ({
      ...state,
      flowers: state.flowers.map((flower) => flower.instanceId === instanceId ? {
        ...flower,
        nodeOffsets: {
          ...(flower.nodeOffsets ?? {}),
          [nodeId]: {
            x: (flower.nodeOffsets?.[nodeId]?.x ?? 0) + deltaX,
            y: (flower.nodeOffsets?.[nodeId]?.y ?? 0) + deltaY,
          },
        },
      } : flower),
    }));
  }

  resetNodeOffsets(instanceId: string): void {
    this.state.update((state) => ({
      ...state,
      flowers: state.flowers.map((flower) =>
        flower.instanceId === instanceId ? {...flower, nodeOffsets: {}} : flower),
    }));
  }

  replaceDefinition(definition: FlowerDefinition): void {
    this.definitions.update((definitions) => {
      const existing = definitions.findIndex((candidate) => candidate.id === definition.id);
      if (existing < 0) return [...definitions, structuredClone(definition)];
      return definitions.map((candidate, index) => index === existing ? structuredClone(definition) : candidate);
    });
  }

  exportProject(): ProjectExport {
    return {
      schemaVersion: 2,
      exportedAt: new Date().toISOString(),
      definitions: this.definitions(),
      bouquet: this.state(),
    };
  }

  importProject(project: ProjectExport): void {
    if (
      project.schemaVersion !== 2
      || !Array.isArray(project.definitions)
      || !project.bouquet
      || project.bouquet.schemaVersion !== 2
      || !Array.isArray(project.bouquet.flowers)
    ) {
      throw new Error('Nicht unterstütztes Projektformat.');
    }
    for (const definition of project.definitions) {
      const error = validateFlowerDefinition(definition).find((issue) => issue.severity === 'error');
      if (error) throw new Error(`Ungültige Blume „${definition.name}“: ${error.message}`);
    }
    const definitionIds = new Set(project.definitions.map((definition) => definition.id));
    if (project.bouquet.flowers.some((flower) => !definitionIds.has(flower.definitionId))) {
      throw new Error('Das Projekt enthält eine Blume ohne passende Definition.');
    }
    this.definitions.set(structuredClone(project.definitions));
    this.state.set(structuredClone(project.bouquet));
  }

  resetBouquet(): void {
    this.state.set({schemaVersion: 2, rotation: 0, flowers: []});
  }

  private withArrangedFlowers(state: BouquetState): BouquetState {
    const count = state.flowers.length;
    if (!count) return state;
    return {
      ...state,
      flowers: state.flowers.map((flower, index) => {
        const centered = count === 1 ? 0 : index / (count - 1) - 0.5;
        const seedWave = Math.sin((flower.seed + index) * 31.7);
        const depthWave = Math.cos((flower.seed + index) * 17.3);
        const spread = Math.min(150, 48 + count * 16);
        return {
          ...flower,
          x: centered * spread + seedWave * 10,
          y: -Math.abs(centered) * 10 + depthWave * 5,
          z: centered * 34 + depthWave * 18,
          scale: 0.92 + (1 - Math.abs(centered)) * 0.12 + seedWave * 0.025,
        };
      }),
    };
  }

  private createPlacement(
    definitionId: string,
    x: number,
    y: number,
    z: number,
    scale: number,
  ): BouquetFlower {
    return {
      instanceId: globalThis.crypto?.randomUUID?.() ?? `flower-${Date.now()}-${Math.random()}`,
      definitionId,
      x,
      y,
      z,
      scale,
      seed: Math.random(),
      nodeOffsets: {},
    };
  }
}
