import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatSliderModule} from '@angular/material/slider';
import {MatSnackBar, MatSnackBarModule} from '@angular/material/snack-bar';
import {BouquetStore} from '../../core/state/bouquet.store';
import {
  BouquetState,
  FlowerDefinition,
  FlowerNodeConnection,
  FlowerNodeDefinition,
  FlowerNodeGraphic,
  GraphicPrimitive,
  NumberRange,
} from '../../core/models/flower.models';
import {validateFlowerDefinition} from '../../core/models/flower-validation';
import {BouquetCanvasComponent} from '../../shared/bouquet-canvas/bouquet-canvas.component';
import {IntervalSliderComponent} from '../../shared/interval-slider/interval-slider.component';
import {downloadJson, readJsonFile} from '../../shared/download-json';
import {
  Point,
  createGraphLayout,
  curvedConnectionPath,
  materializePositions,
} from './flower-editor-graph';

@Component({
  selector: 'app-flower-editor',
  imports: [
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatSliderModule,
    MatSnackBarModule,
    BouquetCanvasComponent,
    IntervalSliderComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './flower-editor.component.html',
})
export class FlowerEditorComponent {
  readonly graphicPrimitives: ReadonlyArray<{value: GraphicPrimitive; label: string}> = [
    {value: 'leaf-pointed', label: 'Spitzes Blatt'},
    {value: 'leaf-round', label: 'Rundes Blatt'},
    {value: 'petal-pointed', label: 'Spitzes Blütenblatt'},
    {value: 'petal-round', label: 'Rundes Blütenblatt'},
    {value: 'sphere', label: 'Kugel'},
    {value: 'rod', label: 'Stäbchen'},
  ];
  readonly store = inject(BouquetStore);
  private readonly snackBar = inject(MatSnackBar);
  readonly draft = signal<FlowerDefinition>(structuredClone(this.store.definitions()[0]));
  readonly selectedNodeId = signal(this.draft().rootNodeId);
  readonly selectedEdge = signal<{sourceId: string; index: number} | null>(null);
  readonly graphZoom = signal(1);
  readonly graphCenter = signal<Point>({x: 500, y: 500});
  readonly previewZoom = signal(1);
  readonly previewSeed = signal(0.42);
  readonly previewRotation = signal(0);
  readonly previewPitch = signal(0);
  readonly graphPositions = signal<Record<string, Point>>(
    structuredClone(this.draft().editor?.nodePositions ?? {}),
  );
  readonly connectionDrag = signal<{
    sourceId: string;
    start: Point;
    end: Point;
    loopStartId?: string;
  } | null>(null);

  readonly selectedNode = computed(() =>
    this.draft().nodes.find((node) => node.id === this.selectedNodeId()) ?? null);
  readonly selectedConnection = computed(() => {
    const selected = this.selectedEdge();
    if (!selected) return null;
    const source = this.draft().nodes.find((node) => node.id === selected.sourceId);
    const connection = source?.connections[selected.index];
    return source && connection ? {...selected, source, connection} : null;
  });
  readonly validationIssues = computed(() => validateFlowerDefinition(this.draft()));
  readonly graphLayout = computed(() => createGraphLayout(this.draft(), this.graphPositions()));
  readonly graphViewBox = computed(() => {
    const width = 1000 / this.graphZoom();
    const height = 1000 / this.graphZoom();
    const center = this.graphCenter();
    return `${center.x - width / 2} ${center.y - height / 2} ${width} ${height}`;
  });
  readonly pendingConnectionPath = computed(() => {
    const pending = this.connectionDrag();
    return pending ? curvedConnectionPath(pending.start, pending.end) : '';
  });
  readonly previewDefinitions = computed(() => [this.draft()]);
  readonly previewFlowers = computed<BouquetState['flowers']>(() => [{
      instanceId: 'editor-preview',
      definitionId: this.draft().id,
      x: 0,
      y: 0,
      z: 0,
      scale: 1,
      seed: this.previewSeed(),
      nodeOffsets: {},
  }]);
  readonly previewState = computed<BouquetState>(() => ({
    schemaVersion: 2,
    rotation: this.previewRotation(),
    flowers: this.previewFlowers(),
  }));

  @ViewChild('graphCanvas', {static: false}) private graphCanvas?: ElementRef<SVGSVGElement>;
  private nodeDrag: {pointerId: number; nodeId: string; offset: Point} | null = null;
  private readonly graphTouches = new Map<number, Point>();
  private graphPinchDistance: number | null = null;
  private graphPan: {
    pointerId: number;
    client: Point;
    center: Point;
  } | null = null;

  constructor() {
    this.graphPositions.set(materializePositions(this.draft()));
  }

  updateRoot(key: 'id' | 'name', value: string): void {
    this.draft.update((draft) => ({...draft, [key]: value}));
  }

  updateStem(key: keyof FlowerDefinition['stem'], value: string | number): void {
    this.draft.update((draft) => ({...draft, stem: {...draft.stem, [key]: value}}));
  }


  createNewDefinition(): void {
    const id = this.uniqueDefinitionId('neue-blume');
    const definition: FlowerDefinition = {
      schemaVersion: 2,
      id,
      name: 'Neue Blume',
      rootNodeId: 'base',
      stem: {color: '#426f50', highlightColor: '#82a878', width: 8, taper: 0.72},
      nodes: [{id: 'base', name: 'Basis', draggable: false, graphic: null, connections: []}],
      editor: {nodePositions: {base: {x: 500, y: 840}}},
    };
    this.store.replaceDefinition(definition);
    this.loadDefinition(definition);
    this.notify('Neue Blume angelegt.');
  }

  duplicateDefinition(): void {
    const source = this.definitionWithEditorState();
    const id = this.uniqueDefinitionId(`${source.id}-kopie`);
    const definition: FlowerDefinition = {
      ...structuredClone(source),
      id,
      name: `${source.name} Kopie`,
    };
    this.store.replaceDefinition(definition);
    this.loadDefinition(definition);
    this.notify('Blumentyp dupliziert.');
  }

  selectNode(id: string): void {
    this.selectedNodeId.set(id);
    this.selectedEdge.set(null);
  }

  selectConnection(event: PointerEvent, sourceId: string, index: number): void {
    event.stopPropagation();
    this.selectedNodeId.set(sourceId);
    this.selectedEdge.set({sourceId, index});
  }

  clearConnectionSelection(): void {
    this.selectedEdge.set(null);
  }

  addNode(): void {
    const existing = new Set(this.draft().nodes.map((node) => node.id));
    let index = this.draft().nodes.length + 1;
    while (existing.has(`node-${index}`)) index++;
    const node: FlowerNodeDefinition = {
      id: `node-${index}`,
      name: `Knoten ${index}`,
      draggable: false,
      graphic: null,
      connections: [],
    };
    const offset = this.draft().nodes.length * 17 % 160;
    this.graphPositions.update((positions) => ({
      ...positions,
      [node.id]: {x: 420 + offset, y: 90 + offset / 5},
    }));
    this.draft.update((draft) => ({...draft, nodes: [...draft.nodes, node]}));
    this.selectNode(node.id);
  }

  addLoop(): void {
    const existing = new Set(this.draft().nodes.map((node) => node.id));
    let index = 1;
    while (existing.has(`loop-${index}`)) index++;
    const node: FlowerNodeDefinition = {
      id: `loop-${index}`,
      name: `Wiederholung ${index}`,
      draggable: false,
      graphic: null,
      connections: [],
      loop: {
        repeat: {min: 2, max: 4},
        startNodeId: null,
        endNodeId: null,
      },
    };
    this.graphPositions.update((positions) => ({
      ...positions,
      [node.id]: {x: 500, y: 330},
    }));
    this.draft.update((draft) => ({...draft, nodes: [...draft.nodes, node]}));
    this.selectNode(node.id);
  }

  autoLayout(): void {
    const layout = createGraphLayout(this.draft(), {});
    this.graphPositions.set(Object.fromEntries(
      layout.nodes.map((node) => [node.id, {x: node.x, y: node.y}]),
    ));
    this.graphCenter.set({x: 500, y: 500});
    this.graphZoom.set(1);
    this.notify('Graph automatisch angeordnet.');
  }

  regeneratePreview(): void {
    this.previewSeed.set(Math.random());
  }

  rotatePreview(delta: number): void {
    this.previewRotation.update((rotation) => rotation + delta);
  }

  orbitPreview(delta: {yaw: number; pitch: number}): void {
    this.previewRotation.update((rotation) => rotation + delta.yaw);
    this.previewPitch.update((pitch) =>
      Math.max(-Math.PI * 0.48, Math.min(Math.PI * 0.48, pitch + delta.pitch)));
  }

  graphPointerDown(event: PointerEvent): void {
    this.clearConnectionSelection();
    if (event.button !== 0 && event.pointerType !== 'touch') return;
    if (event.pointerType === 'touch') {
      this.graphTouches.set(event.pointerId, {x: event.clientX, y: event.clientY});
      if (this.graphTouches.size === 2) {
        this.graphPan = null;
        this.graphPinchDistance = this.touchDistance(this.graphTouches);
        return;
      }
    }
    this.graphPan = {
      pointerId: event.pointerId,
      client: {x: event.clientX, y: event.clientY},
      center: this.graphCenter(),
    };
    (event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId);
  }

  graphWheel(event: WheelEvent): void {
    event.preventDefault();
    const currentZoom = this.graphZoom();
    const currentCenter = this.graphCenter();
    const point = this.graphClientPoint(event);
    const currentSize = 1000 / currentZoom;
    const relative = {
      x: (point.x - (currentCenter.x - currentSize / 2)) / currentSize,
      y: (point.y - (currentCenter.y - currentSize / 2)) / currentSize,
    };
    const nextZoom = clamp(currentZoom * Math.exp(-event.deltaY * 0.0015), 0.6, 1.8);
    const nextSize = 1000 / nextZoom;
    this.graphZoom.set(nextZoom);
    this.graphCenter.set({
      x: point.x - (relative.x - 0.5) * nextSize,
      y: point.y - (relative.y - 0.5) * nextSize,
    });
  }

  duplicateSelectedNode(): void {
    const source = this.selectedNode();
    if (!source) return;
    const existing = new Set(this.draft().nodes.map((node) => node.id));
    let suffix = 2;
    let id = `${source.id}-copy`;
    while (existing.has(id)) id = `${source.id}-copy-${suffix++}`;
    const node: FlowerNodeDefinition = {
      ...structuredClone(source),
      id,
      name: `${source.name} Kopie`,
    };
    const sourcePosition = this.graphPositions()[source.id] ?? {x: 500, y: 300};
    this.graphPositions.update((positions) => ({
      ...positions,
      [id]: {
        x: clamp(sourcePosition.x + 44, 90, 910),
        y: clamp(sourcePosition.y - 54, 55, 625),
      },
    }));
    this.draft.update((draft) => ({...draft, nodes: [...draft.nodes, node]}));
    this.selectNode(id);
  }

  removeSelectedNode(): void {
    const id = this.selectedNodeId();
    if (id === this.draft().rootNodeId) {
      this.notify('Der Basisknoten bleibt erhalten.');
      return;
    }
    this.draft.update((draft) => ({
      ...draft,
      nodes: draft.nodes
        .filter((node) => node.id !== id)
        .map((node) => ({
          ...node,
          connections: node.connections.filter((connection) => connection.childId !== id),
          loop: node.loop ? {
            ...node.loop,
            startNodeId: node.loop.startNodeId === id ? null : node.loop.startNodeId,
            endNodeId: node.loop.endNodeId === id ? null : node.loop.endNodeId,
          } : undefined,
        })),
    }));
    this.graphPositions.update((positions) => {
      const next = {...positions};
      delete next[id];
      return next;
    });
    this.selectNode(this.draft().rootNodeId);
  }

  updateNodeName(value: string): void {
    this.updateSelectedNode((node) => ({...node, name: value}));
  }

  setNodeDraggable(value: boolean): void {
    this.updateSelectedNode((node) => ({...node, draggable: value}));
  }

  setHasGraphic(value: boolean): void {
    const defaultGraphic: FlowerNodeGraphic = {
      primitive: 'leaf-pointed',
      color: '#5b8d53',
      width: 50,
      height: 50,
      depth: 8,
      rotation: {min: 0, max: 0},
      start: {x: 0.5, y: 0.9},
      end: {x: 0.5, y: 0.1},
    };
    this.updateSelectedNode((node) => ({...node, graphic: value ? node.graphic ?? defaultGraphic : null}));
  }

  updateGraphic(key: 'width' | 'height' | 'depth', value: number): void {
    this.updateSelectedNode((node) => node.graphic
      ? {...node, graphic: {...node.graphic, [key]: Number(value)}}
      : node);
  }

  updateGraphicPrimitive(primitive: GraphicPrimitive): void {
    this.updateSelectedNode((node) => node.graphic
      ? {...node, graphic: {...node.graphic, primitive}}
      : node);
  }

  updateGraphicColor(color: string): void {
    this.updateSelectedNode((node) => node.graphic
      ? {...node, graphic: {...node.graphic, color}}
      : node);
  }

  updateGraphicRotation(rotation: NumberRange): void {
    this.updateSelectedNode((node) => node.graphic
      ? {...node, graphic: {...node.graphic, rotation}}
      : node);
  }

  updateConnectionRange(
    index: number,
    group: 'repeat' | 'length' | 'angle' | 'azimuth',
    value: NumberRange,
  ): void {
    this.updateConnection(index, (connection) => ({
      ...connection,
      [group]: value,
    }));
  }

  connectionRandomness(connection: FlowerNodeConnection): number {
    return Math.round((connection.randomness ?? 0.35) * 100);
  }

  updateConnectionRandomness(index: number, percentage: number): void {
    this.updateConnection(index, (connection) => ({
      ...connection,
      randomness: Math.max(0, Math.min(1, Number(percentage) / 100)),
    }));
  }

  updateLoopRepeat(repeat: NumberRange): void {
    this.updateSelectedNode((node) => node.loop
      ? {...node, loop: {...node.loop, repeat}}
      : node);
  }

  connectionStemColor(connection: FlowerNodeConnection): string {
    return connection.stem?.color ?? this.draft().stem.color;
  }

  connectionStemWidth(connection: FlowerNodeConnection): number {
    return connection.stem?.width ?? this.draft().stem.width;
  }

  updateConnectionStem(index: number, key: 'color' | 'width', value: string | number): void {
    this.updateConnection(index, (connection) => ({
      ...connection,
      stem: {
        color: key === 'color' ? String(value) : this.connectionStemColor(connection),
        width: key === 'width' ? Number(value) : this.connectionStemWidth(connection),
      },
    }));
  }

  removeSelectedConnection(): void {
    const selected = this.selectedEdge();
    if (!selected) return;
    this.updateConnectionForSource(selected.sourceId, (connections) =>
      connections.filter((_, index) => index !== selected.index));
    this.selectedEdge.set(null);
  }

  startNodeDrag(event: PointerEvent, nodeId: string): void {
    if (event.button !== 0) return;
    event.stopPropagation();
    const point = this.graphPoint(event);
    const node = this.graphLayout().nodes.find((candidate) => candidate.id === nodeId);
    if (!node) return;
    this.selectNode(nodeId);
    this.nodeDrag = {
      pointerId: event.pointerId,
      nodeId,
      offset: {x: point.x - node.x, y: point.y - node.y},
    };
    (event.currentTarget as SVGGElement).setPointerCapture(event.pointerId);
  }

  startConnection(event: PointerEvent, sourceId: string): void {
    event.stopPropagation();
    const source = this.graphLayout().nodes.find((node) => node.id === sourceId);
    if (!source) return;
    this.selectNode(sourceId);
    const start = {x: source.x, y: source.y - source.height / 2};
    this.connectionDrag.set({sourceId, start, end: start});
  }

  startLoopPath(event: PointerEvent, loopId: string): void {
    event.stopPropagation();
    const source = this.graphLayout().nodes.find((node) => node.id === loopId);
    if (!source) return;
    this.selectNode(loopId);
    const start = {x: source.x, y: source.y + source.height / 2};
    this.connectionDrag.set({sourceId: loopId, start, end: start, loopStartId: loopId});
  }

  finishLoopEnd(event: PointerEvent, loopId: string): void {
    const pending = this.connectionDrag();
    if (!pending || pending.loopStartId || pending.sourceId === loopId) return;
    event.stopPropagation();
    this.connectionDrag.set(null);
    this.draft.update((draft) => ({
      ...draft,
      nodes: draft.nodes.map((node) => node.id === loopId && node.loop
        ? {...node, loop: {...node.loop, endNodeId: pending.sourceId}}
        : node),
    }));
    this.selectNode(loopId);
  }

  graphPointerMove(event: PointerEvent): void {
    if (event.pointerType === 'touch' && this.graphTouches.has(event.pointerId)) {
      this.graphTouches.set(event.pointerId, {x: event.clientX, y: event.clientY});
      if (this.graphTouches.size === 2) {
        const distance = this.touchDistance(this.graphTouches);
        if (this.graphPinchDistance) {
          this.setGraphZoom(this.graphZoom() * distance / this.graphPinchDistance);
        }
        this.graphPinchDistance = distance;
        return;
      }
    }
    if (this.graphPan?.pointerId === event.pointerId) {
      const svg = this.graphCanvas?.nativeElement;
      if (!svg) return;
      const bounds = svg.getBoundingClientRect();
      const viewSize = 1000 / this.graphZoom();
      this.graphCenter.set({
        x: this.graphPan.center.x - (event.clientX - this.graphPan.client.x) * viewSize / bounds.width,
        y: this.graphPan.center.y - (event.clientY - this.graphPan.client.y) * viewSize / bounds.height,
      });
      return;
    }
    const point = this.graphPoint(event);
    if (this.nodeDrag?.pointerId === event.pointerId) {
      const dragged = this.graphLayout().nodes.find((node) => node.id === this.nodeDrag!.nodeId);
      if (!dragged) return;
      const target = {
        x: clamp(
          point.x - this.nodeDrag.offset.x,
          dragged.width / 2 + 20,
          980 - dragged.width / 2,
        ),
        y: clamp(
          point.y - this.nodeDrag.offset.y,
          dragged.height / 2 + 20,
          980 - dragged.height / 2,
        ),
      };
      if (dragged.loop) {
        const delta = {x: target.x - dragged.x, y: target.y - dragged.y};
        this.graphPositions.update((positions) => {
          const next = {...positions};
          for (const id of [dragged.id, ...dragged.memberIds]) {
            const current = positions[id]
              ?? this.graphLayout().nodes.find((node) => node.id === id)
              ?? dragged;
            next[id] = {x: current.x + delta.x, y: current.y + delta.y};
          }
          return next;
        });
      } else {
        this.graphPositions.update((positions) => ({
          ...positions,
          [dragged.id]: target,
        }));
      }
      return;
    }
    const connection = this.connectionDrag();
    if (connection) this.connectionDrag.set({...connection, end: point});
  }

  graphPointerUp(event: PointerEvent): void {
    this.graphTouches.delete(event.pointerId);
    if (this.graphTouches.size < 2) this.graphPinchDistance = null;
    if (this.graphPan?.pointerId === event.pointerId) this.graphPan = null;
    if (this.nodeDrag?.pointerId === event.pointerId) this.nodeDrag = null;
    if (this.connectionDrag()) this.connectionDrag.set(null);
  }

  finishConnection(event: PointerEvent, targetId: string): void {
    const pending = this.connectionDrag();
    if (!pending) return;
    event.stopPropagation();
    this.connectionDrag.set(null);
    if (pending.sourceId === targetId) return;
    if (pending.loopStartId) {
      this.draft.update((draft) => ({
        ...draft,
        nodes: draft.nodes.map((node) => node.id === pending.loopStartId && node.loop
          ? {...node, loop: {...node.loop, startNodeId: targetId}}
          : node),
      }));
      this.selectNode(pending.loopStartId);
      return;
    }
    if (this.wouldCreateCycle(pending.sourceId, targetId)) {
      this.notify('Diese Verbindung würde einen Zyklus erzeugen.');
      return;
    }
    const connection: FlowerNodeConnection = {
      childId: targetId,
      repeat: {min: 1, max: 1},
      length: {min: 50, max: 70},
      angle: {min: 0, max: 10},
      azimuth: {min: 0, max: 360},
      randomness: 0.25,
    };
    let newIndex = 0;
    this.updateConnectionForSource(pending.sourceId, (connections) => {
      newIndex = connections.length;
      return [...connections, connection];
    });
    this.selectedNodeId.set(pending.sourceId);
    this.selectedEdge.set({sourceId: pending.sourceId, index: newIndex});
  }

  async saveToCatalog(): Promise<void> {
    const definition = this.definitionWithEditorState();
    const error = validateFlowerDefinition(definition).find((issue) => issue.severity === 'error');
    if (error) {
      this.notify(`Speichern nicht möglich: ${error.message}`);
      return;
    }
    const definitions = this.store.definitions().some((candidate) => candidate.id === definition.id)
      ? this.store.definitions().map((candidate) => candidate.id === definition.id ? definition : candidate)
      : [...this.store.definitions(), definition];
    try {
      const response = await fetch('/api/defaults', {
        method: 'PUT',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify(definitions),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as {error?: string} | null;
        throw new Error(body?.error ?? `Defaults-Server antwortet mit ${response.status}.`);
      }
      this.draft.set(definition);
      this.store.replaceDefinition(definition);
      this.notify('In src/app/core/data/default-flowers.ts gespeichert.');
    } catch (saveError: unknown) {
      this.notify(
        saveError instanceof Error
          ? `Lokales Speichern fehlgeschlagen: ${saveError.message}`
          : 'Lokales Speichern fehlgeschlagen.',
      );
    }
  }

  exportFlower(): void {
    const definition = this.definitionWithEditorState();
    downloadJson(definition, `${definition.id || 'blume'}.flower.json`);
  }

  async importFlower(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const definition = await readJsonFile<FlowerDefinition>(file);
      if (definition.schemaVersion !== 2 || !Array.isArray(definition.nodes) || !definition.rootNodeId) {
        throw new Error('Keine gültige Knoten-Blume.');
      }
      const error = validateFlowerDefinition(definition).find((issue) => issue.severity === 'error');
      if (error) throw new Error(error.message);
      this.loadDefinition(definition);
      this.notify('Geladen.');
    } catch (error: unknown) {
      this.notify(error instanceof Error ? error.message : 'Import fehlgeschlagen.');
    } finally {
      input.value = '';
    }
  }

  selectDefinition(id: string): void {
    const definition = this.store.definitions().find((candidate) => candidate.id === id);
    if (definition) this.loadDefinition(definition);
  }

  @HostListener('window:keydown.delete', ['$event'])
  @HostListener('window:keydown.backspace', ['$event'])
  deleteSelectedEdgeWithKeyboard(event: Event): void {
    if (!this.selectedEdge()) return;
    const target = event.target as HTMLElement;
    if (target.matches('input, textarea, select') || target.isContentEditable) return;
    event.preventDefault();
    this.removeSelectedConnection();
  }


  private uniqueDefinitionId(seed: string): string {
    const existing = new Set(this.store.definitions().map((definition) => definition.id));
    const base = slugify(seed) || 'blume';
    let id = base;
    let suffix = 2;
    while (existing.has(id)) id = `${base}-${suffix++}`;
    return id;
  }

  private notify(message: string): void {
    this.snackBar.open(message);
  }

  private loadDefinition(definition: FlowerDefinition): void {
    const clone = structuredClone(definition);
    this.draft.set(clone);
    this.graphPositions.set(materializePositions(clone));
    this.selectNode(clone.rootNodeId);
  }

  private definitionWithEditorState(): FlowerDefinition {
    return {
      ...this.draft(),
      editor: {nodePositions: structuredClone(this.graphPositions())},
    };
  }

  private updateSelectedNode(update: (node: FlowerNodeDefinition) => FlowerNodeDefinition): void {
    const selectedId = this.selectedNodeId();
    this.draft.update((draft) => ({
      ...draft,
      nodes: draft.nodes.map((node) => node.id === selectedId ? update(node) : node),
    }));
  }

  private updateConnection(
    index: number,
    update: (connection: FlowerNodeConnection) => FlowerNodeConnection,
  ): void {
    this.updateConnectionForSource(this.selectedNodeId(), (connections) =>
      connections.map((connection, connectionIndex) =>
        connectionIndex === index ? update(connection) : connection));
  }

  private updateConnectionForSource(
    sourceId: string,
    update: (connections: FlowerNodeConnection[]) => FlowerNodeConnection[],
  ): void {
    this.draft.update((draft) => ({
      ...draft,
      nodes: draft.nodes.map((node) =>
        node.id === sourceId ? {...node, connections: update(node.connections)} : node),
    }));
  }

  private graphPoint(event: PointerEvent): Point {
    return this.graphClientPoint(event);
  }

  private graphClientPoint(event: {clientX: number; clientY: number}): Point {
    const svg = this.graphCanvas?.nativeElement;
    if (!svg) return {x: 0, y: 0};
    const point = new DOMPoint(event.clientX, event.clientY);
    return point.matrixTransform(svg.getScreenCTM()?.inverse());
  }

  private setGraphZoom(zoom: number): void {
    this.graphZoom.set(clamp(zoom, 0.6, 1.8));
  }

  private touchDistance(touches: Map<number, Point>): number {
    const points = [...touches.values()];
    const first = points[0]!;
    const second = points[1]!;
    return Math.hypot(second.x - first.x, second.y - first.y);
  }

  private wouldCreateCycle(sourceId: string, targetId: string): boolean {
    const nodes = new Map(this.draft().nodes.map((node) => [node.id, node]));
    const pending = [targetId];
    const visited = new Set<string>();
    while (pending.length) {
      const id = pending.pop()!;
      if (id === sourceId) return true;
      if (visited.has(id)) continue;
      visited.add(id);
      pending.push(...(nodes.get(id)?.connections.map((connection) => connection.childId) ?? []));
    }
    return false;
  }

}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
