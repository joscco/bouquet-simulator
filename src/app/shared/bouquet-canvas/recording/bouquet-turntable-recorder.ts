import {
  ACESFilmicToneMapping,
  Box3Helper,
  Group,
  OrthographicCamera,
  PCFSoftShadowMap,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';
import {
  bouquetToneMappingExposure,
  normalizedBouquetLightLevel,
} from '../../../core/data/bouquet-scene';
import {BouquetBackgroundMode} from '../../../core/models/flower.models';
import {
  CanvasVideoRecording,
  recordCanvasVideo,
} from '../../media/canvas-video-recorder';
import {loopFramePhase} from '../../media/loop-frame';
import {BouquetSceneEffectsRenderer} from '../effects/bouquet-scene-effects';
import {
  DEFAULT_TURNTABLE_VIDEO_SIZE,
  BouquetTurntableRecordingOptions,
  validVideoDimension,
} from '../bouquet-recording-options';

export interface BouquetTurntableRecordingContext {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: OrthographicCamera;
  bouquet: Group;
  sceneEffects: BouquetSceneEffectsRenderer;
  initialRotation: number;
  backgroundMode: BouquetBackgroundMode | undefined;
  lightLevel: number | undefined;
  currentRotation: () => number;
  setRecordingViewport: (viewport: {width: number; height: number} | null) => void;
  resizeCamera: () => void;
}

export async function recordBouquetTurntable(
  context: BouquetTurntableRecordingContext,
  options: BouquetTurntableRecordingOptions = {},
): Promise<CanvasVideoRecording> {
  const durationSeconds = options.durationSeconds ?? 6;
  const fps = options.fps ?? 30;
  const width = validVideoDimension(options.width ?? DEFAULT_TURNTABLE_VIDEO_SIZE);
  const height = validVideoDimension(options.height ?? DEFAULT_TURNTABLE_VIDEO_SIZE);
  const frames = Math.round(durationSeconds * fps);
  const lightLevel = normalizedBouquetLightLevel(context.lightLevel, context.backgroundMode);
  const recordingRenderer = createRecordingRenderer(width, height, lightLevel);
  const hiddenHelpers = hideBoundingBoxHelpers(context.bouquet);

  context.setRecordingViewport({width, height});
  try {
    return await recordCanvasVideo(recordingRenderer.domElement, {
      frames,
      fps,
      onProgress: options.onProgress,
      drawFrame: (frame) => {
        const loopPhase = loopFramePhase(frame, frames);
        context.bouquet.rotation.y = context.initialRotation + loopPhase * Math.PI * 2;
        context.sceneEffects.updatePhase(loopPhase);
        context.resizeCamera();
        recordingRenderer.render(context.scene, context.camera);
      },
    });
  } finally {
    context.setRecordingViewport(null);
    for (const helper of hiddenHelpers) helper.visible = true;
    context.bouquet.rotation.y = context.currentRotation();
    context.sceneEffects.update(performance.now() / 1000);
    context.resizeCamera();
    context.renderer.render(context.scene, context.camera);
    recordingRenderer.dispose();
  }
}

function createRecordingRenderer(
  width: number,
  height: number,
  lightLevel: number,
): WebGLRenderer {
  const renderer = new WebGLRenderer({
    alpha: false,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = bouquetToneMappingExposure(lightLevel);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  return renderer;
}

function hideBoundingBoxHelpers(bouquet: Group): Box3Helper[] {
  const hiddenHelpers: Box3Helper[] = [];
  bouquet.traverse((object) => {
    if (object instanceof Box3Helper && object.visible) {
      object.visible = false;
      hiddenHelpers.push(object);
    }
  });
  return hiddenHelpers;
}
