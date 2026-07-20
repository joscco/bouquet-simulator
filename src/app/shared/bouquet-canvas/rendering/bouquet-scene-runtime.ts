import {
  ACESFilmicToneMapping,
  Color,
  DirectionalLight,
  HemisphereLight,
  Object3D,
  PCFSoftShadowMap,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';
import {
  bouquetBackgroundColor,
  bouquetToneMappingExposure,
  normalizedBouquetLightLevel,
} from '../../../core/data/bouquet-scene';
import {lerp} from '../../../core/utils/numbers';

interface BouquetLightingPreset {
  hemisphereSky: string;
  hemisphereGround: string;
  hemisphereIntensity: number;
  keyColor: string;
  keyIntensity: number;
  keyPosition: [number, number, number];
  fillColor: string;
  fillIntensity: number;
  fillPosition: [number, number, number];
  rimColor: string;
  rimIntensity: number;
  rimPosition: [number, number, number];
}

const NIGHT_LIGHTING: BouquetLightingPreset = {
  hemisphereSky: '#6f8fc5',
  hemisphereGround: '#03050b',
  hemisphereIntensity: 0.9,
  keyColor: '#c1d9ff',
  keyIntensity: 3.65,
  keyPosition: [-340, 500, 120],
  fillColor: '#534798',
  fillIntensity: 0.95,
  fillPosition: [300, 110, -300],
  rimColor: '#a882ff',
  rimIntensity: 1.8,
  rimPosition: [260, 340, -380],
};
const BLUE_HOUR_LIGHTING: BouquetLightingPreset = {
  hemisphereSky: '#777bd8',
  hemisphereGround: '#130d2b',
  hemisphereIntensity: 1,
  keyColor: '#ff78ad',
  keyIntensity: 4.2,
  keyPosition: [-430, 260, 220],
  fillColor: '#566cff',
  fillIntensity: 1.25,
  fillPosition: [330, 130, -320],
  rimColor: '#bd63ff',
  rimIntensity: 2.4,
  rimPosition: [300, 320, -410],
};
const TWILIGHT_LIGHTING: BouquetLightingPreset = {
  hemisphereSky: '#ffbd7a',
  hemisphereGround: '#3b2031',
  hemisphereIntensity: 1.05,
  keyColor: '#ff963f',
  keyIntensity: 4.8,
  keyPosition: [-520, 125, 300],
  fillColor: '#8f60bb',
  fillIntensity: 1.2,
  fillPosition: [350, 170, -260],
  rimColor: '#ff507d',
  rimIntensity: 2.25,
  rimPosition: [360, 220, -420],
};
const GOLDEN_HOUR_LIGHTING: BouquetLightingPreset = {
  hemisphereSky: '#ffd39a',
  hemisphereGround: '#563328',
  hemisphereIntensity: 1.25,
  keyColor: '#ffc85b',
  keyIntensity: 4.2,
  keyPosition: [-430, 230, 340],
  fillColor: '#9a7fe0',
  fillIntensity: 0.95,
  fillPosition: [350, 170, -120],
  rimColor: '#ff7865',
  rimIntensity: 1.5,
  rimPosition: [330, 250, -380],
};
const DAY_LIGHTING: BouquetLightingPreset = {
  hemisphereSky: '#fff8e8',
  hemisphereGround: '#52645d',
  hemisphereIntensity: 1.45,
  keyColor: '#fff1d6',
  keyIntensity: 2.75,
  keyPosition: [-240, 420, 360],
  fillColor: '#dbeafe',
  fillIntensity: 0.85,
  fillPosition: [340, 180, 280],
  rimColor: '#fff1cf',
  rimIntensity: 0.3,
  rimPosition: [280, 300, -320],
};

export interface BouquetSceneLighting {
  hemisphere: HemisphereLight;
  key: DirectionalLight;
  fill: DirectionalLight;
  rim: DirectionalLight;
}

export function createBouquetRenderer(
  preserveDrawingBuffer: boolean,
  lightweight = false,
): WebGLRenderer {
  const renderer = new WebGLRenderer({
    alpha: true,
    antialias: !lightweight,
    powerPreference: lightweight ? 'low-power' : 'high-performance',
    preserveDrawingBuffer,
  });
  renderer.setPixelRatio(lightweight ? 1 : Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = !lightweight;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.className = 'block h-full w-full touch-none';
  return renderer;
}

export function createBouquetSceneLighting(): BouquetSceneLighting {
  const hemisphere = new HemisphereLight(0xfff8e8, 0x52645d, 1.45);
  const key = new DirectionalLight(0xfff1d6, 2.75);
  key.position.set(-240, 420, 360);
  key.target.position.set(0, -110, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -430;
  key.shadow.camera.right = 430;
  key.shadow.camera.top = 650;
  key.shadow.camera.bottom = -260;
  key.shadow.camera.near = 30;
  key.shadow.camera.far = 1300;
  key.shadow.camera.updateProjectionMatrix();
  key.shadow.bias = -0.00025;
  key.shadow.normalBias = 0.035;
  const fill = new DirectionalLight(0xdbeafe, 0.85);
  fill.position.set(340, 180, 280);
  const rim = new DirectionalLight(0xfff1cf, 0.3);
  rim.position.set(280, 300, -320);
  return {hemisphere, key, fill, rim};
}

export function bouquetSceneLightingObjects(lighting: BouquetSceneLighting): Object3D[] {
  return [lighting.hemisphere, lighting.key, lighting.key.target, lighting.fill, lighting.rim];
}

export function createBouquetSceneBackground(lightLevel: number): Color {
  return new Color(bouquetBackgroundColor(lightLevel));
}

export function applyBouquetSceneLighting(
  lighting: BouquetSceneLighting,
  lightLevel: number,
  renderer: WebGLRenderer | null,
): void {
  const level = normalizedBouquetLightLevel(lightLevel);
  const [from, to, unit] = lightingSegment(level);
  lighting.hemisphere.color.copy(mixedColor(from.hemisphereSky, to.hemisphereSky, unit));
  lighting.hemisphere.groundColor.copy(mixedColor(from.hemisphereGround, to.hemisphereGround, unit));
  lighting.hemisphere.intensity = lerp(from.hemisphereIntensity, to.hemisphereIntensity, unit);
  lighting.key.color.copy(mixedColor(from.keyColor, to.keyColor, unit));
  lighting.key.intensity = lerp(from.keyIntensity, to.keyIntensity, unit);
  lighting.key.position.set(...mixedPosition(from.keyPosition, to.keyPosition, unit));
  lighting.fill.color.copy(mixedColor(from.fillColor, to.fillColor, unit));
  lighting.fill.intensity = lerp(from.fillIntensity, to.fillIntensity, unit);
  lighting.fill.position.set(...mixedPosition(from.fillPosition, to.fillPosition, unit));
  lighting.rim.color.copy(mixedColor(from.rimColor, to.rimColor, unit));
  lighting.rim.intensity = lerp(from.rimIntensity, to.rimIntensity, unit);
  lighting.rim.position.set(...mixedPosition(from.rimPosition, to.rimPosition, unit));
  if (renderer) renderer.toneMappingExposure = bouquetToneMappingExposure(level);
}

function lightingSegment(
  level: number,
): readonly [BouquetLightingPreset, BouquetLightingPreset, number] {
  if (level <= 25) return [NIGHT_LIGHTING, BLUE_HOUR_LIGHTING, level / 25];
  if (level <= 50) return [BLUE_HOUR_LIGHTING, TWILIGHT_LIGHTING, (level - 25) / 25];
  if (level <= 75) return [TWILIGHT_LIGHTING, GOLDEN_HOUR_LIGHTING, (level - 50) / 25];
  return [GOLDEN_HOUR_LIGHTING, DAY_LIGHTING, (level - 75) / 25];
}

function mixedColor(from: string, to: string, unit: number): Color {
  return new Color(from).lerp(new Color(to), unit);
}

function mixedPosition(
  from: [number, number, number],
  to: [number, number, number],
  unit: number,
): [number, number, number] {
  return [lerp(from[0], to[0], unit), lerp(from[1], to[1], unit), lerp(from[2], to[2], unit)];
}
