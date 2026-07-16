import {Box3, Group, Vector3} from 'three';
import {
  BouquetBackgroundMode,
  BouquetSceneEffects as BouquetSceneEffectsState,
} from '../../../core/models/flower.models';
import {normalizedBouquetSceneEffects} from '../../../core/data/bouquet-scene';
import {
  bouquetEffectLoopPhase,
  normalizedBouquetEffectPhase,
} from './bouquet-effect-phase';
import {
  BouquetParticleRuntime,
  createBouquetParticleRuntime,
} from './bouquet-effect-particles';
import {createBouquetUplights} from './bouquet-effect-uplights';

const DEFAULT_EFFECT_BOUNDS = new Box3(
  new Vector3(-80, -180, -80),
  new Vector3(80, 120, 80),
);

interface RenderedEffectsConfiguration {
  state: BouquetSceneEffectsState;
  backgroundMode: BouquetBackgroundMode;
  bounds: Box3;
}

/** Owns the Three.js runtime objects for the configured bouquet scene effects. */
export class BouquetSceneEffectsRenderer {
  readonly group = new Group();

  private state = normalizedBouquetSceneEffects(undefined);
  private backgroundMode: BouquetBackgroundMode = 'light';
  private readonly bounds = DEFAULT_EFFECT_BOUNDS.clone();
  private renderedConfiguration: RenderedEffectsConfiguration | null = null;
  private sparkles: BouquetParticleRuntime | null = null;
  private glowPoints: BouquetParticleRuntime | null = null;

  /** Animation is derived from live runtime objects, not merely requested state. */
  get animated(): boolean {
    return this.sparkles !== null || this.glowPoints !== null;
  }

  configure(
    state: BouquetSceneEffectsState | undefined,
    backgroundMode: BouquetBackgroundMode,
  ): void {
    this.state = normalizedBouquetSceneEffects(state);
    this.backgroundMode = backgroundMode;
    this.rebuildIfNeeded();
  }

  setBounds(bounds: Box3): void {
    if (bounds.isEmpty() || this.bounds.equals(bounds)) return;
    this.bounds.copy(bounds);
    this.rebuildIfNeeded();
  }

  /** Updates the live preview on its fixed six-second loop. */
  update(timeSeconds: number): void {
    this.updatePhase(bouquetEffectLoopPhase(timeSeconds));
  }

  /** Updates all animation from a normalized, recording-duration-independent phase. */
  updatePhase(normalizedPhase: number): void {
    const phase = normalizedBouquetEffectPhase(normalizedPhase);
    this.sparkles?.updatePhase(phase);
    this.glowPoints?.updatePhase(phase);
  }

  dispose(): void {
    this.clearRuntime();
    this.renderedConfiguration = null;
  }

  private rebuildIfNeeded(): void {
    const nextConfiguration: RenderedEffectsConfiguration = {
      state: {...this.state},
      backgroundMode: this.backgroundMode,
      bounds: this.bounds.clone(),
    };
    if (sameConfiguration(this.renderedConfiguration, nextConfiguration)) return;

    this.clearRuntime();

    if (this.state.sparkles) {
      this.sparkles = createBouquetParticleRuntime('sparkles', this.bounds, this.backgroundMode);
      this.group.add(...this.sparkles.objects);
    }
    if (this.state.glowPoints) {
      this.glowPoints = createBouquetParticleRuntime('glowPoints', this.bounds, this.backgroundMode);
      this.group.add(...this.glowPoints.objects);
    }
    if (this.state.uplight) {
      this.group.add(...createBouquetUplights(this.bounds, this.backgroundMode));
    }

    this.renderedConfiguration = nextConfiguration;
    this.updatePhase(0);
  }

  private clearRuntime(): void {
    this.sparkles?.dispose();
    this.glowPoints?.dispose();
    this.sparkles = null;
    this.glowPoints = null;
    this.group.clear();
  }
}

function sameConfiguration(
  current: RenderedEffectsConfiguration | null,
  next: RenderedEffectsConfiguration,
): boolean {
  return current !== null
    && current.backgroundMode === next.backgroundMode
    && current.state.sparkles === next.state.sparkles
    && current.state.glowPoints === next.state.glowPoints
    && current.state.uplight === next.state.uplight
    && current.bounds.equals(next.bounds);
}

export {bouquetEffectLoopPhase} from './bouquet-effect-phase';
export {sparkleBrightness} from './bouquet-effect-particles';
