import {
  ACESFilmicToneMapping,
  DirectionalLight,
  HemisphereLight,
  Object3D,
  PCFSoftShadowMap,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';
import {BouquetBackgroundMode} from '../../../core/models/flower.models';

export interface BouquetSceneLighting {
  hemisphere: HemisphereLight;
  key: DirectionalLight;
  fill: DirectionalLight;
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
  return {hemisphere, key, fill};
}

export function bouquetSceneLightingObjects(lighting: BouquetSceneLighting): Object3D[] {
  return [lighting.hemisphere, lighting.key, lighting.key.target, lighting.fill];
}

export function applyBouquetSceneLighting(
  lighting: BouquetSceneLighting,
  backgroundMode: BouquetBackgroundMode,
  renderer: WebGLRenderer | null,
): void {
  const isDark = backgroundMode === 'dark';
  lighting.hemisphere.color.set(isDark ? '#60789b' : '#fff8e8');
  lighting.hemisphere.groundColor.set(isDark ? '#05060a' : '#52645d');
  lighting.hemisphere.intensity = isDark ? 0.78 : 1.45;
  lighting.key.color.set(isDark ? '#b7d1ff' : '#fff1d6');
  lighting.key.intensity = isDark ? 2.55 : 2.75;
  lighting.key.position.set(isDark ? -300 : -240, isDark ? 460 : 420, isDark ? 200 : 360);
  lighting.fill.color.set(isDark ? '#35517c' : '#dbeafe');
  lighting.fill.intensity = isDark ? 0.36 : 0.85;
  lighting.fill.position.set(isDark ? 280 : 340, isDark ? 100 : 180, isDark ? -260 : 280);
  if (renderer) renderer.toneMappingExposure = isDark ? 1 : 1.08;
}
