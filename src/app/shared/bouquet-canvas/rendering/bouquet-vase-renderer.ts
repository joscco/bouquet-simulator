import {
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  CylinderGeometry,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  LatheGeometry,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  RepeatWrapping,
  SRGBColorSpace,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three';
import {
  DEFAULT_VASE_ID,
  VaseMaterialId,
} from '../../../core/data/vases';

interface VaseRenderDefinition {
  profile: Array<[number, number]>;
  rimRadius: number;
  rimTube: number;
  openingRadius: number;
  openingY: number;
  radialSegments?: number;
  radialRibs?: {
    count: number;
    depth: number;
  };
  flatShading?: boolean;
  surfaceTexture?: 'hammered';
  surfaceBumpScale?: number;
  rings?: Array<{
    radius: number;
    y: number;
    tube: number;
  }>;
  handles?: Array<{
    tube: number;
    points: Array<[number, number]>;
  }>;
}

interface VaseMaterialDefinition {
  bodyColor: number;
  openingColor: number;
  rimColor: number;
  roughness: number;
  metalness: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  transmission?: number;
  thickness?: number;
  opacity?: number;
  texture?: 'speckled' | 'grainy';
}

const PEBBLE_COLOR = 0x7b5136;

const VASE_MATERIAL_DEFINITIONS: Record<VaseMaterialId, VaseMaterialDefinition> = {
  clay: {
    bodyColor: 0xb96f4d,
    openingColor: PEBBLE_COLOR,
    rimColor: 0xd08a65,
    roughness: 0.86,
    metalness: 0,
  },
  stoneware: {
    bodyColor: 0xc9d2c9,
    openingColor: PEBBLE_COLOR,
    rimColor: 0xe8ede6,
    roughness: 0.24,
    metalness: 0.02,
    clearcoat: 0.58,
    clearcoatRoughness: 0.2,
    texture: 'speckled',
  },
  concrete: {
    bodyColor: 0x96958f,
    openingColor: PEBBLE_COLOR,
    rimColor: 0xb8b7b1,
    roughness: 0.96,
    metalness: 0,
    texture: 'grainy',
  },
  glass: {
    bodyColor: 0xd8eef2,
    openingColor: 0x56777b,
    rimColor: 0xeffcfc,
    roughness: 0.06,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    transmission: 0.94,
    thickness: 5,
    opacity: 0.46,
  },
};

const VASE_RENDER_DEFINITIONS: Record<string, VaseRenderDefinition> = {
  classic: {
    profile: [
      [0, -62], [24, -62], [38, -60], [48, -54], [54, -44], [57, -30],
      [56, -14], [52, 0], [47, 11], [44, 18], [41, 21],
    ],
    openingRadius: 41,
    openingY: 20,
    rimRadius: 42,
    rimTube: 2.6,
    rings: [
      {radius: 41, y: -60, tube: 2.4},
      {radius: 50, y: -3, tube: 1.3},
    ],
  },
  tulip: {
    profile: [
      [0, -63], [19, -63], [28, -60], [33, -52], [35, -42], [35, -30],
      [37, -18], [42, -6], [50, 8], [59, 20], [66, 27],
    ],
    openingRadius: 61.5,
    openingY: 26,
    rimRadius: 63,
    rimTube: 2.4,
    rings: [{radius: 30, y: -60, tube: 2}],
  },
  cylinder: {
    profile: [
      [0, -64], [31, -64], [37, -62], [40, -57], [40, -34], [39, -10],
      [40, 12], [39, 23], [36, 28],
    ],
    openingRadius: 36,
    openingY: 27,
    rimRadius: 37,
    rimTube: 2,
    rings: [
      {radius: 37, y: -62, tube: 2},
      {radius: 40, y: -43, tube: 0.7},
      {radius: 40, y: 6, tube: 0.7},
    ],
  },
  bowl: {
    profile: [
      [0, -50], [32, -50], [49, -47], [61, -40], [69, -29], [73, -16],
      [71, -4], [64, 7], [53, 15], [43, 19],
    ],
    openingRadius: 42,
    openingY: 18,
    rimRadius: 45,
    rimTube: 3.2,
    rings: [
      {radius: 49, y: -48, tube: 2.2},
      {radius: 69, y: -5, tube: 1.1},
    ],
  },
  bud: {
    profile: [
      [0, -68], [12, -68], [19, -65], [25, -57], [28, -46], [27, -31],
      [24, -14], [19, 3], [17, 18], [19, 29], [22, 34],
    ],
    openingRadius: 19,
    openingY: 33,
    rimRadius: 20,
    rimTube: 2,
    rings: [
      {radius: 19, y: -66, tube: 1.8},
      {radius: 25, y: -42, tube: 0.9},
      {radius: 17, y: 17, tube: 0.9},
    ],
  },
  bottle: {
    profile: [
      [0, -68], [24, -68], [34, -65], [40, -57], [42, -43], [41, -25],
      [37, -10], [27, 2], [19, 8], [17, 19], [18, 34],
    ],
    openingRadius: 17,
    openingY: 33,
    rimRadius: 18,
    rimTube: 2,
    rings: [
      {radius: 30, y: -66, tube: 1.8},
      {radius: 17, y: 20, tube: 1.0},
    ],
  },
  amphora: {
    profile: [
      [0, -64], [19, -64], [26, -61], [29, -56], [30, -50], [40, -46],
      [51, -35], [55, -20], [52, -5], [43, 8], [31, 15], [25, 21], [26, 30],
    ],
    openingRadius: 23,
    openingY: 29,
    rimRadius: 25,
    rimTube: 2.4,
    rings: [
      {radius: 25, y: -62, tube: 2.2},
      {radius: 32, y: 14, tube: 1},
    ],
    handles: [
      {tube: 2.2, points: [[-25, 19], [-38, 22], [-45, 20], [-50, 14], [-50, 8], [-45, 3]]},
      {tube: 2.2, points: [[25, 19], [38, 22], [45, 20], [50, 14], [50, 8], [45, 3]]},
    ],
  },
  ribbed: {
    profile: [
      [0, -61], [28, -61], [39, -58], [46, -50], [49, -38], [49, -20],
      [47, -4], [42, 9], [37, 18], [36, 25],
    ],
    openingRadius: 34,
    openingY: 24,
    rimRadius: 36,
    rimTube: 2.3,
    radialSegments: 144,
    radialRibs: {count: 18, depth: 0.055},
    rings: [
      {radius: 38, y: -59, tube: 2},
    ],
  },
  faceted: {
    profile: [
      [0, -65], [26, -65], [39, -59], [46, -45], [48, -23], [45, -3],
      [37, 13], [34, 25],
    ],
    openingRadius: 31,
    openingY: 24,
    rimRadius: 33,
    rimTube: 2,
    radialSegments: 8,
    flatShading: true,
    surfaceTexture: 'hammered',
    surfaceBumpScale: 0.7,
    rings: [{radius: 34, y: -63, tube: 1.6}],
  },
};

export function clipVaseStemEnd(
  vaseId: string,
  start: Vector3,
  downwardDirection: Vector3,
  stemRadius: number,
): Vector3 {
  const definition = vaseDefinition(vaseId);
  const direction = downwardDirection.clone().normalize();
  if (direction.y > -0.02) direction.y = -0.02;
  direction.normalize();

  let inside = start.clone();
  for (let distance = 0.75; distance <= 180; distance += 0.75) {
    const candidate = start.clone().addScaledVector(direction, distance);
    if (pointInsideVase(definition, candidate, stemRadius)) {
      inside = candidate;
      continue;
    }
    let outside = candidate;
    for (let iteration = 0; iteration < 8; iteration++) {
      const midpoint = inside.clone().lerp(outside, 0.5);
      if (pointInsideVase(definition, midpoint, stemRadius)) inside = midpoint;
      else outside = midpoint;
    }
    return inside;
  }
  return inside;
}

function pointInsideVase(
  definition: VaseRenderDefinition,
  point: Vector3,
  stemRadius: number,
): boolean {
  const floorY = definition.profile[0]![1] + 2.5 + stemRadius;
  if (point.y <= floorY || point.y >= definition.openingY + 0.5) return false;
  const wallClearance = 1.5 + stemRadius;
  return Math.hypot(point.x, point.z) <= Math.max(0, vaseRadiusAt(definition, point.y) - wallClearance);
}

function vaseRadiusAt(definition: VaseRenderDefinition, y: number): number {
  const surfaceProfile = definition.profile.slice(1);
  if (y >= definition.openingY) return definition.openingRadius;
  if (y <= surfaceProfile[0]![1]) return surfaceProfile[0]![0];
  for (let index = 1; index < surfaceProfile.length; index++) {
    const lower = surfaceProfile[index - 1]!;
    const upper = surfaceProfile[index]!;
    if (y > upper[1]) continue;
    const span = Math.max(0.001, upper[1] - lower[1]);
    const progress = (y - lower[1]) / span;
    return lower[0] + (upper[0] - lower[0]) * progress;
  }
  return definition.openingRadius;
}

function vaseDefinition(vaseId: string): VaseRenderDefinition {
  return VASE_RENDER_DEFINITIONS[vaseId] ?? VASE_RENDER_DEFINITIONS[DEFAULT_VASE_ID]!;
}

export function createBouquetVase(vaseId: string, materialId: VaseMaterialId): Group {
  const definition = vaseDefinition(vaseId);
  const surface = VASE_MATERIAL_DEFINITIONS[materialId];
  const glass = materialId === 'glass';
  const vase = new Group();
  const bodyTexture = createVaseSurfaceTexture(
    surface.texture,
    definition.surfaceTexture,
    definition.profile,
  );
  const radialSegments = definition.radialSegments ?? 144;
  const bodyGeometry = createVaseBodyGeometry(definition);
  const body = new Mesh(
    bodyGeometry,
    new MeshPhysicalMaterial({
      color: surface.bodyColor,
      roughness: surface.roughness,
      metalness: surface.metalness,
      clearcoat: surface.clearcoat ?? 0,
      clearcoatRoughness: surface.clearcoatRoughness ?? 0,
      transmission: surface.transmission ?? 0,
      thickness: surface.thickness ?? 0,
      transparent: glass,
      opacity: surface.opacity ?? 1,
      depthWrite: !glass,
      side: glass ? DoubleSide : undefined,
      map: bodyTexture,
      bumpMap: bodyTexture,
      bumpScale: definition.surfaceBumpScale
        ?? (surface.texture === 'grainy' ? 0.9 : surface.texture === 'speckled' ? 0.25 : 0),
      flatShading: definition.flatShading ?? false,
    }),
  );
  body.renderOrder = glass ? 2 : 0;

  const opening = new Mesh(
    new CylinderGeometry(definition.openingRadius, definition.openingRadius, 2.8, radialSegments),
    new MeshPhysicalMaterial({
      color: surface.openingColor,
      roughness: glass ? 0.12 : Math.max(0.5, surface.roughness),
      metalness: surface.metalness,
      transmission: glass ? 0.72 : 0,
      thickness: glass ? 1.5 : 0,
      transparent: glass,
      opacity: glass ? 0.22 : 1,
      depthWrite: !glass,
    }),
  );
  opening.position.y = definition.openingY - (glass ? 0 : 1.8);
  opening.renderOrder = glass ? 1 : 0;

  const rim = createVaseRing(
    definition.rimRadius,
    definition.rimTube,
    definition.openingY + 1,
    surface,
    glass,
    glass ? 0.68 : 1,
    18,
    glass ? 0.04 : Math.max(0.16, surface.roughness - 0.12),
    glass ? Math.max(2, surface.thickness ?? 0) : 0,
    radialSegments,
  );
  vase.add(body, opening, rim);
  if (!glass) vase.add(createVasePebbles(definition.openingRadius, definition.openingY));

  if (!glass) {
    for (const ring of definition.rings ?? []) {
      vase.add(createVaseRing(
        ring.radius,
        ring.tube,
        ring.y,
        surface,
        false,
        1,
        12,
        surface.roughness,
        0,
        radialSegments,
      ));
    }
  }
  for (const handle of definition.handles ?? []) {
    const handleMesh = createVaseHandle(handle, body.material, glass);
    vase.add(handleMesh);
  }
  vase.traverse((object) => {
    if (object instanceof Mesh) {
      object.castShadow = !glass;
      object.receiveShadow = !glass;
    }
  });
  return vase;
}

function createVaseRing(
  radius: number,
  tube: number,
  y: number,
  surface: VaseMaterialDefinition,
  glass: boolean,
  opacity: number,
  radialSegments: number,
  roughness: number,
  thickness: number,
  tubularSegments = 144,
): Mesh {
  const ring = new Mesh(
    new TorusGeometry(radius, tube, radialSegments, tubularSegments),
    new MeshPhysicalMaterial({
      color: surface.rimColor,
      roughness,
      metalness: surface.metalness,
      clearcoat: surface.clearcoat ?? 0,
      transmission: surface.transmission ?? 0,
      thickness,
      transparent: glass,
      opacity,
      depthWrite: !glass,
    }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = y;
  ring.renderOrder = glass ? 3 : 0;
  return ring;
}

function createVaseHandle(
  definition: NonNullable<VaseRenderDefinition['handles']>[number],
  bodyMaterial: MeshPhysicalMaterial,
  glass: boolean,
): Mesh {
  const handle = new Mesh(
    new TubeGeometry(
      new CatmullRomCurve3(
        definition.points.map(([x, y]) => new Vector3(x, y, 0)),
        false,
        'centripetal',
        0.5,
      ),
      48,
      definition.tube,
      12,
      false,
    ),
    bodyMaterial.clone(),
  );
  handle.renderOrder = glass ? 2 : 0;
  return handle;
}

function createVaseBodyGeometry(definition: VaseRenderDefinition): BufferGeometry {
  let geometry: BufferGeometry = new LatheGeometry(
    smoothVaseProfile(definition.profile),
    definition.radialSegments ?? 144,
  );
  if (definition.radialRibs) {
    const positions = geometry.getAttribute('position');
    for (let index = 0; index < positions.count; index++) {
      const x = positions.getX(index);
      const z = positions.getZ(index);
      const radius = Math.hypot(x, z);
      if (radius < 0.001) continue;
      const angle = Math.atan2(z, x);
      const scale = 1 + Math.cos(angle * definition.radialRibs.count) * definition.radialRibs.depth;
      positions.setXYZ(index, x * scale, positions.getY(index), z * scale);
    }
    positions.needsUpdate = true;
  }
  if (definition.flatShading) geometry = geometry.toNonIndexed();
  geometry.computeVertexNormals();
  return geometry;
}

function createVasePebbles(openingRadius: number, openingY: number): InstancedMesh {
  const count = Math.max(50, Math.min(320, Math.round(openingRadius * openingRadius / 6)));
  const pebbles = new InstancedMesh(
    new IcosahedronGeometry(2.8, 1),
    new MeshStandardMaterial({color: PEBBLE_COLOR, roughness: 0.96, metalness: 0}),
    count,
  );
  const random = deterministicVaseRandom(Math.round(openingRadius * 1009));
  const transform = new Object3D();
  const maximumRadius = Math.max(0, openingRadius - 1.8);
  for (let index = 0; index < count; index++) {
    const angle = index * Math.PI * (3 - Math.sqrt(5));
    const radius = Math.sqrt((index + 0.5) / count) * maximumRadius;
    const scale = 0.72 + random() * 0.48;
    transform.position.set(
      Math.cos(angle) * radius,
      openingY - 1.2 + random() * 0.8,
      Math.sin(angle) * radius,
    );
    transform.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
    transform.scale.setScalar(scale);
    transform.updateMatrix();
    pebbles.setMatrixAt(index, transform.matrix);
  }
  pebbles.instanceMatrix.needsUpdate = true;
  pebbles.castShadow = true;
  pebbles.receiveShadow = true;
  return pebbles;
}

function smoothVaseProfile(profile: Array<[number, number]>): Vector2[] {
  const curve = new CatmullRomCurve3(
    profile.map(([x, y]) => new Vector3(x, y, 0)),
    false,
    'centripetal',
    0.45,
  );
  const points = curve.getPoints(Math.max(32, profile.length * 8))
    .map((point) => new Vector2(Math.max(0, point.x), point.y));
  const first = profile[0]!;
  const last = profile[profile.length - 1]!;
  points[0] = new Vector2(first[0], first[1]);
  points[points.length - 1] = new Vector2(last[0], last[1]);
  return points;
}

function createVaseSurfaceTexture(
  textureType: VaseMaterialDefinition['texture'],
  structureType: VaseRenderDefinition['surfaceTexture'],
  profile: VaseRenderDefinition['profile'],
): CanvasTexture | null {
  if ((!textureType && !structureType) || typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);

  const random = deterministicVaseRandom(textureType === 'speckled' ? 0x51a7 : 0xc0ac);
  if (structureType === 'hammered') {
    for (let index = 0; index < 90; index++) {
      const radius = 2.5 + random() * 5;
      const shade = 185 + Math.floor(random() * 50);
      context.fillStyle = `rgba(${shade},${shade},${shade},0.28)`;
      context.beginPath();
      context.arc(random() * canvas.width, random() * canvas.height, radius, 0, Math.PI * 2);
      context.fill();
    }
  }

  if (textureType) {
    const count = textureType === 'speckled' ? 210 : 1250;
    for (let index = 0; index < count; index++) {
      const alpha = textureType === 'speckled' ? 0.1 + random() * 0.22 : 0.025 + random() * 0.09;
      const shade = textureType === 'speckled'
        ? 45 + Math.floor(random() * 65)
        : 70 + Math.floor(random() * 120);
      const radius = textureType === 'speckled' ? 0.45 + random() * 1.35 : 0.25 + random() * 0.7;
      context.fillStyle = `rgba(${shade},${shade},${shade},${alpha})`;
      context.beginPath();
      context.arc(random() * canvas.width, random() * canvas.height, radius, 0, Math.PI * 2);
      context.fill();
    }
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  const repeat = vaseTextureRepeat(profile, textureType);
  texture.repeat.set(repeat.x, repeat.y);
  texture.anisotropy = 8;
  return texture;
}

function vaseTextureRepeat(
  profile: VaseRenderDefinition['profile'],
  textureType: VaseMaterialDefinition['texture'],
): {x: number; y: number} {
  const surfaceRadii = profile.slice(1).map(([radius]) => radius);
  const averageRadius = surfaceRadii.reduce((sum, radius) => sum + radius, 0)
    / Math.max(1, surfaceRadii.length);
  const height = Math.max(1, profile[profile.length - 1]![1] - profile[0]![1]);
  const tileSize = textureType === 'speckled' ? 28 : 18;
  return {
    x: Math.max(1, Math.round(2 * Math.PI * averageRadius / tileSize)),
    y: Math.max(1, Math.round(height / tileSize)),
  };
}

function deterministicVaseRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = Math.imul(state ^ state >>> 15, 1 | state);
    state ^= state + Math.imul(state ^ state >>> 7, 61 | state);
    return ((state ^ state >>> 14) >>> 0) / 4294967296;
  };
}
