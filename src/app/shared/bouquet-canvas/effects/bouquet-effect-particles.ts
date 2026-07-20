import {
  AdditiveBlending,
  Box3,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  Object3D,
  PointLight,
  Points,
  PointsMaterial,
  Vector3,
} from 'three';
import {BouquetBackgroundMode} from '../../../core/models/flower.models';
import {mulberry32} from '../../../core/utils/random';

const FULL_CIRCLE = Math.PI * 2;
const WARM_LIGHT_COLORS = ['#fff8e7', '#ffefcc', '#fffdf7'] as const;
const NIGHT_SPARKLE_COLORS = ['#fff4bd', '#ffd37d', '#cadcff', '#d8b4fe'] as const;

type ParticleEffectKind = 'sparkles' | 'glowPoints';

interface ParticleStyle {
  count: number;
  seed: number;
  radiusFactor: number;
  darkSize: number;
  lightSize: number;
  focused: boolean;
}

interface ParticlePositions {
  current: Float32Array;
  base: Float32Array;
  phases: Float32Array;
}

interface GlowLightRuntime {
  light: PointLight;
  particleIndex: number;
  peakIntensity: number;
}

const PARTICLE_STYLES: Record<ParticleEffectKind, ParticleStyle> = {
  sparkles: {
    count: 64,
    seed: 0x8ab4dc,
    radiusFactor: 0.56,
    darkSize: 8.5,
    lightSize: 7,
    focused: false,
  },
  glowPoints: {
    count: 5,
    seed: 0x3f71a9,
    radiusFactor: 0.32,
    darkSize: 10.5,
    lightSize: 8.5,
    focused: true,
  },
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
const PARTICLE_MATERIAL = {opacity: 0.95, alphaTest: 0.025} as const;
const SPARKLE_BRIGHTNESS = {exponent: 6, peak: 2.25} as const;
const GLOW_POINT_BRIGHTNESS = {minimum: 0.72, pulse: 0.22} as const;
const GLOW_LIGHT = {
  color: '#fff0d2',
  minimumDistance: 160,
  distanceFactor: 0.85,
  darkPeakIntensity: 3200,
  lightPeakIntensity: 1600,
  decay: 2,
} as const;
const PARTICLE_TEXTURE = {size: 64, outerRadius: 30, innerRadius: 6} as const;

export interface BouquetParticleRuntime {
  readonly objects: readonly Object3D[];
  updatePhase(normalizedPhase: number): void;
  dispose(): void;
}

class ThreeBouquetParticleRuntime implements BouquetParticleRuntime {
  readonly objects: readonly Object3D[];

  private disposed = false;

  constructor(
    private readonly kind: ParticleEffectKind,
    private readonly points: Points<BufferGeometry, PointsMaterial>,
    private readonly positionAttribute: BufferAttribute,
    private readonly colorAttribute: BufferAttribute,
    private readonly basePositions: Float32Array,
    private readonly baseColors: Float32Array,
    private readonly phases: Float32Array,
    private readonly glowLights: readonly GlowLightRuntime[],
  ) {
    this.objects = [points, ...glowLights.map(({light}) => light)];
  }

  updatePhase(normalizedPhase: number): void {
    if (this.disposed) return;
    const loopPhase = normalizedPhase * FULL_CIRCLE;
    for (let index = 0; index < this.phases.length; index += 1) {
      const particlePhase = this.phases[index]!;
      this.positionAttribute.setXYZ(
        index,
        this.basePositions[index * 3]! + Math.sin(loopPhase + particlePhase) * PARTICLE_MOTION.x,
        this.basePositions[index * 3 + 1]! + Math.sin(
          loopPhase * PARTICLE_MOTION.verticalFrequency + particlePhase,
        ) * PARTICLE_MOTION.y,
        this.basePositions[index * 3 + 2]! + Math.cos(loopPhase + particlePhase) * PARTICLE_MOTION.z,
      );
      const localPhase = (loopPhase + particlePhase) % FULL_CIRCLE;
      const brightness = this.kind === 'sparkles'
        ? sparkleBrightness(localPhase)
        : glowPointBrightness(localPhase);
      this.colorAttribute.setXYZ(
        index,
        this.baseColors[index * 3]! * brightness,
        this.baseColors[index * 3 + 1]! * brightness,
        this.baseColors[index * 3 + 2]! * brightness,
      );
    }
    this.positionAttribute.needsUpdate = true;
    this.colorAttribute.needsUpdate = true;
    this.updateGlowLights(loopPhase);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.points.geometry.dispose();
    this.points.material.map?.dispose();
    this.points.material.dispose();
  }

  private updateGlowLights(loopPhase: number): void {
    for (const runtime of this.glowLights) {
      const {light, particleIndex, peakIntensity} = runtime;
      light.position.set(
        this.positionAttribute.getX(particleIndex),
        this.positionAttribute.getY(particleIndex),
        this.positionAttribute.getZ(particleIndex),
      );
      const localPhase = (loopPhase + this.phases[particleIndex]!) % FULL_CIRCLE;
      light.intensity = glowPointBrightness(localPhase) * peakIntensity;
    }
  }
}

export function createBouquetParticleRuntime(
  kind: ParticleEffectKind,
  bounds: Box3,
  backgroundMode: BouquetBackgroundMode,
): BouquetParticleRuntime {
  const style = PARTICLE_STYLES[kind];
  const positions = particlePositions(bounds, style);
  const colors = particleColors(style.count, kind, backgroundMode);
  const geometry = new BufferGeometry();
  const positionAttribute = new BufferAttribute(positions.current, 3);
  const colorAttribute = new BufferAttribute(colors, 3);
  geometry.setAttribute('position', positionAttribute);
  geometry.setAttribute('color', colorAttribute);
  const material = new PointsMaterial({
    size: backgroundMode === 'dark' ? style.darkSize : style.lightSize,
    vertexColors: true,
    transparent: true,
    opacity: PARTICLE_MATERIAL.opacity,
    depthWrite: false,
    blending: AdditiveBlending,
    sizeAttenuation: true,
    map: createParticleTexture(kind) ?? undefined,
    alphaTest: PARTICLE_MATERIAL.alphaTest,
  });
  const points = new Points(geometry, material);
  const glowLights = kind === 'glowPoints'
    ? createGlowPointLights(style.count, positionAttribute, bounds, backgroundMode)
    : [];
  return new ThreeBouquetParticleRuntime(
    kind,
    points,
    positionAttribute,
    colorAttribute,
    positions.base,
    colors.slice(),
    positions.phases,
    glowLights,
  );
}

export function sparkleBrightness(localPhase: number): number {
  return Math.pow(
    Math.sin(localPhase / 2),
    SPARKLE_BRIGHTNESS.exponent,
  ) * SPARKLE_BRIGHTNESS.peak;
}

export function glowPointBrightness(localPhase: number): number {
  return GLOW_POINT_BRIGHTNESS.minimum
    + (Math.sin(localPhase) + 1) / 2 * GLOW_POINT_BRIGHTNESS.pulse;
}

function particlePositions(bounds: Box3, style: ParticleStyle): ParticlePositions {
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

function particleColors(
  count: number,
  kind: ParticleEffectKind,
  backgroundMode: BouquetBackgroundMode,
): Float32Array {
  const colors = new Float32Array(count * 3);
  const source = kind === 'sparkles' && backgroundMode === 'dark'
    ? NIGHT_SPARKLE_COLORS
    : WARM_LIGHT_COLORS;
  const palette = source.map((color) => new Color(color));
  for (let index = 0; index < count; index += 1) {
    const color = palette[index % palette.length]!;
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
  }
  return colors;
}

function createGlowPointLights(
  count: number,
  positions: BufferAttribute,
  bounds: Box3,
  backgroundMode: BouquetBackgroundMode,
): GlowLightRuntime[] {
  const size = bounds.getSize(new Vector3());
  const distance = Math.max(
    GLOW_LIGHT.minimumDistance,
    Math.max(size.x, size.y, size.z) * GLOW_LIGHT.distanceFactor,
  );
  const peakIntensity = backgroundMode === 'dark'
    ? GLOW_LIGHT.darkPeakIntensity
    : GLOW_LIGHT.lightPeakIntensity;
  return Array.from({length: count}, (_, particleIndex) => {
    const light = new PointLight(GLOW_LIGHT.color, 0, distance, GLOW_LIGHT.decay);
    light.position.set(
      positions.getX(particleIndex),
      positions.getY(particleIndex),
      positions.getZ(particleIndex),
    );
    return {light, particleIndex, peakIntensity};
  });
}

function createParticleTexture(kind: ParticleEffectKind): CanvasTexture | null {
  if (typeof document === 'undefined' || typeof CanvasRenderingContext2D === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = PARTICLE_TEXTURE.size;
  canvas.height = PARTICLE_TEXTURE.size;
  const context = canvas.getContext('2d');
  if (!context) return null;

  const center = PARTICLE_TEXTURE.size / 2;
  const outer = PARTICLE_TEXTURE.outerRadius;
  if (kind === 'glowPoints') {
    const glow = context.createRadialGradient(center, center, 0, center, center, outer);
    glow.addColorStop(0, 'rgba(255, 255, 255, 1)');
    glow.addColorStop(0.24, 'rgba(255, 255, 255, 0.92)');
    glow.addColorStop(0.58, 'rgba(255, 255, 255, 0.32)');
    glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
    context.fillStyle = glow;
    context.fillRect(0, 0, canvas.width, canvas.height);
    return new CanvasTexture(canvas);
  }
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
