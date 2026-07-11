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
      this.createPlacement('garden-rose', -18, -16, 4, 1.03, 0.04, 0.16),
      this.createPlacement('meadow-daisy', 16, -15, -9, 0.92, -0.08, -0.14),
      this.createPlacement('lilac', 2, -17, 18, 1, 0.13, -0.02),
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

  moveFlower(instanceId: string, deltaX: number, deltaY: number, deltaZ: number): void {
    this.state.update((state) => ({
      ...state,
      flowers: state.flowers.map((flower) =>
        flower.instanceId === instanceId
          ? moveFlowerInsideVase(flower, deltaX, deltaY, deltaZ, state.rotation)
          : flower),
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
        const angle = index * Math.PI * (3 - Math.sqrt(5)) + flower.seed * Math.PI * 2;
        const seedWave = Math.sin((flower.seed + index) * 31.7);
        const radius = count === 1 ? 0 : Math.min(28, 9 + Math.sqrt(index) * 7);
        const lean = 0.08 + Math.min(0.16, radius / 150) + seedWave * 0.025;
        return {
          ...flower,
          x: Math.cos(angle) * radius,
          y: -16 + seedWave * 1.5,
          z: Math.sin(angle) * radius,
          leanX: Math.sin(angle) * lean,
          leanZ: -Math.cos(angle) * lean,
          scale: 0.96 + seedWave * 0.035,
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
    leanX = 0,
    leanZ = 0,
  ): BouquetFlower {
    return {
      instanceId: globalThis.crypto?.randomUUID?.() ?? `flower-${Date.now()}-${Math.random()}`,
      definitionId,
      x,
      y,
      z,
      scale,
      leanX,
      leanZ,
      seed: Math.random(),
      nodeOffsets: {},
    };
  }
}

export function moveFlowerInsideVase(
  flower: BouquetFlower,
  deltaX: number,
  deltaY: number,
  deltaZ: number,
  bouquetRotation: number,
): BouquetFlower {
  const insertionRadius = 30;
  let x = flower.x + deltaX * 0.16;
  let z = flower.z + deltaZ * 0.16;
  const radius = Math.hypot(x, z);
  if (radius > insertionRadius) {
    x = x / radius * insertionRadius;
    z = z / radius * insertionRadius;
  }

  const depthDrag = deltaY * 0.28;
  const tiltWorldX = deltaX + Math.sin(bouquetRotation) * depthDrag;
  const tiltWorldZ = deltaZ + Math.cos(bouquetRotation) * depthDrag;
  let leanX = (flower.leanX ?? 0) + tiltWorldZ * 0.0028;
  let leanZ = (flower.leanZ ?? 0) - tiltWorldX * 0.0028;
  const maximumLean = 0.42;
  const leanLength = Math.hypot(leanX, leanZ);
  if (leanLength > maximumLean) {
    leanX = leanX / leanLength * maximumLean;
    leanZ = leanZ / leanLength * maximumLean;
  }

  return {
    ...flower,
    x,
    y: clamp(flower.y + deltaY * 0.015, -18, -14),
    z,
    leanX,
    leanZ,
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
