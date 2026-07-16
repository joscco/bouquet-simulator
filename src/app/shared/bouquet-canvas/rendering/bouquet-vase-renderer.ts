import {
  CanvasTexture,
  CatmullRomCurve3,
  CylinderGeometry,
  DoubleSide,
  Group,
  LatheGeometry,
  Mesh,
  MeshPhysicalMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  TorusGeometry,
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
  rings?: Array<{
    radius: number;
    y: number;
    tube: number;
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

const VASE_MATERIAL_DEFINITIONS: Record<VaseMaterialId, VaseMaterialDefinition> = {
  clay: {
    bodyColor: 0xb96f4d,
    openingColor: 0x5d3327,
    rimColor: 0xd08a65,
    roughness: 0.86,
    metalness: 0,
  },
  stoneware: {
    bodyColor: 0xc9d2c9,
    openingColor: 0x43524b,
    rimColor: 0xe8ede6,
    roughness: 0.24,
    metalness: 0.02,
    clearcoat: 0.58,
    clearcoatRoughness: 0.2,
    texture: 'speckled',
  },
  concrete: {
    bodyColor: 0x96958f,
    openingColor: 0x4c4c49,
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
    openingRadius: 39,
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
    openingRadius: 58,
    openingY: 26,
    rimRadius: 64,
    rimTube: 2.4,
    rings: [{radius: 30, y: -60, tube: 2}],
  },
  cylinder: {
    profile: [
      [0, -64], [31, -64], [37, -62], [40, -57], [40, -34], [39, -10],
      [40, 12], [39, 23], [36, 28],
    ],
    openingRadius: 34,
    openingY: 27,
    rimRadius: 38,
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
    openingRadius: 41,
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
    openingRadius: 17,
    openingY: 33,
    rimRadius: 21,
    rimTube: 2,
    rings: [
      {radius: 19, y: -66, tube: 1.8},
      {radius: 25, y: -42, tube: 0.9},
      {radius: 18, y: 17, tube: 0.8},
    ],
  },
};

export function createBouquetVase(vaseId: string, materialId: VaseMaterialId): Group {
  const definition = VASE_RENDER_DEFINITIONS[vaseId] ?? VASE_RENDER_DEFINITIONS[DEFAULT_VASE_ID]!;
  const surface = VASE_MATERIAL_DEFINITIONS[materialId];
  const glass = materialId === 'glass';
  const vase = new Group();
  const bodyTexture = createVaseSurfaceTexture(surface.texture);
  const body = new Mesh(
    new LatheGeometry(smoothVaseProfile(definition.profile), 144),
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
      bumpScale: surface.texture === 'grainy' ? 0.9 : surface.texture === 'speckled' ? 0.25 : 0,
    }),
  );
  body.geometry.computeVertexNormals();
  body.renderOrder = glass ? 2 : 0;

  const opening = new Mesh(
    new CylinderGeometry(definition.openingRadius * 0.94, definition.openingRadius, 2.8, 144),
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
  opening.position.y = definition.openingY;
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
  );
  vase.add(body, opening, rim);

  for (const ring of definition.rings ?? []) {
    vase.add(createVaseRing(
      ring.radius,
      ring.tube,
      ring.y,
      surface,
      glass,
      glass ? 0.5 : 1,
      12,
      glass ? 0.06 : surface.roughness,
      glass ? 2 : 0,
    ));
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
): Mesh {
  const ring = new Mesh(
    new TorusGeometry(radius, tube, radialSegments, 144),
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
): CanvasTexture | null {
  if (!textureType || typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);

  const random = deterministicVaseRandom(textureType === 'speckled' ? 0x51a7 : 0xc0ac);
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

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(textureType === 'speckled' ? 2 : 3, textureType === 'speckled' ? 3 : 5);
  return texture;
}

function deterministicVaseRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = Math.imul(state ^ state >>> 15, 1 | state);
    state ^= state + Math.imul(state ^ state >>> 7, 61 | state);
    return ((state ^ state >>> 14) >>> 0) / 4294967296;
  };
}
