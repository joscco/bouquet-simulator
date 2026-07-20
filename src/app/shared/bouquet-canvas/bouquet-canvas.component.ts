import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  OnDestroy,
  Output,
  ViewChild,
  effect,
  input,
} from '@angular/core';
import {
  Box3,
  Group,
  Object3D,
  OrthographicCamera,
  Quaternion,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import {
  BouquetFlower,
  BouquetState,
  FlowerDefinition,
} from '../../core/models/flower.models';
import {
  DEFAULT_VASE_ID,
  VaseMaterialId,
  normalizedVaseMaterialId,
} from '../../core/data/vases';
import {CanvasVideoRecording} from '../media/canvas-video-recorder';
import {BouquetSceneEffectsRenderer} from './effects/bouquet-scene-effects';
import {bouquetFlowerRenderSignature} from './bouquet-flower-render-signature';
import {
  BouquetPickData,
  createBouquetFlower,
} from './rendering/bouquet-flower-renderer';
import {createBouquetVase} from './rendering/bouquet-vase-renderer';
import {disposeGroupChildren} from './rendering/dispose-three-object';
import {
  BouquetCanvasViewMode,
  pointerCenter,
  pointerDistance,
} from './bouquet-canvas-metrics';
import {
  BouquetTurntableRecordingOptions,
} from './bouquet-recording-options';
import {clamp} from '../../core/utils/numbers';
import {
  BouquetCanvasViewConfiguration,
  BouquetCanvasViewController,
} from './bouquet-canvas-view-controller';
import {
  bouquetBackgroundModeForLightLevel,
  normalizedBouquetLightLevel,
} from '../../core/data/bouquet-scene';
import {recordBouquetTurntable} from './recording/bouquet-turntable-recorder';
import {
  applyBouquetSceneLighting,
  bouquetSceneLightingObjects,
  createBouquetSceneBackground,
  createBouquetRenderer,
  createBouquetSceneLighting,
} from './rendering/bouquet-scene-runtime';

export type {BouquetCanvasViewMode} from './bouquet-canvas-metrics';
export type {BouquetTurntableRecordingOptions} from './bouquet-recording-options';

@Component({
  selector: 'app-bouquet-canvas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {'class': 'relative block w-full h-full min-h-0'},
  templateUrl: './bouquet-canvas.component.html',
})
export class BouquetCanvasComponent implements AfterViewInit, OnDestroy {
  readonly state = input.required<BouquetState>();
  readonly definitions = input.required<FlowerDefinition[]>();
  readonly selectedId = input<string | null>(null);
  readonly overlappingIds = input<ReadonlySet<string>>(new Set<string>());
  readonly snapshotKey = input<string | null>(null);
  readonly thumbnailMode = input(false);
  readonly snapshotSize = input(320);
  readonly zoom = input(1);
  readonly zoomEnabled = input(false);
  readonly fitToContent = input(false);
  /** Explicitly requests a fresh fit without making every geometry edit recenter the preview. */
  readonly recenterKey = input(0);
  readonly viewportInsets = input<{left: number; right: number; top: number; bottom: number}>({
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  });
  readonly orbitEnabled = input(false);
  readonly orbitPitch = input(0);
  readonly viewMode = input<BouquetCanvasViewMode>('rotate');
  readonly viewOffset = input<{x: number; y: number}>({x: 0, y: 0});
  readonly flowerMoveEnabled = input(false);
  readonly vaseEnabled = input(false);
  readonly highlightedNodeIds = input<ReadonlySet<string>>(new Set<string>());
  readonly highlightedConnection = input<{sourceId: string; index: number} | null>(null);

  @Output() readonly flowerDrag = new EventEmitter<{
    instanceId: string;
    dx: number;
    dy: number;
    dz: number;
  }>();
  @Output() readonly flowerDragEnd = new EventEmitter<string>();
  @Output() readonly rotateDrag = new EventEmitter<number>();
  @Output() readonly orbitDrag = new EventEmitter<{yaw: number; pitch: number}>();
  @Output() readonly viewPan = new EventEmitter<{dx: number; dy: number}>();
  @Output() readonly selectionChange = new EventEmitter<string | null>();
  @Output() readonly zoomChange = new EventEmitter<number>();
  @Output() readonly snapshotReady = new EventEmitter<{key: string; dataUrl: string}>();

  @ViewChild('canvasHost', {static: true}) private readonly canvasHost!: ElementRef<HTMLDivElement>;

  private renderer: WebGLRenderer | null = null;
  private readonly scene = new Scene();
  private readonly camera = new OrthographicCamera();
  private readonly bouquet = new Group();
  private readonly bouquetContent = new Group();
  private readonly sceneEffects = new BouquetSceneEffectsRenderer();
  private readonly viewController = new BouquetCanvasViewController(this.camera, this.bouquet);
  private readonly sceneLighting = createBouquetSceneLighting();
  private readonly raycaster = new Raycaster();
  private readonly pointer = new Vector2();
  private resizeObserver: ResizeObserver | null = null;
  private rebuildFrame: number | null = null;
  private renderFrame: number | null = null;
  private flowerSignatureSource: readonly BouquetFlower[] | null = null;
  private cachedFlowerRenderSignature = '';
  private lastFlowerRenderSignature: string | null = null;
  private lastDefinitions: FlowerDefinition[] | null = null;
  private lastFlowerCount: number | null = null;
  private lastSelectedId: string | null = null;
  private lastOverlappingIdsSignature = '';
  private lastHighlightedNodeIdsSignature = '';
  private lastHighlightedConnection: {sourceId: string; index: number} | null = null;
  private lastVaseEnabled: boolean | null = null;
  private lastVaseId: string | null = null;
  private lastVaseMaterialId: VaseMaterialId | null = null;
  private lastGeometrySignature: string | null = null;
  private lastRecenterKey: number | null = null;
  private backgroundDrag: {
    pointerId: number;
    x: number;
    y: number;
    mode: BouquetCanvasViewMode;
  } | null = null;
  private recenterOnNextRebuild = true;
  private flowerDragState: {
    pointerId: number;
    instanceId: string;
    x: number;
    y: number;
    scale: number;
  } | null = null;
  private readonly zoomTouches = new Map<number, {x: number; y: number}>();
  private zoomPinchDistance: number | null = null;
  private emittedSnapshotKey: string | null = null;
  private recordingViewport: {width: number; height: number} | null = null;
  private effectsAnimationFrame: number | null = null;
  private lastSceneBackgroundLevel: number | null = null;
  private lastSceneBackgroundTransparent: boolean | null = null;

  constructor() {
    this.bouquet.add(this.bouquetContent, this.sceneEffects.group);
    effect(() => {
      const state = this.state();
      const definitions = this.definitions();
      const selectedId = this.selectedId();
      const overlappingIdsSignature = [...this.overlappingIds()].sort().join('|');
      const snapshotKey = this.snapshotKey();
      const thumbnailMode = this.thumbnailMode();
      const recenterKey = this.recenterKey();
      const highlightedNodeIdsSignature = [...this.highlightedNodeIds()].sort().join('|');
      const highlightedConnection = this.highlightedConnection();
      const vaseEnabled = this.vaseEnabled();
      const vaseId = state.vaseId ?? DEFAULT_VASE_ID;
      const vaseMaterialId = normalizedVaseMaterialId(state.vaseMaterialId);
      const lightLevel = normalizedBouquetLightLevel(state.lightLevel, state.backgroundMode);
      const backgroundMode = bouquetBackgroundModeForLightLevel(lightLevel);
      this.zoom();
      this.fitToContent();
      this.viewportInsets();
      this.orbitPitch();
      this.viewOffset();
      const geometrySignature = state.flowers
        .map((flower) => [
          flower.instanceId,
          flower.definitionId,
          flower.scale,
          flower.seed,
          flower.cutRatio ?? 0,
        ].join(':'))
        .join('|');
      const flowerRenderSignature = this.renderSignatureFor(state.flowers);
      const recenterRequested = this.lastRecenterKey !== null
        && recenterKey !== this.lastRecenterKey;
      const shouldRecenter = state.flowers.length !== this.lastFlowerCount
        || geometrySignature !== this.lastGeometrySignature
        || vaseEnabled !== this.lastVaseEnabled
        || vaseId !== this.lastVaseId
        || vaseMaterialId !== this.lastVaseMaterialId;
      const structureChanged = flowerRenderSignature !== this.lastFlowerRenderSignature
        || definitions !== this.lastDefinitions
        || selectedId !== this.lastSelectedId
        || overlappingIdsSignature !== this.lastOverlappingIdsSignature
        || highlightedNodeIdsSignature !== this.lastHighlightedNodeIdsSignature
        || highlightedConnection?.sourceId !== this.lastHighlightedConnection?.sourceId
        || highlightedConnection?.index !== this.lastHighlightedConnection?.index
        || vaseEnabled !== this.lastVaseEnabled
        || vaseId !== this.lastVaseId
        || vaseMaterialId !== this.lastVaseMaterialId;

      this.lastFlowerRenderSignature = flowerRenderSignature;
      this.lastDefinitions = definitions;
      this.lastFlowerCount = state.flowers.length;
      this.lastSelectedId = selectedId;
      this.lastOverlappingIdsSignature = overlappingIdsSignature;
      this.lastHighlightedNodeIdsSignature = highlightedNodeIdsSignature;
      this.lastHighlightedConnection = highlightedConnection;
      this.lastVaseEnabled = vaseEnabled;
      this.lastVaseId = vaseId;
      this.lastVaseMaterialId = vaseMaterialId;
      this.lastGeometrySignature = geometrySignature;
      this.lastRecenterKey = recenterKey;
      this.updateSceneBackground(lightLevel, thumbnailMode);
      this.applySceneLighting(lightLevel);
      this.sceneEffects.configure(state.sceneEffects, backgroundMode);
      this.syncEffectsAnimation();
      if (structureChanged || recenterRequested) {
        this.recenterOnNextRebuild ||= shouldRecenter || recenterRequested;
        this.requestRebuild();
      }
      if (snapshotKey !== this.emittedSnapshotKey) this.requestRender();
      this.updateView();
    });
  }

  private renderSignatureFor(flowers: readonly BouquetFlower[]): string {
    if (flowers !== this.flowerSignatureSource) {
      this.flowerSignatureSource = flowers;
      this.cachedFlowerRenderSignature = bouquetFlowerRenderSignature(flowers);
    }
    return this.cachedFlowerRenderSignature;
  }

  ngAfterViewInit(): void {
    const renderer = createBouquetRenderer(this.snapshotKey() !== null, this.thumbnailMode());
    renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
    renderer.domElement.addEventListener('pointermove', this.onPointerMove);
    renderer.domElement.addEventListener('pointerup', this.onPointerUp);
    renderer.domElement.addEventListener('pointercancel', this.onPointerUp);
    this.renderer = renderer;
    this.canvasHost.nativeElement.appendChild(renderer.domElement);

    this.scene.add(...bouquetSceneLightingObjects(this.sceneLighting), this.bouquet);
    this.applySceneLighting(normalizedBouquetLightLevel(
      this.state().lightLevel,
      this.state().backgroundMode,
    ));
    this.camera.position.set(0, 0, 1000);
    this.camera.lookAt(0, 0, 0);

    this.resizeObserver = new ResizeObserver(() => {
      this.resize();
      this.requestRender();
    });
    this.resizeObserver.observe(this.canvasHost.nativeElement);
    this.resize();
    this.rebuildScene();
    this.syncEffectsAnimation();
  }

  ngOnDestroy(): void {
    if (this.rebuildFrame !== null) cancelAnimationFrame(this.rebuildFrame);
    if (this.renderFrame !== null) cancelAnimationFrame(this.renderFrame);
    if (this.effectsAnimationFrame !== null) cancelAnimationFrame(this.effectsAnimationFrame);
    this.resizeObserver?.disconnect();
    const renderer = this.renderer;
    if (renderer) {
      renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
      renderer.domElement.removeEventListener('pointermove', this.onPointerMove);
      renderer.domElement.removeEventListener('pointerup', this.onPointerUp);
      renderer.domElement.removeEventListener('pointercancel', this.onPointerUp);
    }
    disposeGroupChildren(this.bouquetContent);
    this.sceneEffects.dispose();
    renderer?.dispose();
    renderer?.forceContextLoss();
    renderer?.domElement.remove();
    this.renderer = null;
  }

  zoomWithWheel(event: WheelEvent): void {
    if (!this.zoomEnabled()) return;
    event.preventDefault();
    if (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
      const zoom = this.effectiveZoom();
      this.viewPan.emit({dx: -event.deltaX / zoom, dy: event.deltaY / zoom});
      return;
    }
    this.zoomAround(event.clientX, event.clientY, clamp(this.zoom() * Math.exp(-event.deltaY * 0.0015), 0.35, 3.5));
  }

  startZoomGesture(event: PointerEvent): void {
    if (!this.zoomEnabled() || event.pointerType !== 'touch') return;
    this.zoomTouches.set(event.pointerId, {x: event.clientX, y: event.clientY});
    if (this.zoomTouches.size === 2) {
      this.backgroundDrag = null;
      this.zoomPinchDistance = pointerDistance(this.zoomTouches);
    }
  }

  moveZoomGesture(event: PointerEvent): void {
    if (!this.zoomTouches.has(event.pointerId)) return;
    this.zoomTouches.set(event.pointerId, {x: event.clientX, y: event.clientY});
    if (this.zoomTouches.size !== 2) return;
    const distance = pointerDistance(this.zoomTouches);
    if (this.zoomPinchDistance) {
      const center = pointerCenter(this.zoomTouches);
      this.zoomAround(center.x, center.y, clamp(this.zoom() * distance / this.zoomPinchDistance, 0.35, 3.5));
    }
    this.zoomPinchDistance = distance;
  }

  endZoomGesture(event: PointerEvent): void {
    this.zoomTouches.delete(event.pointerId);
    if (this.zoomTouches.size < 2) this.zoomPinchDistance = null;
  }

  async recordTurntable(
    options: BouquetTurntableRecordingOptions = {},
  ): Promise<CanvasVideoRecording> {
    const renderer = this.renderer;
    if (!renderer) throw new Error('Die 3D-Ansicht ist noch nicht bereit.');
    return recordBouquetTurntable({
      renderer,
      scene: this.scene,
      camera: this.camera,
      bouquet: this.bouquet,
      sceneEffects: this.sceneEffects,
      initialRotation: this.state().rotation,
      backgroundMode: this.state().backgroundMode,
      lightLevel: this.state().lightLevel,
      currentRotation: () => this.state().rotation,
      setRecordingViewport: (viewport) => this.recordingViewport = viewport,
      resizeCamera: () => this.resizeCamera(),
    }, options);
  }

  private applySceneLighting(lightLevel: number): void {
    applyBouquetSceneLighting(this.sceneLighting, lightLevel, this.renderer);
  }

  private updateSceneBackground(lightLevel: number, transparent: boolean): void {
    if (
      lightLevel === this.lastSceneBackgroundLevel
      && transparent === this.lastSceneBackgroundTransparent
    ) return;
    this.scene.background = transparent ? null : createBouquetSceneBackground(lightLevel);
    this.lastSceneBackgroundLevel = lightLevel;
    this.lastSceneBackgroundTransparent = transparent;
  }

  private requestRebuild(): void {
    if (!this.renderer || this.rebuildFrame !== null) return;
    this.rebuildFrame = requestAnimationFrame(() => {
      this.rebuildFrame = null;
      this.rebuildScene();
    });
  }

  private rebuildScene(): void {
    if (!this.renderer) return;
    disposeGroupChildren(this.bouquetContent);
    this.bouquet.position.set(0, 0, 0);
    this.bouquet.rotation.set(0, 0, 0);
    const definitions = new Map(this.definitions().map((definition) => [definition.id, definition]));

    const vaseId = this.state().vaseId ?? DEFAULT_VASE_ID;
    if (this.vaseEnabled()) {
      this.bouquetContent.add(createBouquetVase(
        vaseId,
        normalizedVaseMaterialId(this.state().vaseMaterialId),
      ));
    }

    for (const flower of this.state().flowers) {
      const definition = definitions.get(flower.definitionId);
      if (!definition) continue;
      this.bouquetContent.add(createBouquetFlower(definition, flower, {
        vaseEnabled: this.vaseEnabled(),
        vaseId: this.vaseEnabled() ? vaseId : null,
        selected: this.selectedId() === flower.instanceId,
        overlapping: this.overlappingIds().has(flower.instanceId),
        highlightedNodeIds: this.highlightedNodeIds(),
        highlightedConnection: this.highlightedConnection(),
        requestRender: () => this.requestRender(),
      }));
    }
    this.bouquet.updateMatrixWorld(true);
    const bounds = this.contentBounds();
    if (this.recenterOnNextRebuild) {
      this.viewController.setContentBounds(bounds);
      this.recenterOnNextRebuild = false;
    }
    this.sceneEffects.setBounds(bounds);
    this.updateView();
  }

  private updateView(): void {
    this.bouquet.rotation.y = this.state().rotation;
    this.resizeCamera();
    this.requestRender();
  }

  private resize(): void {
    const renderer = this.renderer;
    if (!renderer) return;
    const host = this.canvasHost.nativeElement;
    const snapshotSize = this.thumbnailMode() ? this.snapshotSize() : null;
    renderer.setSize(
      snapshotSize ?? Math.max(1, host.clientWidth),
      snapshotSize ?? Math.max(1, host.clientHeight),
      snapshotSize === null,
    );
    this.resizeCamera();
  }

  private resizeCamera(): void {
    if (!this.renderer) return;
    this.viewController.resizeCamera(this.viewConfiguration());
  }

  private effectiveZoom(userZoom = this.zoom()): number {
    return this.viewController.effectiveZoom(this.viewConfiguration(), userZoom);
  }

  private zoomAround(clientX: number, clientY: number, nextUserZoom: number): void {
    const pan = this.viewController.zoomPanDelta(
      clientX,
      clientY,
      nextUserZoom,
      this.viewConfiguration(),
    );
    if (!pan) return;
    this.viewPan.emit(pan);
    this.zoomChange.emit(nextUserZoom);
  }

  private viewConfiguration(): BouquetCanvasViewConfiguration {
    return {
      host: this.canvasHost.nativeElement,
      userZoom: this.zoom(),
      fitToContent: this.fitToContent(),
      viewportInsets: this.viewportInsets(),
      orbitPitch: this.orbitPitch(),
      viewOffset: this.viewOffset(),
      vaseEnabled: this.vaseEnabled(),
      recordingViewport: this.thumbnailMode()
        ? {width: this.snapshotSize(), height: this.snapshotSize()}
        : this.recordingViewport,
    };
  }

  private requestRender(): void {
    if (!this.renderer || this.renderFrame !== null) return;
    this.renderFrame = requestAnimationFrame(() => {
      this.renderFrame = null;
      this.renderer?.render(this.scene, this.camera);
      const snapshotKey = this.snapshotKey();
      const host = this.canvasHost.nativeElement;
      const hasRenderableSize = host.clientWidth >= 16 && host.clientHeight >= 16;
      if (snapshotKey && snapshotKey !== this.emittedSnapshotKey && this.renderer && hasRenderableSize) {
        this.emittedSnapshotKey = snapshotKey;
        this.snapshotReady.emit({
          key: snapshotKey,
          dataUrl: this.renderer.domElement.toDataURL(
            this.thumbnailMode() ? 'image/png' : 'image/webp',
            0.92,
          ),
        });
      }
    });
  }

  private syncEffectsAnimation(): void {
    if (!this.renderer || !this.sceneEffects.animated) {
      if (this.effectsAnimationFrame !== null) cancelAnimationFrame(this.effectsAnimationFrame);
      this.effectsAnimationFrame = null;
      this.requestRender();
      return;
    }
    if (this.effectsAnimationFrame === null) {
      this.effectsAnimationFrame = requestAnimationFrame(this.animateSceneEffects);
    }
  }

  private readonly animateSceneEffects = (time: number): void => {
    this.effectsAnimationFrame = null;
    if (!this.renderer || !this.sceneEffects.animated) return;
    if (!this.recordingViewport) {
      this.sceneEffects.update(time / 1000);
      this.renderer.render(this.scene, this.camera);
    }
    this.effectsAnimationFrame = requestAnimationFrame(this.animateSceneEffects);
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (![0, 1, 2].includes(event.button) && event.pointerType !== 'touch') return;
    const pick = this.pick(event);
    const data = pick?.userData['pick'] as BouquetPickData | undefined;
    if (data && event.button === 0 && !event.shiftKey) {
      event.stopPropagation();
      this.selectionChange.emit(data.instanceId);
      if (this.flowerMoveEnabled()) {
        this.flowerDragState = {
          pointerId: event.pointerId,
          instanceId: data.instanceId,
          x: event.clientX,
          y: event.clientY,
          scale: this.effectiveZoom(),
        };
      } else {
        this.backgroundDrag = {
          pointerId: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          mode: this.dragMode(event),
        };
      }
    } else {
      if (!data) this.selectionChange.emit(null);
      this.backgroundDrag = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        mode: this.dragMode(event),
      };
    }
    this.renderer?.domElement.setPointerCapture(event.pointerId);
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (this.flowerDragState?.pointerId === event.pointerId) {
      const drag = this.flowerDragState;
      const dx = (event.clientX - drag.x) / drag.scale;
      const dy = (event.clientY - drag.y) / drag.scale;
      const local = this.screenHorizontalDeltaToBouquet(dx);
      drag.x = event.clientX;
      drag.y = event.clientY;
      this.flowerDrag.emit({
        instanceId: drag.instanceId,
        dx: local.x,
        dy,
        dz: local.z,
      });
      return;
    }
    if (!this.backgroundDrag || this.backgroundDrag.pointerId !== event.pointerId) return;
    const dx = event.clientX - this.backgroundDrag.x;
    const dy = event.clientY - this.backgroundDrag.y;
    this.backgroundDrag.x = event.clientX;
    this.backgroundDrag.y = event.clientY;
    if (this.backgroundDrag.mode === 'pan') {
      const zoom = this.effectiveZoom();
      this.viewPan.emit({dx: dx / zoom, dy: -dy / zoom});
      return;
    }
    if (this.orbitEnabled()) {
      this.orbitDrag.emit({yaw: -dx * 0.008, pitch: dy * 0.008});
    } else {
      this.rotateDrag.emit(-dx * 0.008);
    }
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (this.flowerDragState?.pointerId === event.pointerId) {
      this.flowerDragEnd.emit(this.flowerDragState.instanceId);
      this.flowerDragState = null;
    }
    if (this.backgroundDrag?.pointerId === event.pointerId) this.backgroundDrag = null;
  };

  private pick(event: PointerEvent): Object3D | null {
    const canvas = this.renderer?.domElement;
    if (!canvas) return null;
    const bounds = canvas.getBoundingClientRect();
    this.pointer.set(
      (event.clientX - bounds.left) / bounds.width * 2 - 1,
      -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersections = this.raycaster.intersectObject(this.bouquet, true);
    for (const intersection of intersections) {
      let object: Object3D | null = intersection.object;
      while (object) {
        if (object.userData['pick']) return object;
        object = object.parent;
      }
    }
    return null;
  }

  private dragMode(event: PointerEvent): BouquetCanvasViewMode {
    if (event.shiftKey || event.button === 1 || event.button === 2) return 'pan';
    return this.viewMode();
  }

  private screenHorizontalDeltaToBouquet(deltaX: number): Vector3 {
    const right = new Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    const inverseBouquetRotation = new Quaternion().copy(this.bouquet.quaternion).invert();
    return right.applyQuaternion(inverseBouquetRotation).multiplyScalar(deltaX);
  }

  private contentBounds(): Box3 {
    const bounds = new Box3().setFromObject(this.bouquetContent);
    if (bounds.isEmpty()) bounds.setFromCenterAndSize(new Vector3(), new Vector3(1, 1, 1));
    bounds.expandByScalar(this.vaseEnabled() ? 24 : 12);
    return bounds;
  }

}
