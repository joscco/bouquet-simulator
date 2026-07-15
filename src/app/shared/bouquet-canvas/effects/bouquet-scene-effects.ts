import {
  AdditiveBlending,
  Box3,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  Group,
  Material,
  Mesh,
  Object3D,
  PointLight,
  Points,
  PointsMaterial,
  SpotLight,
  Vector3,
} from 'three';
import {
  BouquetBackgroundMode,
  BouquetSceneEffects as BouquetSceneEffectState,
} from '../../../core/models/flower.models';
import {normalizedBouquetSceneEffects} from '../../../core/data/bouquet-scene';

const EFFECT_LOOP_SECONDS = 6;
const FULL_CIRCLE = Math.PI * 2;
const DEFAULT_EFFECT_BOUNDS = new Box3(
  new Vector3(-80, -180, -80),
  new Vector3(80, 120, 80),
);
const WARM_LIGHT_COLORS = ['#fff8e7', '#ffefcc', '#fffdf7'] as const;

interface ParticleStyle {
  count: number;
  seed: number;
  radiusFactor: number;
  darkSize: number;
  lightSize: number;
  focused: boolean;
}

const SPARKLE_STYLE: ParticleStyle = {
  count: 58,
  seed: 0x8ab4dc,
  radiusFactor: 0.54,
  darkSize: 7.5,
  lightSize: 6.5,
  focused: false,
};
const GLOW_POINT_STYLE: ParticleStyle = {
  count: 5,
  seed: 0x3f71a9,
  radiusFactor: 0.32,
  darkSize: 10.5,
  lightSize: 8.5,
  focused: true,
};
const PARTICLE_DISTRIBUTION = {
  minimumRadius: 70,
  regularRadiusStart: 0.28,
  regularRadiusRange: 0.72,
  focusedRadiusStart: 0.18,
  focusedRadiusRange: 0.28,
  regularHeightStart: 0.08,
  regularHeightRange: 0.88,
  focusedHeightStart: 0.12,
  focusedHeightRange: 0.76,
  focusedHeightJitter: 0.6,
} as const;
const PARTICLE_MOTION = {x: 1.6, y: 2.4, z: 1.2, verticalFrequency: 2} as const;
const PARTICLE_MATERIAL = {opacity: 0.9, alphaTest: 0.025} as const;
const SPARKLE_BRIGHTNESS = {exponent: 6, peak: 1.45} as const;
const GLOW_LIGHT = {
  color: '#fff0d2',
  minimumDistance: 160,
  distanceFactor: 0.85,
  darkPeakIntensity: 3200,
  lightPeakIntensity: 1600,
  decay: 2,
} as const;
const UPLIGHT = {
  color: '#ffe2bd',
  darkIntensityAtReferenceHeight: 18000,
  lightIntensityAtReferenceHeight: 9000,
  referenceHeight: 360,
  minimumIntensityScale: 0.75,
  maximumIntensityScale: 2.2,
  minimumBouquetHeight: 120,
  minimumGroundRadius: 52,
  groundRadiusFactor: 0.32,
  groundHeightOffset: 2,
  minimumDistance: 260,
  distanceFactor: 1.45,
  coneAngle: Math.PI * 0.18,
  penumbra: 0.72,
  decay: 2,
  startAngle: -Math.PI / 2,
  targetHeightRatios: [0.58, 0.76, 0.92],
} as const;
const PARTICLE_TEXTURE = {size: 64, outerRadius: 30, innerRadius: 6} as const;

export class BouquetSceneEffects {
  readonly group = new Group();

  private state = normalizedBouquetSceneEffects(undefined);
  private backgroundMode: BouquetBackgroundMode = 'light';
  private bounds = DEFAULT_EFFECT_BOUNDS.clone();
  private signature = '';
  private sparkles: Points | null = null;
  private glowPoints: Points | null = null;
  private glowPointLights: PointLight[] = [];

  get animated(): boolean {
    return this.state.sparkles || this.state.glowPoints;
  }

  configure(state: BouquetSceneEffectState | undefined, backgroundMode: BouquetBackgroundMode): void {
    this.state = normalizedBouquetSceneEffects(state);
    this.backgroundMode = backgroundMode;
    this.rebuildIfNeeded();
  }

  setBounds(bounds: Box3): void {
    if (bounds.isEmpty()) return;
    this.bounds.copy(bounds);
    this.signature = '';
    this.rebuildIfNeeded();
  }

  update(timeSeconds: number): void {
    const loopPhase = bouquetEffectLoopPhase(timeSeconds);
    if (this.sparkles) animateSparkles(this.sparkles, loopPhase);
    if (this.glowPoints) {
      animateSparkles(this.glowPoints, loopPhase);
      animateGlowPointLights(this.glowPoints, this.glowPointLights, loopPhase);
    }
  }

  dispose(): void {
    disposeObject(this.group);
    this.group.clear();
    this.sparkles = null;
    this.glowPoints = null;
    this.glowPointLights = [];
  }

  private rebuildIfNeeded(): void {
    const min = this.bounds.min;
    const max = this.bounds.max;
    const signature = [
      this.state.sparkles,
      this.state.glowPoints,
      this.state.uplight,
      this.backgroundMode,
      min.x,
      min.y,
      min.z,
      max.x,
      max.y,
      max.z,
    ].join('|');
    if (signature === this.signature) return;
    this.signature = signature;
    this.dispose();

    if (this.state.sparkles) {
      this.sparkles = this.createLightPoints(SPARKLE_STYLE);
      this.group.add(this.sparkles);
    }
    if (this.state.glowPoints) {
      this.glowPoints = this.createLightPoints(GLOW_POINT_STYLE);
      this.glowPointLights = createGlowPointLights(this.glowPoints, this.bounds, this.backgroundMode);
      this.group.add(this.glowPoints, ...this.glowPointLights);
    }
    if (this.state.uplight) {
      this.group.add(...createUplights(this.bounds, this.backgroundMode));
    }
    this.update(0);
  }

  private createLightPoints(style: ParticleStyle): Points {
    const positions = particlePositions(this.bounds, style);
    const colors = new Float32Array(style.count * 3);
    const palette = WARM_LIGHT_COLORS.map((color) => new Color(color));
    for (let index = 0; index < style.count; index += 1) {
      const color = palette[index % palette.length]!;
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions.current, 3));
    geometry.setAttribute('color', new BufferAttribute(colors, 3));
    const points = new Points(geometry, new PointsMaterial({
      size: this.backgroundMode === 'dark' ? style.darkSize : style.lightSize,
      vertexColors: true,
      transparent: true,
      opacity: PARTICLE_MATERIAL.opacity,
      depthWrite: false,
      blending: AdditiveBlending,
      sizeAttenuation: true,
      map: createParticleTexture() ?? undefined,
      alphaTest: PARTICLE_MATERIAL.alphaTest,
    }));
    points.userData['basePositions'] = positions.base;
    points.userData['phases'] = positions.phases;
    points.userData['baseColors'] = colors.slice();
    return points;
  }
}

export function bouquetEffectLoopPhase(timeSeconds: number): number {
  return (timeSeconds % EFFECT_LOOP_SECONDS) / EFFECT_LOOP_SECONDS * FULL_CIRCLE;
}

function particlePositions(
  bounds: Box3,
  style: ParticleStyle,
): {current: Float32Array; base: Float32Array; phases: Float32Array} {
  const center = bounds.getCenter(new Vector3());
  const size = bounds.getSize(new Vector3());
  const radialExtent = Math.max(
    PARTICLE_DISTRIBUTION.minimumRadius,
    Math.max(size.x, size.z) * style.radiusFactor,
  );
  const current = new Float32Array(style.count * 3);
  const base = new Float32Array(style.count * 3);
  const phases = new Float32Array(style.count);
  const random = mulberry32(style.seed);

  for (let index = 0; index < style.count; index += 1) {
    const angle = random() * FULL_CIRCLE;
    const radius = radialExtent * (style.focused
      ? PARTICLE_DISTRIBUTION.focusedRadiusStart + random() * PARTICLE_DISTRIBUTION.focusedRadiusRange
      : PARTICLE_DISTRIBUTION.regularRadiusStart + random() * PARTICLE_DISTRIBUTION.regularRadiusRange);
    const offset = index * 3;
    base[offset] = center.x + Math.cos(angle) * radius;
    base[offset + 1] = style.focused
      ? bounds.min.y + size.y * (
        PARTICLE_DISTRIBUTION.focusedHeightStart
        + (index + random() * PARTICLE_DISTRIBUTION.focusedHeightJitter)
        / style.count * PARTICLE_DISTRIBUTION.focusedHeightRange
      )
      : bounds.min.y + size.y * (
        PARTICLE_DISTRIBUTION.regularHeightStart
        + random() * PARTICLE_DISTRIBUTION.regularHeightRange
      );
    base[offset + 2] = center.z + Math.sin(angle) * radius;
    current[offset] = base[offset]!;
    current[offset + 1] = base[offset + 1]!;
    current[offset + 2] = base[offset + 2]!;
    phases[index] = random() * FULL_CIRCLE;
  }
  return {current, base, phases};
}

function animateSparkles(points: Points, loopPhase: number): void {
  const positions = points.geometry.getAttribute('position') as BufferAttribute;
  const base = points.userData['basePositions'] as Float32Array;
  const colors = points.geometry.getAttribute('color') as BufferAttribute;
  const baseColors = points.userData['baseColors'] as Float32Array;
  const phases = points.userData['phases'] as Float32Array;
  for (let index = 0; index < phases.length; index += 1) {
    const phase = phases[index]!;
    positions.setXYZ(
      index,
      base[index * 3]! + Math.sin(loopPhase + phase) * PARTICLE_MOTION.x,
      base[index * 3 + 1]! + Math.sin(
        loopPhase * PARTICLE_MOTION.verticalFrequency + phase,
      ) * PARTICLE_MOTION.y,
      base[index * 3 + 2]! + Math.cos(loopPhase + phase) * PARTICLE_MOTION.z,
    );
    const localPhase = (loopPhase + phases[index]!) % FULL_CIRCLE;
    const brightness = sparkleBrightness(localPhase);
    colors.setXYZ(
      index,
      baseColors[index * 3]! * brightness,
      baseColors[index * 3 + 1]! * brightness,
      baseColors[index * 3 + 2]! * brightness,
    );
  }
  positions.needsUpdate = true;
  colors.needsUpdate = true;
}

function createGlowPointLights(
  points: Points,
  bounds: Box3,
  backgroundMode: BouquetBackgroundMode,
): PointLight[] {
  const size = bounds.getSize(new Vector3());
  const distance = Math.max(
    GLOW_LIGHT.minimumDistance,
    Math.max(size.x, size.y, size.z) * GLOW_LIGHT.distanceFactor,
  );
  const positions = points.geometry.getAttribute('position') as BufferAttribute;
  return Array.from({length: GLOW_POINT_STYLE.count}, (_, particleIndex) => {
    const light = new PointLight(GLOW_LIGHT.color, 0, distance, GLOW_LIGHT.decay);
    light.position.set(
      positions.getX(particleIndex),
      positions.getY(particleIndex),
      positions.getZ(particleIndex),
    );
    light.userData['particleIndex'] = particleIndex;
    light.userData['peakIntensity'] = backgroundMode === 'dark'
      ? GLOW_LIGHT.darkPeakIntensity
      : GLOW_LIGHT.lightPeakIntensity;
    return light;
  });
}

function createUplights(
  bounds: Box3,
  backgroundMode: BouquetBackgroundMode,
): Object3D[] {
  const center = bounds.getCenter(new Vector3());
  const size = bounds.getSize(new Vector3());
  const height = Math.max(UPLIGHT.minimumBouquetHeight, size.y);
  const groundRadius = Math.max(
    UPLIGHT.minimumGroundRadius,
    Math.max(size.x, size.z) * UPLIGHT.groundRadiusFactor,
  );
  const distance = Math.max(UPLIGHT.minimumDistance, height * UPLIGHT.distanceFactor);
  const linearIntensityScale = Math.max(
    UPLIGHT.minimumIntensityScale,
    Math.min(UPLIGHT.maximumIntensityScale, height / UPLIGHT.referenceHeight),
  );
  const referenceIntensity = backgroundMode === 'dark'
    ? UPLIGHT.darkIntensityAtReferenceHeight
    : UPLIGHT.lightIntensityAtReferenceHeight;
  const intensity = referenceIntensity * linearIntensityScale ** 2;

  return UPLIGHT.targetHeightRatios.flatMap((targetHeightRatio, index) => {
    const angle = UPLIGHT.startAngle
      + index / UPLIGHT.targetHeightRatios.length * FULL_CIRCLE;
    const target = new Object3D();
    target.position.set(center.x, bounds.min.y + height * targetHeightRatio, center.z);
    const light = new SpotLight(
      UPLIGHT.color,
      intensity,
      distance,
      UPLIGHT.coneAngle,
      UPLIGHT.penumbra,
      UPLIGHT.decay,
    );
    light.position.set(
      center.x + Math.cos(angle) * groundRadius,
      bounds.min.y + UPLIGHT.groundHeightOffset,
      center.z + Math.sin(angle) * groundRadius,
    );
    light.target = target;
    return [light, target];
  });
}

function animateGlowPointLights(points: Points, lights: PointLight[], loopPhase: number): void {
  const positions = points.geometry.getAttribute('position') as BufferAttribute;
  const phases = points.userData['phases'] as Float32Array;
  for (const light of lights) {
    const particleIndex = light.userData['particleIndex'] as number;
    light.position.set(
      positions.getX(particleIndex),
      positions.getY(particleIndex),
      positions.getZ(particleIndex),
    );
    const localPhase = (loopPhase + phases[particleIndex]!) % FULL_CIRCLE;
    light.intensity = sparkleBrightness(localPhase) * (light.userData['peakIntensity'] as number);
  }
}

export function sparkleBrightness(localPhase: number): number {
  return Math.pow(
    Math.sin(localPhase / 2),
    SPARKLE_BRIGHTNESS.exponent,
  ) * SPARKLE_BRIGHTNESS.peak;
}

function disposeObject(object: Object3D): void {
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  object.traverse((child) => {
    if (child instanceof Mesh || child instanceof Points) {
      geometries.add(child.geometry);
      const childMaterials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of childMaterials) materials.add(material);
    }
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) {
    if (material instanceof PointsMaterial) material.map?.dispose();
    material.dispose();
  }
}

function createParticleTexture(): CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = PARTICLE_TEXTURE.size;
  canvas.height = PARTICLE_TEXTURE.size;
  const context = canvas.getContext('2d');
  if (!context) return null;

  const center = PARTICLE_TEXTURE.size / 2;
  const outer = PARTICLE_TEXTURE.outerRadius;
  const inner = PARTICLE_TEXTURE.innerRadius;
  context.translate(center, center);
  context.fillStyle = '#ffffff';
  context.beginPath();
  context.moveTo(0, -outer);
  context.lineTo(inner, -inner);
  context.lineTo(outer, 0);
  context.lineTo(inner, inner);
  context.lineTo(0, outer);
  context.lineTo(-inner, inner);
  context.lineTo(-outer, 0);
  context.lineTo(-inner, -inner);
  context.closePath();
  context.fill();

  return new CanvasTexture(canvas);
}

function mulberry32(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ result >>> 15, result | 1);
    result ^= result + Math.imul(result ^ result >>> 7, result | 61);
    return ((result ^ result >>> 14) >>> 0) / 4294967296;
  };
}
