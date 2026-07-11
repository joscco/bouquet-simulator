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
  BufferGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  EdgesGeometry,
  Group,
  HemisphereLight,
  LatheGeometry,
  LineBasicMaterial,
  LineSegments,
  Mesh,
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
import {effectiveConnection} from '../../core/models/flower-connections';
import {createBuiltInGeometry} from '../../core/rendering/graphic-geometries';
import {createGraphicPaintTexture} from '../../core/rendering/graphic-paint';
import {graphicOrientationQuaternion} from '../../core/rendering/graphic-orientation';
import {FlowerTreeNode, generateFlowerTree} from '../../core/rendering/flower-tree';
import {viewDeltaToWorld} from '../../core/rendering/projection';

const UP = new Vector3(0, 1, 0);
const EMPTY_OFFSETS: Record<string, {x: number; y: number}> = {};

interface PickData {
  instanceId: string;
  scale?: number;
}

@Component({
  selector: 'app-bouquet-canvas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {'class': 'bouquet-canvas-host'},
  template: `
    <div
      #canvasHost
      class="canvas-mount"
      aria-label="Interaktive 3D-Straußansicht"
      (wheel)="zoomWithWheel($event)"
      (pointerdown)="startZoomGesture($event)"
      (pointermove)="moveZoomGesture($event)"
      (pointerup)="endZoomGesture($event)"
      (pointercancel)="endZoomGesture($event)"
    ></div>
  `,
})
export class BouquetCanvasComponent implements AfterViewInit, OnDestroy {
  readonly state = input.required<BouquetState>();
  readonly definitions = input.required<FlowerDefinition[]>();
  readonly selectedId = input<string | null>(null);
  readonly zoom = input(1);
  readonly zoomEnabled = input(false);
  readonly orbitEnabled = input(false);
  readonly orbitPitch = input(0);
  readonly flowerMoveEnabled = input(false);
  readonly vaseEnabled = input(false);
  readonly highlightedNodeId = input<string | null>(null);
  readonly highlightedConnection = input<{sourceId: string; index: number} | null>(null);

  @Output() readonly flowerDrag = new EventEmitter<{
    instanceId: string;
    dx: number;
    dy: number;
    dz: number;
  }>();
  @Output() readonly rotateDrag = new EventEmitter<number>();
  @Output() readonly orbitDrag = new EventEmitter<{yaw: number; pitch: number}>();
  @Output() readonly selectionChange = new EventEmitter<string | null>();
  @Output() readonly zoomChange = new EventEmitter<number>();

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
  private lastSelectedId: string | null = null;
  private lastHighlightedNodeId: string | null = null;
  private lastHighlightedConnection: {sourceId: string; index: number} | null = null;
  private lastVaseEnabled: boolean | null = null;
  private backgroundDrag: {pointerId: number; x: number; y: number} | null = null;
  private flowerDragState: {
    pointerId: number;
    instanceId: string;
    x: number;
    y: number;
    scale: number;
    rotation: number;
  } | null = null;
  private readonly zoomTouches = new Map<number, {x: number; y: number}>();
  private zoomPinchDistance: number | null = null;

  constructor() {
    effect(() => {
      const state = this.state();
      const definitions = this.definitions();
      const selectedId = this.selectedId();
      const highlightedNodeId = this.highlightedNodeId();
      const highlightedConnection = this.highlightedConnection();
      const vaseEnabled = this.vaseEnabled();
      const structureChanged = state.flowers !== this.lastFlowers
        || definitions !== this.lastDefinitions
        || selectedId !== this.lastSelectedId
        || highlightedNodeId !== this.lastHighlightedNodeId
        || highlightedConnection?.sourceId !== this.lastHighlightedConnection?.sourceId
        || highlightedConnection?.index !== this.lastHighlightedConnection?.index
        || vaseEnabled !== this.lastVaseEnabled;

      this.lastFlowers = state.flowers;
      this.lastDefinitions = definitions;
      this.lastSelectedId = selectedId;
      this.lastHighlightedNodeId = highlightedNodeId;
      this.lastHighlightedConnection = highlightedConnection;
      this.lastVaseEnabled = vaseEnabled;
      if (structureChanged) this.requestRebuild();
      this.updateView();
    });
  }

  ngAfterViewInit(): void {
    const renderer = new WebGLRenderer({alpha: true, antialias: true, powerPreference: 'high-performance'});
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);
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
    this.zoomChange.emit(clamp(this.zoom() * Math.exp(-event.deltaY * 0.0015), 0.6, 1.8));
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
      this.zoomChange.emit(clamp(this.zoom() * distance / this.zoomPinchDistance, 0.6, 1.8));
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
    const definitions = new Map(this.definitions().map((definition) => [definition.id, definition]));

    const ground = new Mesh(
      new PlaneGeometry(720, 520),
      new MeshStandardMaterial({
        color: 0xe4e0d7,
        roughness: 1,
        transparent: true,
        opacity: 0.42,
      }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, this.vaseEnabled() ? -61 : -2, -50);
    ground.receiveShadow = true;
    this.bouquet.add(ground);
    if (this.vaseEnabled()) this.bouquet.add(this.createVase());

    for (const flower of this.state().flowers) {
      const definition = definitions.get(flower.definitionId);
      if (!definition) continue;
      this.bouquet.add(this.createFlower(definition, flower));
    }
    this.updateView();
  }

  private createFlower(definition: FlowerDefinition, flower: BouquetFlower): Group {
    const group = new Group();
    group.userData['pick'] = {instanceId: flower.instanceId, scale: flower.scale} satisfies PickData;
    const templates = new Map(definition.nodes.map((node) => [node.id, node]));
    const tree = generateFlowerTree(definition, flower.seed, flower.nodeOffsets ?? EMPTY_OFFSETS);
    const nodes = new Map(tree.nodes.map((node) => [node.id, node]));
    const graphicPrototypes = new Map<string, Mesh>();

    for (const edge of tree.edges) {
      const from = nodes.get(edge.from);
      const to = nodes.get(edge.to);
      if (!from || !to) continue;
      const legacyConnection = templates.get(edge.connectionSourceId)?.connections[edge.connectionIndex];
      const connection = legacyConnection
        ? effectiveConnection(definition, legacyConnection)
        : undefined;
      const baseWidth = connection?.stem?.width ?? definition.stem.width;
      const startWidth = Math.max(1.1, baseWidth * Math.max(0.18, definition.stem.taper ** from.depth));
      const endWidth = Math.max(1.1, baseWidth * Math.max(0.18, definition.stem.taper ** to.depth));
      const highlighted = this.highlightedConnection()?.sourceId === edge.connectionSourceId
        && this.highlightedConnection()?.index === edge.connectionIndex;
      if (highlighted) {
        group.add(this.createStem(from, to, startWidth + 3, endWidth + 3, '#eab308', 0.72));
      }
      const stem = this.createStem(
        from,
        to,
        startWidth,
        endWidth,
        connection?.stem?.color ?? definition.stem.color,
        1,
      );
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
      if (node.templateId === this.highlightedNodeId()) this.addGraphicOutline(group, graphic);
    }

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
      }
    });
    group.rotation.x = flower.leanX ?? 0;
    group.rotation.z = flower.leanZ ?? 0;
    group.position.set(flower.x, -flower.y, flower.z);
    group.scale.setScalar(flower.scale);
    return group;
  }

  private createVase(): Group {
    const vase = new Group();
    const profile = [
      new Vector2(0, -60),
      new Vector2(42, -60),
      new Vector2(55, -49),
      new Vector2(58, -24),
      new Vector2(47, 12),
      new Vector2(44, 18),
    ];
    const body = new Mesh(
      new LatheGeometry(profile, 48),
      new MeshStandardMaterial({
        color: 0xcbd5cf,
        roughness: 0.3,
        metalness: 0.06,
      }),
    );
    const opening = new Mesh(
      new CylinderGeometry(42, 42, 2.5, 48),
      new MeshStandardMaterial({color: 0x3f514b, roughness: 0.9}),
    );
    opening.position.y = 17;
    const rim = new Mesh(
      new TorusGeometry(45, 3, 10, 48),
      new MeshStandardMaterial({
        color: 0xe7ece8,
        roughness: 0.24,
        metalness: 0.08,
      }),
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 18;
    vase.add(body, opening, rim);
    vase.traverse((object) => {
      if (object instanceof Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
    return vase;
  }

  private createStem(
    from: FlowerTreeNode,
    to: FlowerTreeNode,
    startWidth: number,
    endWidth: number,
    color: string,
    opacity: number,
  ): Mesh {
    const start = treePosition(from);
    const end = treePosition(to);
    const direction = end.clone().sub(start);
    const length = Math.max(0.01, direction.length());
    const geometry = new CylinderGeometry(endWidth / 2, startWidth / 2, length, 7, 1, false);
    const material = new MeshStandardMaterial({
      color,
      roughness: 0.78,
      transparent: opacity < 1,
      opacity,
      side: DoubleSide,
    });
    const stem = new Mesh(geometry, material);
    stem.position.copy(start).add(end).multiplyScalar(0.5);
    stem.quaternion.setFromUnitVectors(UP, direction.normalize());
    return stem;
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
      );
    }

    const material = new MeshStandardMaterial({
      color: graphic.color ?? '#5b8d53',
      roughness: 0.72,
      side: DoubleSide,
    });
    if (graphic.paint?.length) {
      material.color.set(0xffffff);
      material.map = createGraphicPaintTexture(graphic);
    }
    return new Mesh(geometry, material);
  }

  private addGraphicOutline(group: Group, graphic: Mesh): void {
    const outline = new LineSegments(
      new EdgesGeometry(graphic.geometry, 28),
      new LineBasicMaterial({color: 0xeab308, transparent: true, opacity: 0.75}),
    );
    outline.position.copy(graphic.position);
    outline.quaternion.copy(graphic.quaternion);
    outline.scale.copy(graphic.scale).multiplyScalar(1.045);
    group.add(outline);
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
    renderer.setSize(Math.max(1, host.clientWidth), Math.max(1, host.clientHeight), false);
    this.resizeCamera();
  }

  private resizeCamera(): void {
    if (!this.renderer) return;
    const host = this.canvasHost.nativeElement;
    const zoom = Math.max(0.01, this.zoom());
    this.camera.left = -host.clientWidth / 2 / zoom;
    this.camera.right = host.clientWidth / 2 / zoom;
    this.camera.top = host.clientHeight / 2 / zoom;
    this.camera.bottom = -host.clientHeight / 2 / zoom;
    this.camera.near = 0.1;
    this.camera.far = 2400;
    const elevation = clamp(0.08 + this.orbitPitch(), -0.34, 0.58);
    const distance = 1000;
    this.camera.position.set(0, Math.sin(elevation) * distance, Math.cos(elevation) * distance);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
    this.bouquet.position.y = -host.clientHeight / 2 / zoom + 72;
  }

  private requestRender(): void {
    if (!this.renderer || this.renderFrame !== null) return;
    this.renderFrame = requestAnimationFrame(() => {
      this.renderFrame = null;
      this.renderer?.render(this.scene, this.camera);
    });
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 && event.pointerType !== 'touch') return;
    const pick = this.pick(event);
    const data = pick?.userData['pick'] as PickData | undefined;
    if (data) {
      event.stopPropagation();
      this.selectionChange.emit(data.instanceId);
      if (this.flowerMoveEnabled()) {
        this.flowerDragState = {
          pointerId: event.pointerId,
          instanceId: data.instanceId,
          x: event.clientX,
          y: event.clientY,
          scale: Math.max(0.01, (data.scale ?? 1) * this.zoom()),
          rotation: this.state().rotation,
        };
      } else {
        this.backgroundDrag = {pointerId: event.pointerId, x: event.clientX, y: event.clientY};
      }
    } else {
      this.selectionChange.emit(null);
      this.backgroundDrag = {pointerId: event.pointerId, x: event.clientX, y: event.clientY};
    }
    this.renderer?.domElement.setPointerCapture(event.pointerId);
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (this.flowerDragState?.pointerId === event.pointerId) {
      const drag = this.flowerDragState;
      const dx = (event.clientX - drag.x) / drag.scale;
      const dy = (event.clientY - drag.y) / drag.scale;
      const world = viewDeltaToWorld(dx, drag.rotation);
      drag.x = event.clientX;
      drag.y = event.clientY;
      this.flowerDrag.emit({
        instanceId: drag.instanceId,
        dx: world.x,
        dy,
        dz: world.z,
      });
      return;
    }
    if (!this.backgroundDrag || this.backgroundDrag.pointerId !== event.pointerId) return;
    const dx = event.clientX - this.backgroundDrag.x;
    const dy = event.clientY - this.backgroundDrag.y;
    this.backgroundDrag.x = event.clientX;
    this.backgroundDrag.y = event.clientY;
    if (this.orbitEnabled()) {
      this.orbitDrag.emit({yaw: dx * 0.008, pitch: dy * 0.008});
    } else {
      this.rotateDrag.emit(dx * 0.008);
    }
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (this.flowerDragState?.pointerId === event.pointerId) this.flowerDragState = null;
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
    return intersections.find((intersection) => intersection.object.userData['pick'])?.object ?? null;
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

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function touchDistance(touches: Map<number, {x: number; y: number}>): number {
  const [first, second] = [...touches.values()];
  return Math.hypot(second!.x - first!.x, second!.y - first!.y);
}
