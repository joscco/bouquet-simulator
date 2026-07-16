import {computed, Injectable, signal} from '@angular/core';
import {DEFAULT_FLOWERS} from '../data/default-flowers';
import {
  BouquetFlower,
  BouquetBackgroundMode,
  BouquetProject,
  BouquetSceneEffectId,
  BouquetState,
  FlowerDefinition,
  ProjectExport,
} from '../models/flower.models';
import {validateFlowerDefinition} from '../models/flower-validation';
import {
  DEFAULT_VASE_ID,
  DEFAULT_VASE_MATERIAL_ID,
  VaseMaterialId,
  isVaseId,
  isVaseMaterialId,
  vaseInsertionRadius,
} from '../data/vases';
import {materializeDefinitionComponents} from '../models/flower-components';
import {autoCorrectBouquetFlowerOverlaps} from '../rendering/bouquet-flower-overlaps';
import {clamp} from '../utils/numbers';
import {
  DEFAULT_BOUQUET_BACKGROUND,
  DEFAULT_BOUQUET_SCENE_EFFECTS,
  isBouquetBackgroundMode,
  normalizedBouquetBackgroundMode,
  normalizedBouquetSceneEffects,
} from '../data/bouquet-scene';
import {moveFlowerInsideVase} from './bouquet-flower-placement';
import {
  isBouquetProject,
  isBouquetState,
  isFlowerDefinition,
  isProjectExport,
  normalizeDefinition,
  normalizeDefinitions,
} from './bouquet-state-validation';
import {componentMatches} from './flower-component-matches';

export {moveFlowerInsideVase} from './bouquet-flower-placement';

export interface DefinitionUsage {
  bouquetInstances: number;
  componentDefinitions: Array<{id: string; name: string}>;
}

export interface BouquetSummary {
  id: string;
  name: string;
  index: number;
  flowerCount: number;
}

@Injectable({providedIn: 'root'})
export class BouquetStore {
  static readonly MAX_BOUQUETS = 4;

  readonly definitions = signal<FlowerDefinition[]>(normalizeDefinitions(DEFAULT_FLOWERS));
  readonly materializedDefinitions = computed(() => materializeDefinitionComponents(this.definitions()));
  readonly bouquets = signal<BouquetProject[]>([{
    id: this.createBouquetId(),
    name: 'Strauß 1',
    state: this.createInitialBouquet(),
  }]);
  readonly activeBouquetId = signal(this.bouquets()[0]!.id);
  readonly state = signal<BouquetState>(structuredClone(this.bouquets()[0]!.state));
  readonly flowerCount = computed(() => this.state().flowers.length);
  readonly activeBouquetName = computed(() =>
    this.bouquets().find((bouquet) => bouquet.id === this.activeBouquetId())?.name ?? 'Strauß');
  readonly bouquetSummaries = computed<BouquetSummary[]>(() =>
    this.bouquets().map((bouquet, index) => ({
      id: bouquet.id,
      name: bouquet.name,
      index: index + 1,
      flowerCount: bouquet.state.flowers.length,
    })));
  readonly canAddBouquet = computed(() => this.bouquets().length < BouquetStore.MAX_BOUQUETS);

  addBouquet(): void {
    if (!this.canAddBouquet()) return;
    const nextIndex = this.bouquets().length + 1;
    const bouquet: BouquetProject = {
      id: this.createBouquetId(),
      name: `Strauß ${nextIndex}`,
      state: {
        schemaVersion: 2,
        rotation: 0,
        vaseId: DEFAULT_VASE_ID,
        vaseMaterialId: DEFAULT_VASE_MATERIAL_ID,
        backgroundMode: DEFAULT_BOUQUET_BACKGROUND,
        sceneEffects: structuredClone(DEFAULT_BOUQUET_SCENE_EFFECTS),
        flowers: [],
      },
    };
    this.bouquets.update((bouquets) => [...bouquets, bouquet]);
    this.activeBouquetId.set(bouquet.id);
    this.state.set(structuredClone(bouquet.state));
  }

  removeBouquet(bouquetId: string): void {
    const bouquets = this.bouquets();
    if (bouquets.length <= 1) return;
    const removedIndex = bouquets.findIndex((bouquet) => bouquet.id === bouquetId);
    if (removedIndex < 0) return;

    this.syncActiveBouquetState();
    const remainingBouquets = this.bouquets().filter((bouquet) => bouquet.id !== bouquetId);
    const fallbackBouquet = remainingBouquets[Math.min(removedIndex, remainingBouquets.length - 1)]!;
    const activeBouquet = bouquetId === this.activeBouquetId()
      ? fallbackBouquet
      : remainingBouquets.find((bouquet) => bouquet.id === this.activeBouquetId()) ?? fallbackBouquet;

    this.bouquets.set(remainingBouquets);
    this.activeBouquetId.set(activeBouquet.id);
    this.state.set(structuredClone(activeBouquet.state));
  }

  selectBouquet(bouquetId: string): void {
    if (bouquetId === this.activeBouquetId()) return;
    const target = this.bouquets().find((bouquet) => bouquet.id === bouquetId);
    if (!target) return;
    this.syncActiveBouquetState();
    this.activeBouquetId.set(target.id);
    this.state.set(structuredClone(target.state));
  }

  renameActiveBouquet(name: string): void {
    const trimmed = name.trim();
    const nextName = trimmed || this.activeBouquetName();
    this.bouquets.update((bouquets) => bouquets.map((bouquet) =>
      bouquet.id === this.activeBouquetId()
        ? {...bouquet, name: nextName}
        : bouquet));
  }

  addFlower(definitionId: string): void {
    this.updateActiveBouquetState((state) => this.withArrangedFlowers({
      ...state,
      flowers: [...state.flowers, this.createPlacement(definitionId, 0, 0, 0, 1)],
    }));
  }

  shuffleBouquet(): void {
    this.updateActiveBouquetState((state) => this.withArrangedFlowers({
      ...state,
      flowers: state.flowers.map((flower) => ({...flower, seed: Math.random()})),
    }));
  }

  removeFlower(instanceId: string): void {
    this.updateActiveBouquetState((state) => this.withArrangedFlowers({
      ...state,
      flowers: state.flowers.filter((flower) => flower.instanceId !== instanceId),
    }));
  }

  copyFlower(instanceId: string): void {
    this.updateActiveBouquetState((state) => {
      const source = state.flowers.find((flower) => flower.instanceId === instanceId);
      if (!source) return state;
      const copy: BouquetFlower = {
        ...structuredClone(source),
        instanceId: this.createInstanceId(),
        x: clamp(source.x + 4, -30, 30),
        z: clamp(source.z + 4, -30, 30),
      };
      return this.withResolvedFlowerOverlaps({...state, flowers: [...state.flowers, copy]});
    });
  }

  setFlowerCut(instanceId: string, cutRatio: number): void {
    this.updateActiveBouquetState((state) => this.withResolvedFlowerOverlaps({
      ...state,
      flowers: state.flowers.map((flower) =>
        flower.instanceId === instanceId
          ? {...flower, cutRatio: clamp(cutRatio, 0, 0.98)}
          : flower),
    }));
  }

  setRotation(rotation: number): void {
    this.updateActiveBouquetState((state) => ({...state, rotation}));
  }

  setVase(vaseId: string): void {
    if (!isVaseId(vaseId)) return;
    this.updateActiveBouquetState((state) => this.withArrangedFlowers({...state, vaseId}));
  }

  setVaseMaterial(vaseMaterialId: VaseMaterialId): void {
    if (!isVaseMaterialId(vaseMaterialId)) return;
    this.updateActiveBouquetState((state) => ({...state, vaseMaterialId}));
  }

  setBackgroundMode(backgroundMode: BouquetBackgroundMode): void {
    if (!isBouquetBackgroundMode(backgroundMode)) return;
    this.updateActiveBouquetState((state) => ({...state, backgroundMode}));
  }

  setSceneEffect(effectId: BouquetSceneEffectId, enabled: boolean): void {
    if (!['sparkles', 'glowPoints', 'uplight'].includes(effectId)) return;
    this.updateActiveBouquetState((state) => ({
      ...state,
      sceneEffects: {
        ...normalizedBouquetSceneEffects(state.sceneEffects),
        [effectId]: enabled,
      },
    }));
  }

  rotateBy(delta: number): void {
    this.setRotation(this.state().rotation + delta);
  }

  moveFlower(instanceId: string, deltaX: number, deltaY: number, deltaZ: number): void {
    this.updateActiveBouquetState((state) => ({
      ...state,
      flowers: state.flowers.map((flower) =>
        flower.instanceId === instanceId
          ? moveFlowerInsideVase(flower, deltaX, deltaY, deltaZ, state.rotation, vaseInsertionRadius(state.vaseId))
          : flower),
    }));
  }

  autoCorrectFlowerOverlaps(): void {
    this.updateActiveBouquetState((state) => this.withResolvedFlowerOverlaps(state));
  }

  replaceDefinition(definition: FlowerDefinition): void {
    const normalized = normalizeDefinition(definition);
    this.definitions.update((definitions) => {
      const existing = definitions.findIndex((candidate) => candidate.id === normalized.id);
      if (existing < 0) return [...definitions, normalized];
      return definitions.map((candidate, index) => index === existing ? normalized : candidate);
    });
  }

  restoreDefinitions(value: unknown): boolean {
    if (!Array.isArray(value) || value.length === 0) return false;
    try {
      const definitions = value.map((definition) => {
        if (!isFlowerDefinition(definition)) {
          throw new Error('Ungültige Blumendefinition.');
        }
        const error = validateFlowerDefinition(definition)
          .find((issue) => issue.severity === 'error');
        if (error) throw new Error(error.message);
        return structuredClone(definition);
      });
      this.definitions.set(normalizeDefinitions(definitions));
      return true;
    } catch {
      return false;
    }
  }

  definitionUsage(definitionId: string): DefinitionUsage {
    const componentDefinitions = this.definitions()
      .filter((definition) => definition.id !== definitionId)
      .filter((definition) => definition.nodes.some((node) =>
        componentMatches(node.component, definitionId, true)))
      .map((definition) => ({id: definition.id, name: definition.name}));

    return {
      bouquetInstances: this.bouquets()
        .flatMap((bouquet) => bouquet.state.flowers)
        .filter((flower) => flower.definitionId === definitionId).length,
      componentDefinitions,
    };
  }

  componentUsage(componentId: string): Array<{id: string; name: string}> {
    return this.definitions()
      .filter((definition) => definition.nodes.some((node) =>
        componentMatches(node.component, componentId, false)))
      .map((definition) => ({id: definition.id, name: definition.name}));
  }

  removeDefinition(definitionId: string): void {
    this.definitions.update((definitions) =>
      definitions.filter((definition) => definition.id !== definitionId));
    this.updateAllBouquetStates((state) => ({
      ...state,
      flowers: state.flowers.filter((flower) => flower.definitionId !== definitionId),
    }));
  }

  exportProject(): ProjectExport {
    const bouquets = this.bouquetsWithCurrentState();
    const activeBouquet = bouquets.find((bouquet) => bouquet.id === this.activeBouquetId()) ?? bouquets[0]!;
    return {
      schemaVersion: 2,
      exportedAt: new Date().toISOString(),
      definitions: this.definitions(),
      bouquet: activeBouquet.state,
      bouquets,
      activeBouquetId: activeBouquet.id,
    };
  }

  importProject(project: ProjectExport): void {
    if (
      project.schemaVersion !== 2
      || !Array.isArray(project.definitions)
      || !isBouquetState(project.bouquet)
    ) {
      throw new Error('Nicht unterstütztes Projektformat.');
    }
    for (const definition of project.definitions) {
      const error = validateFlowerDefinition(definition).find((issue) => issue.severity === 'error');
      if (error) throw new Error(`Ungültige Blume „${definition.name}“: ${error.message}`);
    }
    const definitionIds = new Set(project.definitions.map((definition) => definition.id));
    const bouquets = this.projectBouquets(project);
    if (bouquets.some((bouquet) => bouquet.state.flowers.some((flower) => !definitionIds.has(flower.definitionId)))) {
      throw new Error('Das Projekt enthält eine Blume ohne passende Definition.');
    }
    this.definitions.set(normalizeDefinitions(project.definitions));
    this.setBouquets(bouquets, project.activeBouquetId);
  }

  restoreProject(project: unknown): boolean {
    if (!isProjectExport(project)) return false;
    try {
      this.importProject(project);
      return true;
    } catch {
      return false;
    }
  }

  restoreProjectState(project: unknown, discardMissingDefinitions = false): boolean {
    if (!isProjectExport(project)) return false;
    const definitionIds = new Set(this.definitions().map((definition) => definition.id));
    let bouquets = this.projectBouquets(project);
    const hasMissingDefinitions = bouquets.some((bouquet) =>
      bouquet.state.flowers.some((flower) => !definitionIds.has(flower.definitionId)));
    if (hasMissingDefinitions && !discardMissingDefinitions) {
      return false;
    }
    if (hasMissingDefinitions) {
      bouquets = bouquets.map((bouquet) => ({
        ...bouquet,
        state: {
          ...bouquet.state,
          flowers: bouquet.state.flowers.filter((flower) => definitionIds.has(flower.definitionId)),
        },
      }));
    }
    this.setBouquets(bouquets, project.activeBouquetId);
    return true;
  }

  restoreBouquet(bouquet: unknown): boolean {
    if (!isBouquetState(bouquet)) return false;

    const definitionIds = new Set(this.definitions().map((definition) => definition.id));
    if (bouquet.flowers.some((flower) => !definitionIds.has(flower.definitionId))) return false;

    this.setBouquets([{id: this.createBouquetId(), name: 'Strauß 1', state: structuredClone(bouquet)}]);
    return true;
  }

  resetBouquet(): void {
    this.updateActiveBouquetState(() => ({
      schemaVersion: 2,
      rotation: 0,
      vaseId: DEFAULT_VASE_ID,
      vaseMaterialId: DEFAULT_VASE_MATERIAL_ID,
      backgroundMode: DEFAULT_BOUQUET_BACKGROUND,
      sceneEffects: structuredClone(DEFAULT_BOUQUET_SCENE_EFFECTS),
      flowers: [],
    }));
  }

  private createInitialBouquet(): BouquetState {
    return this.withResolvedFlowerOverlaps({
      schemaVersion: 2,
      rotation: 0,
      vaseId: DEFAULT_VASE_ID,
      vaseMaterialId: DEFAULT_VASE_MATERIAL_ID,
      backgroundMode: DEFAULT_BOUQUET_BACKGROUND,
      sceneEffects: structuredClone(DEFAULT_BOUQUET_SCENE_EFFECTS),
      flowers: [
        this.createPlacement('garden-rose', -18, -16, 4, 1.03, 0.04, 0.16),
        this.createPlacement('meadow-daisy', 16, -15, -9, 0.92, -0.08, -0.14),
        this.createPlacement('lilac', 2, -17, 18, 1, 0.13, -0.02),
      ],
    });
  }

  private updateActiveBouquetState(updater: (state: BouquetState) => BouquetState): void {
    this.setActiveBouquetState(updater(this.state()));
  }

  private setActiveBouquetState(state: BouquetState): void {
    const nextState = structuredClone(state);
    this.state.set(nextState);
    this.bouquets.update((bouquets) => bouquets.map((bouquet) =>
      bouquet.id === this.activeBouquetId()
        ? {...bouquet, state: structuredClone(nextState)}
        : bouquet));
  }

  private updateAllBouquetStates(updater: (state: BouquetState) => BouquetState): void {
    let activeState = this.state();
    this.bouquets.update((bouquets) => bouquets.map((bouquet) => {
      const nextState = updater(bouquet.id === this.activeBouquetId() ? this.state() : bouquet.state);
      if (bouquet.id === this.activeBouquetId()) activeState = nextState;
      return {...bouquet, state: structuredClone(nextState)};
    }));
    this.state.set(structuredClone(activeState));
  }

  private syncActiveBouquetState(): void {
    const activeState = structuredClone(this.state());
    this.bouquets.update((bouquets) => bouquets.map((bouquet) =>
      bouquet.id === this.activeBouquetId()
        ? {...bouquet, state: activeState}
        : bouquet));
  }

  private bouquetsWithCurrentState(): BouquetProject[] {
    const activeState = structuredClone(this.state());
    return this.bouquets().map((bouquet) =>
      bouquet.id === this.activeBouquetId()
        ? {...bouquet, state: activeState}
        : structuredClone(bouquet));
  }

  private setBouquets(bouquets: BouquetProject[], activeBouquetId = bouquets[0]?.id): void {
    const nextBouquets = bouquets
      .slice(0, BouquetStore.MAX_BOUQUETS)
      .map((bouquet, index) => ({
        id: bouquet.id || this.createBouquetId(),
        name: bouquet.name.trim() || `Strauß ${index + 1}`,
        state: this.withResolvedFlowerOverlaps(this.normalizedBouquetState(bouquet.state)),
      }));
    if (!nextBouquets.length) return;

    const activeId = nextBouquets.some((bouquet) => bouquet.id === activeBouquetId)
      ? activeBouquetId!
      : nextBouquets[0]!.id;
    this.bouquets.set(nextBouquets);
    this.activeBouquetId.set(activeId);
    this.state.set(structuredClone(nextBouquets.find((bouquet) => bouquet.id === activeId)!.state));
  }

  private projectBouquets(project: ProjectExport): BouquetProject[] {
    if (Array.isArray(project.bouquets) && project.bouquets.length) {
      const validBouquets = project.bouquets.filter(isBouquetProject);
      if (validBouquets.length) return validBouquets;
    }
    return [{id: this.createBouquetId(), name: 'Strauß 1', state: structuredClone(project.bouquet)}];
  }

  private normalizedBouquetState(state: BouquetState): BouquetState {
    return {
      ...structuredClone(state),
      vaseId: isVaseId(state.vaseId) ? state.vaseId : DEFAULT_VASE_ID,
      vaseMaterialId: isVaseMaterialId(state.vaseMaterialId)
        ? state.vaseMaterialId
        : DEFAULT_VASE_MATERIAL_ID,
      backgroundMode: normalizedBouquetBackgroundMode(state.backgroundMode),
      sceneEffects: normalizedBouquetSceneEffects(state.sceneEffects),
    };
  }

  private withArrangedFlowers(state: BouquetState): BouquetState {
    const count = state.flowers.length;
    if (!count) return state;
    const maximumRadius = Math.max(0, vaseInsertionRadius(state.vaseId) - 2);
    return this.withResolvedFlowerOverlaps({
      ...state,
      flowers: state.flowers.map((flower, index) => {
        const angle = index * Math.PI * (3 - Math.sqrt(5)) + flower.seed * Math.PI * 2;
        const seedWave = Math.sin((flower.seed + index) * 31.7);
        const radius = count === 1 ? 0 : Math.min(maximumRadius, 6 + Math.sqrt(index) * 6);
        const lean = 0.08 + Math.min(0.16, radius / 150) + seedWave * 0.025;
        return {
          ...flower,
          x: Math.cos(angle) * radius,
          y: -16 + seedWave * 1.5,
          z: Math.sin(angle) * radius,
          leanX: Math.sin(angle) * lean,
          leanZ: -Math.cos(angle) * lean,
          rotationY: angle + seedWave * Math.PI,
          scale: 0.96 + seedWave * 0.035,
        };
      }),
    });
  }

  private withResolvedFlowerOverlaps(state: BouquetState): BouquetState {
    return autoCorrectBouquetFlowerOverlaps(
      state,
      this.materializedDefinitions(),
      vaseInsertionRadius(state.vaseId),
    );
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
      instanceId: this.createInstanceId(),
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

  private createInstanceId(): string {
    return globalThis.crypto?.randomUUID?.() ?? `flower-${Date.now()}-${Math.random()}`;
  }

  private createBouquetId(): string {
    return globalThis.crypto?.randomUUID?.() ?? `bouquet-${Date.now()}-${Math.random()}`;
  }
}
