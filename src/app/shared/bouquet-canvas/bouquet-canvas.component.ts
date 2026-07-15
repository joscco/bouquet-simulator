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
  ACESFilmicToneMapping,
  Box3,
  Box3Helper,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  Curve,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Group,
  HemisphereLight,
  LatheGeometry,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  OrthographicCamera,
  PCFSoftShadowMap,
  PlaneGeometry,
  Raycaster,
  Scene,
  SRGBColorSpace,
  TextureLoader,
  TorusGeometry,
  Quaternion,
  RepeatWrapping,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import {
  BouquetFlower,
  BouquetState,
  FlowerDefinition,
  FlowerNodeGraphic,
} from '../../core/models/flower.models';
import {createBuiltInGeometry} from '../../core/rendering/graphic-geometries';
import {createGraphicPaintTexture} from '../../core/rendering/graphic-paint';
import {graphicOrientationQuaternion} from '../../core/rendering/graphic-orientation';
import {FlowerTree, FlowerTreeEdge, FlowerTreeNode, flattenFlowerTemplates, generateFlowerTree} from '../../core/rendering/flower-tree';
import {cutFlowerTree} from '../../core/rendering/flower-tree-cut';
import {
  DEFAULT_VASE_ID,
  VaseMaterialId,
  normalizedVaseMaterialId,
} from '../../core/data/vases';
import {resolvedStemWidths} from '../../core/models/flower-connections';
import {isFlowerTemplateHighlighted} from '../../core/rendering/flower-highlights';

const EMPTY_OFFSETS: Record<string, {x: number; y: number}> = {};
const FIT_PADDING = 48;
const FIT_MARGIN = 1.08;
const ORBIT_LIMIT = Math.PI * 0.46;
const VASE_BRANCH_CLEARANCE = 34;
const SELECTION_GLOW_COLOR = '#14b8a6';
const SELECTION_GLOW_INTENSITY = 0.48;

interface PickData {
  instanceId: string;
  scale?: number;
}

interface StemRenderEdge {
  edge: FlowerTreeEdge;
  from: FlowerTreeNode;
  to: FlowerTreeNode;
  startWidth: number;
  endWidth: number;
  color: string;
  bend: number;
  curve: number;
  curveRotation: number;
  highlighted: boolean;
  capStart: boolean;
  capEnd: boolean;
}

export type BouquetCanvasViewMode = 'pan' | 'rotate';

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
    rings: [
      {radius: 30, y: -60, tube: 2},
    ],
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
      {radius: 40, y: -43, tube: .7},
      {radius: 40, y: 6, tube: .7},
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
      {radius: 25, y: -42, tube: .9},
      {radius: 18, y: 17, tube: .8},
    ],
  },
};

@Component({
  selector: 'app-bouquet-canvas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {'class': 'relative block w-full h-full min-h-0'},
  template: `
    <div
      #canvasHost
      class="relative block w-full h-full min-h-0 touch-none select-none"
      aria-label="Interaktive 3D-Straußansicht"
      (wheel)="zoomWithWheel($event)"
      (pointerdown)="startZoomGesture($event)"
      (pointermove)="moveZoomGesture($event)"
      (pointerup)="endZoomGesture($event)"
      (pointercancel)="endZoomGesture($event)"
      (contextmenu)="$event.preventDefault()"
    ></div>
  `,
})
export class BouquetCanvasComponent implements AfterViewInit, OnDestroy {
  readonly state = input.required<BouquetState>();
  readonly definitions = input.required<FlowerDefinition[]>();
  readonly selectedId = input<string | null>(null);
  readonly overlappingIds = input<ReadonlySet<string>>(new Set<string>());
  readonly snapshotKey = input<string | null>(null);
  readonly zoom = input(1);
  readonly zoomEnabled = input(false);
  readonly fitToContent = input(false);
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
  private readonly raycaster = new Raycaster();
  private readonly pointer = new Vector2();
  private resizeObserver: ResizeObserver | null = null;
  private rebuildFrame: number | null = null;
  private renderFrame: number | null = null;
  private lastFlowers: BouquetFlower[] | null = null;
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
  private backgroundDrag: {
    pointerId: number;
    x: number;
    y: number;
    mode: BouquetCanvasViewMode;
  } | null = null;
  private sceneCenter = new Vector3();
  private fitBounds = new Box3();
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

  constructor() {
    effect(() => {
      const state = this.state();
      const definitions = this.definitions();
      const selectedId = this.selectedId();
      const overlappingIdsSignature = [...this.overlappingIds()].sort().join('|');
      const snapshotKey = this.snapshotKey();
      const highlightedNodeIdsSignature = [...this.highlightedNodeIds()].sort().join('|');
      const highlightedConnection = this.highlightedConnection();
      const vaseEnabled = this.vaseEnabled();
      const vaseId = state.vaseId ?? DEFAULT_VASE_ID;
      const vaseMaterialId = normalizedVaseMaterialId(state.vaseMaterialId);
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
      const shouldRecenter = definitions !== this.lastDefinitions
        || state.flowers.length !== this.lastFlowerCount
        || geometrySignature !== this.lastGeometrySignature
        || vaseEnabled !== this.lastVaseEnabled
        || vaseId !== this.lastVaseId
        || vaseMaterialId !== this.lastVaseMaterialId;
      const structureChanged = state.flowers !== this.lastFlowers
        || definitions !== this.lastDefinitions
        || selectedId !== this.lastSelectedId
        || overlappingIdsSignature !== this.lastOverlappingIdsSignature
        || highlightedNodeIdsSignature !== this.lastHighlightedNodeIdsSignature
        || highlightedConnection?.sourceId !== this.lastHighlightedConnection?.sourceId
        || highlightedConnection?.index !== this.lastHighlightedConnection?.index
        || vaseEnabled !== this.lastVaseEnabled
        || vaseId !== this.lastVaseId
        || vaseMaterialId !== this.lastVaseMaterialId;

      this.lastFlowers = state.flowers;
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
      if (structureChanged) {
        this.recenterOnNextRebuild ||= shouldRecenter;
        this.requestRebuild();
      }
      if (snapshotKey !== this.emittedSnapshotKey) this.requestRender();
      this.updateView();
    });
  }

  ngAfterViewInit(): void {
    const renderer = new WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: this.snapshotKey() !== null,
    });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
    renderer.domElement.addEventListener('pointermove', this.onPointerMove);
    renderer.domElement.addEventListener('pointerup', this.onPointerUp);
    renderer.domElement.addEventListener('pointercancel', this.onPointerUp);
    this.renderer = renderer;
    this.canvasHost.nativeElement.appendChild(renderer.domElement);

    const hemisphere = new HemisphereLight(0xfff8e8, 0x52645d, 1.45);
    const keyLight = new DirectionalLight(0xfff1d6, 2.75);
    keyLight.position.set(-240, 420, 360);
    keyLight.target.position.set(0, -110, 0);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.left = -430;
    keyLight.shadow.camera.right = 430;
    keyLight.shadow.camera.top = 650;
    keyLight.shadow.camera.bottom = -260;
    keyLight.shadow.camera.near = 30;
    keyLight.shadow.camera.far = 1300;
    keyLight.shadow.camera.updateProjectionMatrix();
    keyLight.shadow.bias = -0.00025;
    keyLight.shadow.normalBias = 0.035;
    const fillLight = new DirectionalLight(0xdbeafe, 0.85);
    fillLight.position.set(340, 180, 280);
    this.scene.add(hemisphere, keyLight, keyLight.target, fillLight, this.bouquet);
    this.camera.position.set(0, 0, 1000);
    this.camera.lookAt(0, 0, 0);

    this.resizeObserver = new ResizeObserver(() => {
      this.resize();
      this.requestRender();
    });
    this.resizeObserver.observe(this.canvasHost.nativeElement);
    this.resize();
    this.rebuildScene();
  }

  ngOnDestroy(): void {
    if (this.rebuildFrame !== null) cancelAnimationFrame(this.rebuildFrame);
    if (this.renderFrame !== null) cancelAnimationFrame(this.renderFrame);
    this.resizeObserver?.disconnect();
    const renderer = this.renderer;
    if (renderer) {
      renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
      renderer.domElement.removeEventListener('pointermove', this.onPointerMove);
      renderer.domElement.removeEventListener('pointerup', this.onPointerUp);
      renderer.domElement.removeEventListener('pointercancel', this.onPointerUp);
    }
    this.disposeChildren(this.bouquet);
    renderer?.dispose();
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
      this.zoomPinchDistance = touchDistance(this.zoomTouches);
    }
  }

  moveZoomGesture(event: PointerEvent): void {
    if (!this.zoomTouches.has(event.pointerId)) return;
    this.zoomTouches.set(event.pointerId, {x: event.clientX, y: event.clientY});
    if (this.zoomTouches.size !== 2) return;
    const distance = touchDistance(this.zoomTouches);
    if (this.zoomPinchDistance) {
      const center = touchCenter(this.zoomTouches);
      this.zoomAround(center.x, center.y, clamp(this.zoom() * distance / this.zoomPinchDistance, 0.35, 3.5));
    }
    this.zoomPinchDistance = distance;
  }

  endZoomGesture(event: PointerEvent): void {
    this.zoomTouches.delete(event.pointerId);
    if (this.zoomTouches.size < 2) this.zoomPinchDistance = null;
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
    this.disposeChildren(this.bouquet);
    this.bouquet.position.set(0, 0, 0);
    this.bouquet.rotation.set(0, 0, 0);
    const definitions = new Map(this.definitions().map((definition) => [definition.id, definition]));

    if (this.vaseEnabled()) {
      this.bouquet.add(this.createVase(
        this.state().vaseId ?? DEFAULT_VASE_ID,
        normalizedVaseMaterialId(this.state().vaseMaterialId),
      ));
    }

    for (const flower of this.state().flowers) {
      const definition = definitions.get(flower.definitionId);
      if (!definition) continue;
      this.bouquet.add(this.createFlower(definition, flower));
    }
    this.bouquet.updateMatrixWorld(true);
    const bounds = this.contentBounds();
    if (this.recenterOnNextRebuild) {
      this.sceneCenter = bounds.getCenter(new Vector3());
      this.fitBounds.copy(bounds);
      this.recenterOnNextRebuild = false;
    }
    this.updateView();
  }

  private createFlower(definition: FlowerDefinition, flower: BouquetFlower): Group {
    const group = new Group();
    group.userData['pick'] = {instanceId: flower.instanceId, scale: flower.scale} satisfies PickData;
    const templates = flattenFlowerTemplates(definition);
    let tree = cutFlowerTree(
      generateFlowerTree(definition, flower.seed, flower.nodeOffsets ?? EMPTY_OFFSETS),
      flower.cutRatio ?? 0,
    );
    if (this.vaseEnabled()) tree = pruneLowerBranches(tree, VASE_BRANCH_CLEARANCE);
    const nodes = new Map(tree.nodes.map((node) => [node.id, node]));
    const graphicPrototypes = new Map<string, Mesh>();
    const outgoingCounts = new Map<string, number>();
    for (const edge of tree.edges) {
      outgoingCounts.set(edge.from, (outgoingCounts.get(edge.from) ?? 0) + 1);
    }
    const stemEdges: StemRenderEdge[] = [];
    const jointWidths = new Map<string, number>();

    for (const edge of tree.edges) {
      const from = nodes.get(edge.from);
      const to = nodes.get(edge.to);
      if (!from || !to) continue;
      const connection = edge.connection;
      const resolvedWidths = resolvedStemWidths(definition, connection, from.depth, to.depth);
      const startWidth = Math.max(1.1, resolvedWidths.startWidth);
      const endWidth = Math.max(1.1, resolvedWidths.endWidth);
      const highlighted = this.highlightedConnection()?.sourceId === edge.connectionSourceId
        && this.highlightedConnection()?.index === edge.connectionIndex;
      const stemColor = connection.stem?.color ?? definition.stem.color;
      const stemCurve = connection.stem?.curve ?? definition.stem.curve ?? 14;
      const stemBend = connection.stem?.bend ?? definition.stem.bend ?? 0;
      const capStart = from.parentId === null;
      const capEnd = (outgoingCounts.get(to.id) ?? 0) === 0;
      stemEdges.push({
        edge,
        from,
        to,
        startWidth,
        endWidth,
        color: stemColor,
        bend: stemBend,
        curve: stemCurve,
        curveRotation: (to.attachmentAzimuth ?? 0) + (to.roll ?? 0) + (to.bendRotation ?? 0),
        highlighted,
        capStart,
        capEnd,
      });
      jointWidths.set(from.id, Math.max(jointWidths.get(from.id) ?? 0, startWidth));
      jointWidths.set(to.id, Math.max(jointWidths.get(to.id) ?? 0, endWidth));
    }
    const jointTangents = createStemJointTangents(stemEdges);

    for (const stemEdge of stemEdges) {
      const startJointWidth = jointWidths.get(stemEdge.from.id) ?? stemEdge.startWidth;
      const endJointWidth = jointWidths.get(stemEdge.to.id) ?? stemEdge.endWidth;
      const stem = this.createStem(
        stemEdge.from,
        stemEdge.to,
        stemEdge.startWidth,
        stemEdge.endWidth,
        startJointWidth,
        endJointWidth,
        stemEdge.color,
        1,
        stemEdge.bend,
        stemEdge.curve,
        stemEdge.curveRotation,
        jointTangents.get(stemEdge.from.id),
        jointTangents.get(stemEdge.to.id),
        stemEdge.capStart,
        stemEdge.capEnd,
      );
      if (stemEdge.highlighted
        || isFlowerTemplateHighlighted(stemEdge.to.templateId, this.highlightedNodeIds())) {
        applySelectionGlow(stem);
      }
      stem.userData['pick'] = {instanceId: flower.instanceId, scale: flower.scale} satisfies PickData;
      group.add(stem);
    }

    for (const node of tree.nodes) {
      const template = templates.get(node.templateId);
      if (!template?.graphic) continue;
      let prototype = graphicPrototypes.get(node.templateId);
      if (!prototype) {
        prototype = this.createGraphic(template.graphic);
        graphicPrototypes.set(node.templateId, prototype);
      }
      const graphic = prototype.clone();
      const orientation = graphicOrientationQuaternion(
        node,
        node.parentId ? nodes.get(node.parentId) : undefined,
        template.graphic,
        flower.seed,
      );
      graphic.quaternion.copy(orientation);
      const graphicOffset = template.graphic.offset ?? {x: 0, y: 0, z: 0};
      graphic.position.copy(treePosition(node)).add(
        new Vector3(graphicOffset.x, graphicOffset.y, graphicOffset.z)
          .applyQuaternion(orientation),
      );
      graphic.scale.setScalar(Math.max(0.01, template.graphic.scale ?? 1));
      graphic.userData['pick'] = {
        instanceId: flower.instanceId,
        scale: flower.scale,
      } satisfies PickData;
      group.add(graphic);
      if (isFlowerTemplateHighlighted(node.templateId, this.highlightedNodeIds())) {
        applySelectionGlow(graphic);
      }
    }

    const overlapping = this.overlappingIds().has(flower.instanceId);
    if (this.selectedId() === flower.instanceId) {
      const bounds = new Box3().setFromObject(group);
      const helper = new Box3Helper(bounds, new Color('#2f6251'));
      const helperMaterial = helper.material as LineBasicMaterial;
      helperMaterial.transparent = true;
      helperMaterial.opacity = 0.58;
      group.add(helper);
    }
    group.traverse((object) => {
      if (object instanceof Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
        if (overlapping) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          for (const material of materials) {
            if (!(material instanceof MeshStandardMaterial)) continue;
            if (!material.userData['editorSelection']) {
              material.emissive.set('#d97706');
              material.emissiveIntensity = 0.18;
            }
          }
        }
      }
    });
    group.rotation.x = flower.leanX ?? 0;
    group.rotation.y = flower.rotationY ?? 0;
    group.rotation.z = flower.leanZ ?? 0;
    group.position.set(flower.x, -flower.y, flower.z);
    group.scale.setScalar(flower.scale);
    return group;
  }

  private createVase(vaseId: string, vaseMaterialId: VaseMaterialId): Group {
    const definition = VASE_RENDER_DEFINITIONS[vaseId] ?? VASE_RENDER_DEFINITIONS[DEFAULT_VASE_ID]!;
    const surface = VASE_MATERIAL_DEFINITIONS[vaseMaterialId];
    const glass = vaseMaterialId === 'glass';
    const vase = new Group();
    const profile = smoothVaseProfile(definition.profile);
    const bodyTexture = createVaseSurfaceTexture(surface.texture);
    const body = new Mesh(
      new LatheGeometry(profile, 144),
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
    const rim = new Mesh(
      new TorusGeometry(definition.rimRadius, definition.rimTube, 18, 144),
      new MeshPhysicalMaterial({
        color: surface.rimColor,
        roughness: glass ? 0.04 : Math.max(0.16, surface.roughness - 0.12),
        metalness: surface.metalness,
        clearcoat: surface.clearcoat ?? 0,
        transmission: surface.transmission ?? 0,
        thickness: glass ? Math.max(2, surface.thickness ?? 0) : 0,
        transparent: glass,
        opacity: glass ? 0.68 : 1,
        depthWrite: !glass,
      }),
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = definition.openingY + 1;
    rim.renderOrder = glass ? 3 : 0;
    vase.add(body, opening, rim);
    for (const ringDefinition of definition.rings ?? []) {
      const ring = new Mesh(
        new TorusGeometry(ringDefinition.radius, ringDefinition.tube, 12, 144),
        new MeshPhysicalMaterial({
          color: surface.rimColor,
          roughness: glass ? 0.06 : surface.roughness,
          metalness: surface.metalness,
          clearcoat: surface.clearcoat ?? 0,
          transmission: surface.transmission ?? 0,
          thickness: glass ? 2 : 0,
          transparent: glass,
          opacity: glass ? 0.5 : 1,
          depthWrite: !glass,
        }),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = ringDefinition.y;
      ring.renderOrder = glass ? 3 : 0;
      vase.add(ring);
    }
    vase.traverse((object) => {
      if (object instanceof Mesh) {
        object.castShadow = !glass;
        object.receiveShadow = !glass;
      }
    });
    return vase;
  }

  private createStem(
    from: FlowerTreeNode,
    to: FlowerTreeNode,
    startWidth: number,
    endWidth: number,
    startJointWidth: number,
    endJointWidth: number,
    color: string,
    opacity: number,
    bend: number,
    curve: number,
    curveRotation: number,
    startTangent: Vector3 | undefined,
    endTangent: Vector3 | undefined,
    capStart: boolean,
    capEnd: boolean,
  ): Mesh {
    const start = treePosition(from);
    const end = treePosition(to);
    const direction = end.clone().sub(start);
    const length = Math.max(0.01, direction.length());
    const bendAmount = clamp(bend, -100, 100) / 100;
    const curveAmount = clamp(curve, 0, 100) / 100;
    const variation = hashUnit(`${from.id}->${to.id}`);
    const stemCurve = createNaturalStemCurve(
      start,
      end,
      bendAmount,
      curveAmount,
      curveRotation,
      variation,
      startTangent,
      endTangent,
    );
    const geometry = createTaperedStemGeometry(
      stemCurve,
      startWidth / 2,
      endWidth / 2,
      startJointWidth / 2,
      endJointWidth / 2,
      Math.max(6, Math.min(24, Math.ceil(length / 8))),
      12,
      capStart,
      capEnd,
    );
    const material = new MeshStandardMaterial({
      color,
      roughness: 0.78,
      transparent: opacity < 1,
      opacity,
      side: DoubleSide,
    });
    return new Mesh(geometry, material);
  }

  private createGraphic(graphic: FlowerNodeGraphic): Mesh {
    const width = Math.max(1, graphic.width);
    const height = Math.max(1, graphic.height);
    const depth = Math.max(0.5, graphic.depth ?? Math.min(width, height) * 0.12);
    const primitive = graphic.primitive ?? 'png';
    let geometry: BufferGeometry;

    if (primitive === 'png' && graphic.png) {
      geometry = new PlaneGeometry(width, height);
      geometry.translate((0.5 - graphic.start.x) * width, (graphic.start.y - 0.5) * height, 0);
      const axis = new Vector2(
        (graphic.end.x - graphic.start.x) * width,
        (graphic.start.y - graphic.end.y) * height,
      );
      geometry.rotateZ(Math.PI / 2 - Math.atan2(axis.y, axis.x));
      const material = new MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        alphaTest: 0.06,
        side: DoubleSide,
      });
      new TextureLoader().load(graphic.png, (texture) => {
        texture.colorSpace = SRGBColorSpace;
        material.map = texture;
        material.needsUpdate = true;
        this.requestRender();
      });
      return new Mesh(geometry, material);
    } else {
      geometry = createBuiltInGeometry(
        primitive,
        width,
        height,
        depth,
        graphic.bendMain,
        graphic.bendCross,
        graphic.bendMainProfile,
        graphic.bendCrossProfile,
      );
    }

    const material = new MeshStandardMaterial({
      color: graphic.color ?? '#5b8d53',
      roughness: 0.72,
      side: DoubleSide,
    });
    if (graphic.patterns?.length || graphic.paint?.length) {
      material.color.set(0xffffff);
      material.map = createGraphicPaintTexture(graphic);
    }
    return new Mesh(geometry, material);
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
    renderer.setSize(Math.max(1, host.clientWidth), Math.max(1, host.clientHeight));
    this.resizeCamera();
  }

  private resizeCamera(): void {
    if (!this.renderer) return;
    const host = this.canvasHost.nativeElement;
    this.camera.near = 0.1;
    this.camera.far = 2400;
    const elevation = clamp(0.08 + this.orbitPitch(), -ORBIT_LIMIT, ORBIT_LIMIT);
    const distance = 1000;
    this.camera.position.set(0, Math.sin(elevation) * distance, Math.cos(elevation) * distance);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateMatrixWorld();

    const zoom = this.effectiveZoom();
    this.camera.left = -host.clientWidth / 2 / zoom;
    this.camera.right = host.clientWidth / 2 / zoom;
    this.camera.top = host.clientHeight / 2 / zoom;
    this.camera.bottom = -host.clientHeight / 2 / zoom;
    this.camera.updateProjectionMatrix();
    const offset = this.viewOffset();
    const center = this.sceneCenter.clone().applyQuaternion(this.bouquet.quaternion);
    const insets = this.resolvedInsets();
    const viewportCenter = this.screenOffset(
      (insets.left - insets.right) / 2 / zoom,
      (insets.bottom - insets.top) / 2 / zoom,
    );
    this.bouquet.position
      .copy(center.negate())
      .add(viewportCenter)
      .add(this.screenOffset(offset.x, offset.y));
  }

  private effectiveZoom(userZoom = this.zoom()): number {
    return Math.max(0.01, this.fitZoom() * userZoom);
  }

  private fitZoom(): number {
    const host = this.canvasHost.nativeElement;
    if (!this.fitToContent() || this.fitBounds.isEmpty() || !host.clientWidth || !host.clientHeight) return 1;

    const projectedSize = this.projectedFitSize();
    const insets = this.resolvedInsets();
    const visibleWidth = Math.max(1, host.clientWidth - insets.left - insets.right);
    const visibleHeight = Math.max(1, host.clientHeight - insets.top - insets.bottom);
    const horizontalPadding = Math.min(FIT_PADDING, visibleWidth * 0.08);
    const verticalPadding = Math.min(FIT_PADDING, visibleHeight * 0.08);
    const availableWidth = Math.max(120, visibleWidth - horizontalPadding * 2);
    const availableHeight = Math.max(120, visibleHeight - verticalPadding * 2);
    return clamp(Math.min(
      availableWidth / Math.max(1, projectedSize.width * FIT_MARGIN),
      availableHeight / Math.max(1, projectedSize.height * FIT_MARGIN),
    ), 0.08, 4);
  }

  private projectedFitSize(): {width: number; height: number} {
    const right = new Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    const up = new Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
    const point = new Vector3();
    let minimumX = Number.POSITIVE_INFINITY;
    let maximumX = Number.NEGATIVE_INFINITY;
    let minimumY = Number.POSITIVE_INFINITY;
    let maximumY = Number.NEGATIVE_INFINITY;

    for (const x of [this.fitBounds.min.x, this.fitBounds.max.x]) {
      for (const y of [this.fitBounds.min.y, this.fitBounds.max.y]) {
        for (const z of [this.fitBounds.min.z, this.fitBounds.max.z]) {
          point.set(x, y, z).applyQuaternion(this.bouquet.quaternion);
          const projectedX = point.dot(right);
          const projectedY = point.dot(up);
          minimumX = Math.min(minimumX, projectedX);
          maximumX = Math.max(maximumX, projectedX);
          minimumY = Math.min(minimumY, projectedY);
          maximumY = Math.max(maximumY, projectedY);
        }
      }
    }

    return {
      width: maximumX - minimumX,
      height: maximumY - minimumY,
    };
  }

  private resolvedInsets(): {left: number; right: number; top: number; bottom: number} {
    const host = this.canvasHost.nativeElement;
    const insets = this.viewportInsets();
    return {
      left: clamp(insets.left, 0, Math.max(0, host.clientWidth - 1)),
      right: clamp(insets.right, 0, Math.max(0, host.clientWidth - 1)),
      top: clamp(insets.top, 0, Math.max(0, host.clientHeight - 1)),
      bottom: clamp(insets.bottom, 0, Math.max(0, host.clientHeight - 1)),
    };
  }

  private screenOffset(x: number, y: number): Vector3 {
    const right = new Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion).multiplyScalar(x);
    const up = new Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion).multiplyScalar(y);
    return right.add(up);
  }

  private zoomAround(clientX: number, clientY: number, nextUserZoom: number): void {
    const previousEffectiveZoom = this.effectiveZoom();
    const nextEffectiveZoom = this.effectiveZoom(nextUserZoom);
    if (Math.abs(nextUserZoom - this.zoom()) < 0.0001) return;

    const host = this.canvasHost.nativeElement.getBoundingClientRect();
    const insets = this.resolvedInsets();
    const visibleCenterX = host.left + (insets.left + host.width - insets.right) / 2;
    const visibleCenterY = host.top + (insets.top + host.height - insets.bottom) / 2;
    const anchorX = clientX - visibleCenterX;
    const anchorY = visibleCenterY - clientY;
    this.viewPan.emit({
      dx: anchorX * (1 / nextEffectiveZoom - 1 / previousEffectiveZoom),
      dy: anchorY * (1 / nextEffectiveZoom - 1 / previousEffectiveZoom),
    });
    this.zoomChange.emit(nextUserZoom);
  }

  private requestRender(): void {
    if (!this.renderer || this.renderFrame !== null) return;
    this.renderFrame = requestAnimationFrame(() => {
      this.renderFrame = null;
      this.renderer?.render(this.scene, this.camera);
      const snapshotKey = this.snapshotKey();
      if (snapshotKey && snapshotKey !== this.emittedSnapshotKey && this.renderer) {
        this.emittedSnapshotKey = snapshotKey;
        this.snapshotReady.emit({
          key: snapshotKey,
          dataUrl: this.renderer.domElement.toDataURL('image/webp', 0.86),
        });
      }
    });
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (![0, 1, 2].includes(event.button) && event.pointerType !== 'touch') return;
    const pick = this.pick(event);
    const data = pick?.userData['pick'] as PickData | undefined;
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
    const bounds = new Box3().setFromObject(this.bouquet);
    if (bounds.isEmpty()) bounds.setFromCenterAndSize(new Vector3(), new Vector3(1, 1, 1));
    bounds.expandByScalar(this.vaseEnabled() ? 24 : 12);
    return bounds;
  }

  private disposeChildren(group: Group): void {
    const geometries = new Set<BufferGeometry>();
    const materials = new Set<MeshStandardMaterial | LineBasicMaterial>();
    group.traverse((object) => {
      if (object instanceof Mesh || object instanceof LineSegments) {
        geometries.add(object.geometry);
        const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of objectMaterials) materials.add(material as MeshStandardMaterial | LineBasicMaterial);
      }
    });
    group.clear();
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) {
      if (material instanceof MeshStandardMaterial) material.map?.dispose();
      material.dispose();
    }
  }
}

function treePosition(node: FlowerTreeNode): Vector3 {
  return new Vector3(node.x, -node.y, node.z);
}

function applySelectionGlow(mesh: Mesh): void {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (const material of materials) {
    if (!(material instanceof MeshStandardMaterial)) continue;
    material.emissive.set(SELECTION_GLOW_COLOR);
    material.emissiveIntensity = SELECTION_GLOW_INTENSITY;
    material.userData['editorSelection'] = true;
  }
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
    const alpha = textureType === 'speckled'
      ? 0.1 + random() * 0.22
      : 0.025 + random() * 0.09;
    const shade = textureType === 'speckled'
      ? 45 + Math.floor(random() * 65)
      : 70 + Math.floor(random() * 120);
    const radius = textureType === 'speckled'
      ? 0.45 + random() * 1.35
      : 0.25 + random() * 0.7;
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

function createNaturalStemCurve(
  start: Vector3,
  end: Vector3,
  bendAmount: number,
  curveAmount: number,
  curveRotation: number,
  variation: number,
  startTangent?: Vector3,
  endTangent?: Vector3,
): Curve<Vector3> {
  const direction = end.clone().sub(start);
  const length = Math.max(0.01, direction.length());
  const tangent = direction.clone().normalize();
  const axis = Math.abs(tangent.dot(new Vector3(0, 0, 1))) > 0.94
    ? new Vector3(1, 0, 0)
    : new Vector3(0, 0, 1);
  const twist = curveRotation
    + (variation - 0.5) * Math.PI * 0.82 * Math.max(0.2, curveAmount);
  const side = tangent.clone().cross(axis).normalize().applyAxisAngle(tangent, twist);
  const lift = side.clone().cross(tangent).normalize();
  const bendScale = 0.78 + variation * 0.42;
  const organicBias = (variation - 0.5) * 0.18 * curveAmount;
  const effectiveBend = bendAmount * bendScale + organicBias;
  return new NaturalStemCurve(
    start,
    end,
    normalizedTangent(startTangent, tangent),
    normalizedTangent(endTangent, tangent),
    side,
    lift,
    effectiveBend,
    curveAmount,
    variation,
  );
}

function createTaperedStemGeometry(
  curve: Curve<Vector3>,
  startRadius: number,
  endRadius: number,
  startJointRadius: number,
  endJointRadius: number,
  lengthSegments: number,
  radialSegments: number,
  capStart: boolean,
  capEnd: boolean,
): BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const startFrameNormal = initialStemNormal(curve.getTangent(0).normalize());
  const endFrameNormal = initialStemNormal(curve.getTangent(1).normalize());
  if (startFrameNormal.dot(endFrameNormal) < 0) endFrameNormal.multiplyScalar(-1);

  for (let ring = 0; ring <= lengthSegments; ring++) {
    const t = ring / lengthSegments;
    const center = curve.getPoint(t);
    const tangent = curve.getTangent(t).normalize();
    const referenceNormal = startFrameNormal.clone().lerp(endFrameNormal, t);
    const projectedNormal = referenceNormal.sub(tangent.clone().multiplyScalar(referenceNormal.dot(tangent)));
    const normal = projectedNormal.lengthSq() > 1e-6
      ? projectedNormal.normalize()
      : initialStemNormal(tangent);
    const binormal = tangent.clone().cross(normal).normalize();
    const baseRadius = lerp(startRadius, endRadius, t);
    const startBlend = smoothEndpointBlend(1 - t / 0.22);
    const endBlend = smoothEndpointBlend(1 - (1 - t) / 0.22);
    const jointRadius = Math.max(
      baseRadius,
      startJointRadius * startBlend,
      endJointRadius * endBlend,
    );
    const radius = Math.max(0.05, jointRadius);

    for (let segment = 0; segment < radialSegments; segment++) {
      const angle = segment / radialSegments * Math.PI * 2;
      const radial = normal.clone().multiplyScalar(Math.cos(angle))
        .add(binormal.clone().multiplyScalar(Math.sin(angle)))
        .normalize();
      const point = center.clone().add(radial.clone().multiplyScalar(radius));
      positions.push(point.x, point.y, point.z);
      normals.push(radial.x, radial.y, radial.z);
    }
  }

  for (let ring = 0; ring < lengthSegments; ring++) {
    const current = ring * radialSegments;
    const next = (ring + 1) * radialSegments;
    for (let segment = 0; segment < radialSegments; segment++) {
      const a = current + segment;
      const b = current + (segment + 1) % radialSegments;
      const c = next + segment;
      const d = next + (segment + 1) % radialSegments;
      indices.push(a, c, b, b, c, d);
    }
  }

  if (capStart) {
    const startCenter = positions.length / 3;
    const startPoint = curve.getPoint(0);
    positions.push(startPoint.x, startPoint.y, startPoint.z);
    const startTangent = curve.getTangent(0).normalize().multiplyScalar(-1);
    normals.push(startTangent.x, startTangent.y, startTangent.z);
    for (let segment = 0; segment < radialSegments; segment++) {
      indices.push(startCenter, (segment + 1) % radialSegments, segment);
    }
  }

  if (capEnd) {
    const endCenter = positions.length / 3;
    const endPoint = curve.getPoint(1);
    positions.push(endPoint.x, endPoint.y, endPoint.z);
    const endTangent = curve.getTangent(1).normalize();
    normals.push(endTangent.x, endTangent.y, endTangent.z);
    const endRing = lengthSegments * radialSegments;
    for (let segment = 0; segment < radialSegments; segment++) {
      indices.push(endCenter, endRing + segment, endRing + (segment + 1) % radialSegments);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3));
  geometry.setIndex(indices);
  return geometry;
}

class NaturalStemCurve extends Curve<Vector3> {
  private readonly length: number;

  constructor(
    private readonly start: Vector3,
    private readonly end: Vector3,
    private readonly startTangent: Vector3,
    private readonly endTangent: Vector3,
    private readonly side: Vector3,
    private readonly lift: Vector3,
    private readonly bend: number,
    private readonly curveAmount: number,
    private readonly variation: number,
  ) {
    super();
    this.length = Math.max(0.01, start.distanceTo(end));
  }

  override getPoint(t: number, target = new Vector3()): Vector3 {
    const t2 = t * t;
    const t3 = t2 * t;
    const tangentScale = this.length * (0.56 + this.curveAmount * 0.16);
    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;
    target
      .copy(this.start).multiplyScalar(h00)
      .addScaledVector(this.startTangent, h10 * tangentScale)
      .addScaledVector(this.end, h01)
      .addScaledVector(this.endTangent, h11 * tangentScale);

    // This offset has a zero derivative at both ends, so adjacent stems retain
    // their shared tangent while each segment still gets an individual shape.
    const envelope = 16 * t2 * (1 - t) * (1 - t);
    const asymmetry = (t - 0.5) * (0.7 + this.variation * 0.6);
    const sideOffset = this.length * envelope
      * (0.13 * this.bend + 0.035 * this.curveAmount * asymmetry);
    const liftDirection = this.variation < 0.5 ? -1 : 1;
    const liftOffset = this.length * envelope * this.curveAmount
      * (0.018 * liftDirection + 0.018 * asymmetry);
    return target
      .addScaledVector(this.side, sideOffset)
      .addScaledVector(this.lift, liftOffset);
  }
}

function createStemJointTangents(edges: StemRenderEdge[]): Map<string, Vector3> {
  const incoming = new Map<string, Vector3>();
  const outgoing = new Map<string, Vector3[]>();
  for (const edge of edges) {
    const direction = treePosition(edge.to).sub(treePosition(edge.from)).normalize();
    incoming.set(edge.to.id, direction);
    const directions = outgoing.get(edge.from.id) ?? [];
    directions.push(direction);
    outgoing.set(edge.from.id, directions);
  }

  const nodeIds = new Set([...incoming.keys(), ...outgoing.keys()]);
  const tangents = new Map<string, Vector3>();
  for (const nodeId of nodeIds) {
    const incomingDirection = incoming.get(nodeId);
    const outgoingDirections = outgoing.get(nodeId) ?? [];
    if (!incomingDirection) {
      if (outgoingDirections.length) tangents.set(nodeId, outgoingDirections[0].clone());
      continue;
    }
    if (!outgoingDirections.length) {
      tangents.set(nodeId, incomingDirection.clone());
      continue;
    }
    const continuation = outgoingDirections.reduce((best, candidate) =>
      candidate.dot(incomingDirection) > best.dot(incomingDirection) ? candidate : best);
    const blended = incomingDirection.clone().add(continuation);
    tangents.set(nodeId, blended.lengthSq() > 1e-6 ? blended.normalize() : incomingDirection.clone());
  }
  return tangents;
}

function normalizedTangent(candidate: Vector3 | undefined, fallback: Vector3): Vector3 {
  return candidate?.lengthSq() ? candidate.clone().normalize() : fallback.clone();
}

function initialStemNormal(tangent: Vector3): Vector3 {
  const axis = Math.abs(tangent.dot(new Vector3(0, 0, 1))) > 0.94
    ? new Vector3(1, 0, 0)
    : new Vector3(0, 0, 1);
  return tangent.clone().cross(axis).normalize();
}

function smoothEndpointBlend(value: number): number {
  const clamped = clamp(value, 0, 1);
  return clamped * clamped * (3 - 2 * clamped);
}

function hashUnit(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 10000) / 10000;
}

function nodeDistance(from: FlowerTreeNode, to: FlowerTreeNode): number {
  return Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z);
}

function pruneLowerBranches(tree: FlowerTree, clearance: number): FlowerTree {
  const nodes = new Map(tree.nodes.map((node) => [node.id, node]));
  const childEdges = new Map<string, FlowerTreeEdge[]>();
  for (const edge of tree.edges) {
    childEdges.set(edge.from, [...(childEdges.get(edge.from) ?? []), edge]);
  }

  const mainPathEdges = new Set<string>();
  let currentId = tree.rootId;
  let distanceFromRoot = 0;
  const rootDistances = new Map<string, number>([[tree.rootId, 0]]);
  while (true) {
    const edge = longestChildEdge(currentId);
    if (!edge) break;
    const from = nodes.get(edge.from);
    const to = nodes.get(edge.to);
    if (!from || !to) break;
    mainPathEdges.add(edgeKey(edge));
    distanceFromRoot += nodeDistance(from, to);
    rootDistances.set(edge.to, distanceFromRoot);
    currentId = edge.to;
  }

  const keptIds = new Set<string>([tree.rootId]);
  const visit = (nodeId: string, distance: number): void => {
    for (const edge of childEdges.get(nodeId) ?? []) {
      const from = nodes.get(edge.from);
      const to = nodes.get(edge.to);
      if (!from || !to) continue;
      const isMainPath = mainPathEdges.has(edgeKey(edge));
      if (!isMainPath && distance < clearance) continue;
      const nextDistance = isMainPath
        ? (rootDistances.get(edge.to) ?? distance + nodeDistance(from, to))
        : distance + nodeDistance(from, to);
      keptIds.add(edge.to);
      visit(edge.to, nextDistance);
    }
  };
  visit(tree.rootId, 0);

  return {
    rootId: tree.rootId,
    nodes: tree.nodes.filter((node) => keptIds.has(node.id)),
    edges: tree.edges.filter((edge) => keptIds.has(edge.from) && keptIds.has(edge.to)),
  };

  function longestChildEdge(nodeId: string): FlowerTreeEdge | null {
    let best: FlowerTreeEdge | null = null;
    let bestLength = -1;
    for (const edge of childEdges.get(nodeId) ?? []) {
      const from = nodes.get(edge.from);
      const to = nodes.get(edge.to);
      if (!from || !to) continue;
      const length = nodeDistance(from, to) + longestFrom(edge.to);
      if (length > bestLength) {
        best = edge;
        bestLength = length;
      }
    }
    return best;
  }

  function longestFrom(nodeId: string): number {
    return Math.max(0, ...(childEdges.get(nodeId) ?? []).map((edge) => {
      const from = nodes.get(edge.from);
      const to = nodes.get(edge.to);
      return from && to ? nodeDistance(from, to) + longestFrom(edge.to) : 0;
    }));
  }
}

function edgeKey(edge: FlowerTreeEdge): string {
  return `${edge.from}->${edge.to}:${edge.connectionSourceId}:${edge.connectionIndex}`;
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

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * amount;
}

function touchDistance(touches: Map<number, {x: number; y: number}>): number {
  const [first, second] = [...touches.values()];
  return Math.hypot(second!.x - first!.x, second!.y - first!.y);
}

function touchCenter(touches: Map<number, {x: number; y: number}>): {x: number; y: number} {
  const [first, second] = [...touches.values()];
  return {
    x: (first!.x + second!.x) / 2,
    y: (first!.y + second!.y) / 2,
  };
}
