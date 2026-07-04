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
import {BouquetStore} from '../../core/state/bouquet.store';
import {
  BouquetState,
  FlowerDefinition,
  FlowerNodeConnection,
  FlowerNodeDefinition,
  FlowerNodeGraphic,
  GraphicPoint,
  NumberRange,
  NodeRepeatMode,
} from '../../core/models/flower.models';
import {validateFlowerDefinition} from '../../core/models/flower-validation';
import {BouquetCanvasComponent} from '../../shared/bouquet-canvas/bouquet-canvas.component';
import {DrawingCanvasComponent} from '../../shared/drawing-canvas/drawing-canvas.component';
import {IntervalSliderComponent} from '../../shared/interval-slider/interval-slider.component';
import {downloadJson, readJsonFile} from '../../shared/download-json';

interface Point {
  x: number;
  y: number;
}

interface GraphNode extends Point {
  id: string;
  name: string;
  root: boolean;
  draggable: boolean;
  hasGraphic: boolean;
  loop: boolean;
  loopStartName: string;
  loopEndName: string;
  loopMember: boolean;
  memberIds: string[];
  width: number;
  height: number;
}

interface GraphEdge {
  key: string;
  sourceId: string;
  index: number;
  path: string;
  labelX: number;
  labelY: number;
  label: string;
  selectable: boolean;
  color: string;
}

@Component({
  selector: 'app-flower-editor',
  imports: [FormsModule, BouquetCanvasComponent, DrawingCanvasComponent, IntervalSliderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './flower-editor.component.html',
})
export class FlowerEditorComponent {
  readonly store = inject(BouquetStore);
  readonly draft = signal<FlowerDefinition>(structuredClone(this.store.definitions()[0]));
  readonly selectedNodeId = signal(this.draft().rootNodeId);
  readonly selectedEdge = signal<{sourceId: string; index: number} | null>(null);
  readonly graphZoom = signal(1);
  readonly graphCenter = signal<Point>({x: 500, y: 500});
  readonly previewZoom = signal(1);
  readonly previewSeed = signal(0.42);
  readonly graphPositions = signal<Record<string, Point>>(
    structuredClone(this.draft().editor?.nodePositions ?? {}),
  );
  readonly connectionDrag = signal<{
    sourceId: string;
    start: Point;
    end: Point;
    loopStartId?: string;
  } | null>(null);
  readonly message = signal('');

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
  readonly graphLayout = computed(() => this.createGraphLayout(this.draft(), this.graphPositions()));
  readonly graphViewBox = computed(() => {
    const width = 1000 / this.graphZoom();
    const height = 1000 / this.graphZoom();
    const center = this.graphCenter();
    return `${center.x - width / 2} ${center.y - height / 2} ${width} ${height}`;
  });
  readonly pendingConnectionPath = computed(() => {
    const pending = this.connectionDrag();
    return pending ? this.curvedConnectionPath(pending.start, pending.end) : '';
  });
  readonly previewState = computed<BouquetState>(() => ({
    schemaVersion: 2,
    rotation: 0,
    flowers: [{
      instanceId: 'editor-preview',
      definitionId: this.draft().id,
      x: 0,
      y: 0,
      z: 0,
      scale: 1,
      seed: this.previewSeed(),
      nodeOffsets: {},
    }],
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
    this.graphPositions.set(this.materializePositions(this.draft()));
  }

  updateRoot(key: 'id' | 'name', value: string): void {
    this.draft.update((draft) => ({...draft, [key]: value}));
  }

  updateStem(key: keyof FlowerDefinition['stem'], value: string | number): void {
    this.draft.update((draft) => ({...draft, stem: {...draft.stem, [key]: value}}));
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
      name: `Loop ${index}`,
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
    const layout = this.createGraphLayout(this.draft(), {});
    this.graphPositions.set(Object.fromEntries(
      layout.nodes.map((node) => [node.id, {x: node.x, y: node.y}]),
    ));
    this.graphCenter.set({x: 500, y: 500});
    this.graphZoom.set(1);
    this.message.set('Tree automatisch angeordnet.');
  }

  regeneratePreview(): void {
    this.previewSeed.set(Math.random());
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
      this.message.set('Der Basisknoten bleibt erhalten.');
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
      png: '/flower-graphics/rose-center.png',
      width: 50,
      height: 50,
      rotation: {min: 0, max: 0},
      start: {x: 0.5, y: 0.9},
      end: {x: 0.5, y: 0.1},
    };
    this.updateSelectedNode((node) => ({...node, graphic: value ? node.graphic ?? defaultGraphic : null}));
  }

  updateGraphic(key: 'width' | 'height', value: number): void {
    this.updateSelectedNode((node) => node.graphic
      ? {...node, graphic: {...node.graphic, [key]: Number(value)}}
      : node);
  }

  updateGraphicImage(image: string): void {
    this.updateSelectedNode((node) => node.graphic
      ? {...node, graphic: {...node.graphic, png: image}}
      : node);
  }

  updateGraphicPoint(key: 'start' | 'end', point: GraphicPoint): void {
    this.updateSelectedNode((node) => node.graphic
      ? {...node, graphic: {...node.graphic, [key]: point}}
      : node);
  }

  updateGraphicRotation(rotation: NumberRange): void {
    this.updateSelectedNode((node) => node.graphic
      ? {...node, graphic: {...node.graphic, rotation}}
      : node);
  }

  updateConnectionRange(
    index: number,
    group: 'repeat' | 'length' | 'angle',
    value: NumberRange,
  ): void {
    this.updateConnection(index, (connection) => ({
      ...connection,
      [group]: value,
    }));
  }

  updateConnectionMode(index: number, mode: NodeRepeatMode): void {
    this.updateConnection(index, (connection) => ({...connection, mode}));
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
    const start = {x: source.x, y: source.y - (source.loop ? source.height / 2 : 36)};
    this.connectionDrag.set({sourceId, start, end: start});
  }

  startLoopPath(event: PointerEvent, loopId: string): void {
    event.stopPropagation();
    const source = this.graphLayout().nodes.find((node) => node.id === loopId);
    if (!source) return;
    this.selectNode(loopId);
    const start = {x: source.x, y: source.y + source.height / 2 - 28};
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
            dragged.loop ? dragged.width / 2 + 20 : 90,
            dragged.loop ? 980 - dragged.width / 2 : 910,
        ),
          y: clamp(
            point.y - this.nodeDrag.offset.y,
            dragged.loop ? dragged.height / 2 + 20 : 55,
            dragged.loop ? 980 - dragged.height / 2 : 945,
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
      this.message.set('Diese Verbindung würde einen Zyklus erzeugen.');
      return;
    }
    const connection: FlowerNodeConnection = {
      childId: targetId,
      mode: 'branches',
      repeat: {min: 1, max: 1},
      length: {min: 50, max: 70},
      angle: {min: -10, max: 10},
    };
    let newIndex = 0;
    this.updateConnectionForSource(pending.sourceId, (connections) => {
      newIndex = connections.length;
      return [...connections, connection];
    });
    this.selectedNodeId.set(pending.sourceId);
    this.selectedEdge.set({sourceId: pending.sourceId, index: newIndex});
  }

  saveToCatalog(): void {
    const definition = this.definitionWithEditorState();
    const error = validateFlowerDefinition(definition).find((issue) => issue.severity === 'error');
    if (error) {
      this.message.set(`Speichern nicht möglich: ${error.message}`);
      return;
    }
    this.draft.set(definition);
    this.store.replaceDefinition(definition);
    this.message.set('Gespeichert.');
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
      this.message.set('Geladen.');
    } catch (error: unknown) {
      this.message.set(error instanceof Error ? error.message : 'Import fehlgeschlagen.');
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

  private loadDefinition(definition: FlowerDefinition): void {
    const clone = structuredClone(definition);
    this.draft.set(clone);
    this.graphPositions.set(this.materializePositions(clone));
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

  private materializePositions(definition: FlowerDefinition): Record<string, Point> {
    const layout = this.createGraphLayout(definition, definition.editor?.nodePositions ?? {});
    return Object.fromEntries(layout.nodes.map((node) => [node.id, {x: node.x, y: node.y}]));
  }

  private createGraphLayout(
    definition: FlowerDefinition,
    storedPositions: Record<string, Point>,
  ): {nodes: GraphNode[]; edges: GraphEdge[]; width: number; height: number} {
    const width = 1000;
    const height = 1000;
    const levels = new Map<string, number>([[definition.rootNodeId, 0]]);
    for (let pass = 0; pass < definition.nodes.length; pass++) {
      for (const node of definition.nodes) {
        const level = levels.get(node.id);
        if (level === undefined) continue;
        if (node.loop?.startNodeId && !levels.has(node.loop.startNodeId)) {
          levels.set(node.loop.startNodeId, level + 1);
        }
        for (const connection of node.connections) {
          if (!levels.has(connection.childId)) levels.set(connection.childId, level + 1);
        }
      }
    }
    const connectedMax = Math.max(0, ...levels.values());
    for (const node of definition.nodes) {
      if (!levels.has(node.id)) levels.set(node.id, connectedMax + 1);
    }
    const maxLevel = Math.max(1, ...levels.values());
    const groups = new Map<number, FlowerNodeDefinition[]>();
    for (const node of definition.nodes) {
      const level = levels.get(node.id)!;
      groups.set(level, [...(groups.get(level) ?? []), node]);
    }
    const internalNodeIds = new Set(definition.nodes
      .filter((node) => node.loop?.startNodeId && node.loop.endNodeId)
      .flatMap((node) => this.templatePath(
        definition,
        node.loop!.startNodeId!,
        node.loop!.endNodeId!,
      )));
    const graphNodes: GraphNode[] = [];
    for (const [level, nodes] of groups) {
      const outerNodes = nodes.filter((node) => !internalNodeIds.has(node.id));
      const gap = width / (outerNodes.length + 1);
      let outerIndex = 0;
      nodes.forEach((node) => {
        const fallbackX = internalNodeIds.has(node.id)
          ? width / 2
          : gap * (++outerIndex);
        const fallback = {
          x: fallbackX,
          y: 920 - level * (840 / maxLevel),
        };
        const position = storedPositions[node.id] ?? fallback;
        graphNodes.push({
          id: node.id,
          name: node.name,
          x: position.x,
          y: position.y,
          root: node.id === definition.rootNodeId,
          draggable: node.draggable,
          hasGraphic: !!node.graphic,
          loop: !!node.loop,
          loopStartName: definition.nodes.find((candidate) =>
            candidate.id === node.loop?.startNodeId)?.name ?? 'Start wählen',
          loopEndName: definition.nodes.find((candidate) =>
            candidate.id === node.loop?.endNodeId)?.name ?? 'Ende wählen',
          loopMember: false,
          memberIds: [],
          width: node.loop ? 220 : 160,
          height: node.loop ? 140 : 72,
        });
      });
    }
    for (const definitionNode of definition.nodes.filter((node) => node.loop)) {
      const loopNode = graphNodes.find((node) => node.id === definitionNode.id);
      if (!loopNode || !definitionNode.loop?.startNodeId || !definitionNode.loop.endNodeId) continue;
      const memberIds = this.templatePath(
        definition,
        definitionNode.loop.startNodeId,
        definitionNode.loop.endNodeId,
      );
      if (!memberIds.length) continue;
      const members = memberIds
        .map((id) => graphNodes.find((node) => node.id === id))
        .filter((node): node is GraphNode => !!node);
      if (!members.length) continue;
      const hasStoredMembers = members.every((member) => !!storedPositions[member.id]);
      if (!hasStoredMembers) {
        const spacing = 108;
        const estimatedHeight = Math.max(180, (members.length - 1) * spacing + 208);
        const incomingNodes = definition.nodes
          .filter((node) => node.connections.some((connection) => connection.childId === definitionNode.id))
          .map((node) => graphNodes.find((candidate) => candidate.id === node.id))
          .filter((node): node is GraphNode => !!node);
        const nearestIncomingY = incomingNodes.length
          ? Math.min(...incomingNodes.map((node) => node.y))
          : height - 20;
        const memberCenterY = clamp(
          Math.min(loopNode.y, nearestIncomingY - estimatedHeight / 2 - 50),
          estimatedHeight / 2 + 20,
          height - estimatedHeight / 2 - 20,
        );
        members.forEach((member, index) => {
          member.x = loopNode.x;
          member.y = memberCenterY + (members.length - 1) * spacing / 2 - index * spacing;
        });
      }
      const paddingX = 42;
      const paddingY = 68;
      const left = Math.min(...members.map((member) => member.x - 80)) - paddingX;
      const right = Math.max(...members.map((member) => member.x + 80)) + paddingX;
      const top = Math.min(...members.map((member) => member.y - 36)) - paddingY;
      const bottom = Math.max(...members.map((member) => member.y + 36)) + paddingY;
      loopNode.x = (left + right) / 2;
      loopNode.y = (top + bottom) / 2;
      loopNode.width = Math.max(240, right - left);
      loopNode.height = Math.max(180, bottom - top);
      loopNode.memberIds = memberIds;
      for (const member of members) {
        member.loopMember = true;
      }
    }
    graphNodes.sort((first, second) => Number(second.loop) - Number(first.loop));
    const positions = new Map(graphNodes.map((node) => [node.id, node]));
    const edges: GraphEdge[] = [];
    for (const node of definition.nodes.filter((candidate) => candidate.loop)) {
      const loopNode = positions.get(node.id);
      const startNode = node.loop?.startNodeId ? positions.get(node.loop.startNodeId) : null;
      const endNode = node.loop?.endNodeId ? positions.get(node.loop.endNodeId) : null;
      if (loopNode && startNode) {
        const start = {x: loopNode.x, y: loopNode.y + loopNode.height / 2 - 28};
        const end = {x: startNode.x, y: startNode.y + (startNode.loop ? 56 : 36)};
        edges.push({
          key: `${node.id}-loop-start`,
          sourceId: node.id,
          index: -1,
          path: this.curvedConnectionPath(start, end),
          labelX: (start.x + end.x) / 2,
          labelY: (start.y + end.y) / 2,
          label: 'START',
          selectable: false,
          color: '#059669',
        });
      }
      if (loopNode && endNode) {
        const start = {x: endNode.x, y: endNode.y - (endNode.loop ? 56 : 36)};
        const end = {x: loopNode.x, y: loopNode.y - loopNode.height / 2 + 28};
        edges.push({
          key: `${node.id}-loop-end`,
          sourceId: node.id,
          index: -2,
          path: this.curvedConnectionPath(start, end),
          labelX: (start.x + end.x) / 2,
          labelY: (start.y + end.y) / 2,
          label: 'ENDE',
          selectable: false,
          color: '#d97706',
        });
      }
    }
    for (const node of definition.nodes) {
      const from = positions.get(node.id);
      if (!from) continue;
      node.connections.forEach((connection, index) => {
        const to = positions.get(connection.childId);
        if (!to) return;
        const start = {x: from.x, y: from.y - (from.loop ? from.height / 2 : 36)};
        const end = {x: to.x, y: to.y + (to.loop ? to.height / 2 : 36)};
        edges.push({
          key: `${node.id}-${connection.childId}-${index}`,
          sourceId: node.id,
          index,
          path: this.curvedConnectionPath(start, end),
          labelX: (start.x + end.x) / 2,
          labelY: (start.y + end.y) / 2,
          label: `${connection.mode === 'chain' ? '↻ ' : ''}${connection.repeat.min}–${connection.repeat.max}`,
          selectable: true,
          color: '#a8a29e',
        });
      });
    }
    return {nodes: graphNodes, edges, width, height};
  }

  private templatePath(
    definition: FlowerDefinition,
    startNodeId: string,
    endNodeId: string,
  ): string[] {
    if (startNodeId === endNodeId) return [startNodeId];
    const nodes = new Map(definition.nodes.map((node) => [node.id, node]));
    const visited = new Set<string>();
    const visit = (id: string): string[] | null => {
      if (visited.has(id)) return null;
      visited.add(id);
      for (const connection of nodes.get(id)?.connections ?? []) {
        if (connection.childId === endNodeId) return [id, endNodeId];
        const remainder = visit(connection.childId);
        if (remainder) return [id, ...remainder];
      }
      return null;
    };
    return visit(startNodeId) ?? [];
  }

  private curvedConnectionPath(start: Point, end: Point): string {
    const distance = Math.abs(end.y - start.y);
    const curve = Math.max(48, distance * 0.46);
    const direction = end.y <= start.y ? -1 : 1;
    return `M ${start.x} ${start.y} C ${start.x} ${start.y + direction * curve}, ${end.x} ${end.y - direction * curve}, ${end.x} ${end.y}`;
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
