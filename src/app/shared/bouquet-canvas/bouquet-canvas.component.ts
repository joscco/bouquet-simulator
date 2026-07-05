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
  AmbientLight,
  Box3,
  Box3Helper,
  BufferGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  EdgesGeometry,
  ExtrudeGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  OrthographicCamera,
  PlaneGeometry,
  Quaternion,
  Raycaster,
  Scene,
  Shape,
  SphereGeometry,
  SRGBColorSpace,
  TextureLoader,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import {
  BouquetFlower,
  BouquetState,
  FlowerDefinition,
  FlowerNodeDefinition,
  FlowerNodeGraphic,
} from '../../core/models/flower.models';
import {FlowerTreeNode, generateFlowerTree} from '../../core/rendering/flower-tree';
import {viewDeltaToLocalOffset} from '../../core/rendering/projection';

const UP = new Vector3(0, 1, 0);
const EMPTY_OFFSETS: Record<string, {x: number; y: number}> = {};

interface PickData {
  instanceId: string;
  nodeId?: string;
  draggable?: boolean;
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
  readonly highlightedNodeId = input<string | null>(null);
  readonly highlightedConnection = input<{sourceId: string; index: number} | null>(null);

  @Output() readonly nodeDrag = new EventEmitter<{instanceId: string; nodeId: string; dx: number; dy: number}>();
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
  private backgroundDrag: {pointerId: number; x: number; y: number} | null = null;
  private nodeDragState: {
    pointerId: number;
    instanceId: string;
    nodeId: string;
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
      const structureChanged = state.flowers !== this.lastFlowers
        || definitions !== this.lastDefinitions
        || selectedId !== this.lastSelectedId
        || highlightedNodeId !== this.lastHighlightedNodeId
        || highlightedConnection?.sourceId !== this.lastHighlightedConnection?.sourceId
        || highlightedConnection?.index !== this.lastHighlightedConnection?.index;

      this.lastFlowers = state.flowers;
      this.lastDefinitions = definitions;
      this.lastSelectedId = selectedId;
      this.lastHighlightedNodeId = highlightedNodeId;
      this.lastHighlightedConnection = highlightedConnection;
      if (structureChanged) this.requestRebuild();
      this.updateView();
    });
  }

  ngAfterViewInit(): void {
    const renderer = new WebGLRenderer({alpha: true, antialias: true, powerPreference: 'high-performance'});
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
    renderer.domElement.addEventListener('pointermove', this.onPointerMove);
    renderer.domElement.addEventListener('pointerup', this.onPointerUp);
    renderer.domElement.addEventListener('pointercancel', this.onPointerUp);
    this.renderer = renderer;
    this.canvasHost.nativeElement.appendChild(renderer.domElement);

    this.scene.add(new AmbientLight(0xffffff, 1.65));
    const light = new DirectionalLight(0xffffff, 1.8);
    light.position.set(-180, 320, 500);
    this.scene.add(light, this.bouquet);
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
      new CircleGeometry(1, 48),
      new MeshStandardMaterial({color: 0x725d45, transparent: true, opacity: 0.09, depthWrite: false}),
    );
    ground.scale.set(280, 30, 1);
    ground.position.set(0, 5, -160);
    this.bouquet.add(ground);

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
      const connection = templates.get(edge.connectionSourceId)?.connections[edge.connectionIndex];
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
      graphic.position.copy(treePosition(node));
      graphic.quaternion.copy(this.graphicQuaternion(node, template, flower.seed));
      graphic.userData['pick'] = {
        instanceId: flower.instanceId,
        nodeId: node.id,
        draggable: template.draggable,
        scale: flower.scale,
      } satisfies PickData;
      group.add(graphic);
      if (node.templateId === this.highlightedNodeId()) this.addGraphicOutline(group, graphic);
    }

    for (const node of tree.nodes.filter((candidate) => candidate.draggable)) {
      const material = new MeshStandardMaterial({
        color: 0xfffdf8,
        emissive: 0x164e3f,
        emissiveIntensity: this.selectedId() === flower.instanceId ? 0.28 : 0.12,
      });
      const handle = new Mesh(new SphereGeometry(this.selectedId() === flower.instanceId ? 8 : 5.5, 12, 8), material);
      handle.position.copy(treePosition(node));
      handle.userData['pick'] = {
        instanceId: flower.instanceId,
        nodeId: node.id,
        draggable: true,
        scale: flower.scale,
      } satisfies PickData;
      group.add(handle);
    }

    if (this.selectedId() === flower.instanceId) {
      const bounds = new Box3().setFromObject(group);
      const helper = new Box3Helper(bounds, new Color('#2f6251'));
      const helperMaterial = helper.material as LineBasicMaterial;
      helperMaterial.transparent = true;
      helperMaterial.opacity = 0.58;
      group.add(helper);
    }
    group.position.set(flower.x, -flower.y, flower.z);
    group.scale.setScalar(flower.scale);
    return group;
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

    if (primitive === 'sphere') {
      geometry = new SphereGeometry(0.5, 16, 10);
      geometry.scale(width, height, depth);
    } else if (primitive === 'rod') {
      geometry = new CylinderGeometry(0.5, 0.5, 1, 10);
      geometry.translate(0, 0.5, 0);
      geometry.scale(width, height, depth);
    } else if (primitive === 'png' && graphic.png) {
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
      geometry = this.createOrganicGeometry(primitive, width, height, depth);
    }

    return new Mesh(geometry, new MeshStandardMaterial({
      color: graphic.color ?? '#5b8d53',
      roughness: 0.72,
      side: DoubleSide,
    }));
  }

  private createOrganicGeometry(primitive: string, width: number, height: number, depth: number): BufferGeometry {
    const half = width / 2;
    const shape = new Shape();
    shape.moveTo(0, 0);
    if (primitive === 'leaf-round') {
      shape.bezierCurveTo(-half * 1.05, height * 0.18, -half, height * 0.78, 0, height);
      shape.bezierCurveTo(half, height * 0.78, half * 1.05, height * 0.18, 0, 0);
    } else if (primitive === 'petal-round') {
      shape.bezierCurveTo(-half, height * 0.14, -half * 0.9, height * 0.84, 0, height);
      shape.bezierCurveTo(half * 0.9, height * 0.84, half, height * 0.14, 0, 0);
    } else {
      const shoulder = primitive === 'petal-pointed' ? 0.62 : 0.48;
      shape.bezierCurveTo(-half, height * 0.18, -half, height * shoulder, 0, height);
      shape.bezierCurveTo(half, height * shoulder, half, height * 0.18, 0, 0);
    }
    const bevel = Math.min(depth * 0.42, 1.8);
    const geometry = new ExtrudeGeometry(shape, {
      depth,
      steps: 1,
      curveSegments: 8,
      bevelEnabled: true,
      bevelSegments: 1,
      bevelSize: bevel,
      bevelThickness: bevel,
    });
    geometry.translate(0, 0, -depth / 2);
    return geometry;
  }

  private graphicQuaternion(node: FlowerTreeNode, template: FlowerNodeDefinition, seed: number): Quaternion {
    const parentDirection = new Vector3(
      Math.sin(node.angle) * Math.cos(node.azimuth),
      Math.cos(node.angle),
      Math.sin(node.angle) * Math.sin(node.azimuth),
    ).normalize();
    const align = new Quaternion().setFromUnitVectors(UP, parentDirection);
    const range = template.graphic!.rotation;
    const hash = [...node.id].reduce((value, character) => ((value * 31) + character.charCodeAt(0)) | 0, 17);
    const unit = Math.abs(Math.sin(hash + seed * 9973) * 43758.5453) % 1;
    const twist = (range.min + unit * (range.max - range.min)) * Math.PI / 180;
    return align.multiply(new Quaternion().setFromAxisAngle(UP, twist));
  }

  private addGraphicOutline(group: Group, graphic: Mesh): void {
    const outline = new LineSegments(
      new EdgesGeometry(graphic.geometry, 28),
      new LineBasicMaterial({color: 0xeab308, transparent: true, opacity: 0.75}),
    );
    outline.position.copy(graphic.position);
    outline.quaternion.copy(graphic.quaternion);
    outline.scale.setScalar(1.045);
    group.add(outline);
  }

  private updateView(): void {
    this.bouquet.rotation.order = 'YXZ';
    this.bouquet.rotation.y = this.state().rotation;
    this.bouquet.rotation.x = this.orbitPitch();
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
      if (data.draggable && data.nodeId) {
        this.nodeDragState = {
          pointerId: event.pointerId,
          instanceId: data.instanceId,
          nodeId: data.nodeId,
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
    if (this.nodeDragState?.pointerId === event.pointerId) {
      const drag = this.nodeDragState;
      const local = viewDeltaToLocalOffset(
        (event.clientX - drag.x) / drag.scale,
        (event.clientY - drag.y) / drag.scale,
        drag.rotation,
      );
      drag.x = event.clientX;
      drag.y = event.clientY;
      this.nodeDrag.emit({instanceId: drag.instanceId, nodeId: drag.nodeId, dx: local.x, dy: local.y});
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
    if (this.nodeDragState?.pointerId === event.pointerId) this.nodeDragState = null;
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
