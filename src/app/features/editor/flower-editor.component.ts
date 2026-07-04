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
  NodeRepeatMode,
} from '../../core/models/flower.models';
import {validateFlowerDefinition} from '../../core/models/flower-validation';
import {BouquetCanvasComponent} from '../../shared/bouquet-canvas/bouquet-canvas.component';
import {DrawingCanvasComponent} from '../../shared/drawing-canvas/drawing-canvas.component';
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
}

interface GraphEdge {
  key: string;
  sourceId: string;
  index: number;
  path: string;
  labelX: number;
  labelY: number;
  label: string;
}

@Component({
  selector: 'app-flower-editor',
  imports: [FormsModule, BouquetCanvasComponent, DrawingCanvasComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './flower-editor.component.html',
})
export class FlowerEditorComponent {
  readonly store = inject(BouquetStore);
  readonly draft = signal<FlowerDefinition>(structuredClone(this.store.definitions()[0]));
  readonly selectedNodeId = signal(this.draft().rootNodeId);
  readonly selectedEdge = signal<{sourceId: string; index: number} | null>(null);
  readonly graphPositions = signal<Record<string, Point>>(
    structuredClone(this.draft().editor?.nodePositions ?? {}),
  );
  readonly connectionDrag = signal<{sourceId: string; start: Point; end: Point} | null>(null);
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
      seed: 0.42,
      nodeOffsets: {},
    }],
  }));

  @ViewChild('graphCanvas', {static: false}) private graphCanvas?: ElementRef<SVGSVGElement>;
  private nodeDrag: {pointerId: number; nodeId: string; offset: Point} | null = null;

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
      [node.id]: {x: 500 + offset, y: 330 + offset / 2},
    }));
    this.draft.update((draft) => ({...draft, nodes: [...draft.nodes, node]}));
    this.selectNode(node.id);
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
      svg: placeholderSvg,
      width: 50,
      height: 50,
      rotation: {min: 0, max: 0},
      anchorX: 0.5,
      anchorY: 0.5,
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
      ? {...node, graphic: {...node.graphic, svg: image}}
      : node);
  }

  updateConnectionValue(
    index: number,
    group: 'repeat' | 'length' | 'angle',
    bound: 'min' | 'max',
    value: number,
  ): void {
    this.updateConnection(index, (connection) => ({
      ...connection,
      [group]: {...connection[group], [bound]: Number(value)},
    }));
  }

  updateConnectionMode(index: number, mode: NodeRepeatMode): void {
    this.updateConnection(index, (connection) => ({...connection, mode}));
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
    const start = {x: source.x + 80, y: source.y};
    this.connectionDrag.set({sourceId, start, end: start});
  }

  graphPointerMove(event: PointerEvent): void {
    const point = this.graphPoint(event);
    if (this.nodeDrag?.pointerId === event.pointerId) {
      this.graphPositions.update((positions) => ({
        ...positions,
        [this.nodeDrag!.nodeId]: {
          x: clamp(point.x - this.nodeDrag!.offset.x, 90, 910),
          y: clamp(point.y - this.nodeDrag!.offset.y, 55, 625),
        },
      }));
      return;
    }
    const connection = this.connectionDrag();
    if (connection) this.connectionDrag.set({...connection, end: point});
  }

  graphPointerUp(event: PointerEvent): void {
    if (this.nodeDrag?.pointerId === event.pointerId) this.nodeDrag = null;
    if (this.connectionDrag()) this.connectionDrag.set(null);
  }

  finishConnection(event: PointerEvent, targetId: string): void {
    const pending = this.connectionDrag();
    if (!pending) return;
    event.stopPropagation();
    this.connectionDrag.set(null);
    if (pending.sourceId === targetId) return;
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
    const svg = this.graphCanvas?.nativeElement;
    if (!svg) return {x: 0, y: 0};
    const point = new DOMPoint(event.clientX, event.clientY);
    return point.matrixTransform(svg.getScreenCTM()?.inverse());
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
    const height = 680;
    const levels = new Map<string, number>([[definition.rootNodeId, 0]]);
    for (let pass = 0; pass < definition.nodes.length; pass++) {
      for (const node of definition.nodes) {
        const level = levels.get(node.id);
        if (level === undefined) continue;
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
    const graphNodes: GraphNode[] = [];
    for (const [level, nodes] of groups) {
      const gap = height / (nodes.length + 1);
      nodes.forEach((node, index) => {
        const fallback = {
          x: 110 + level * (780 / maxLevel),
          y: gap * (index + 1),
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
        });
      });
    }
    const positions = new Map(graphNodes.map((node) => [node.id, node]));
    const edges: GraphEdge[] = [];
    for (const node of definition.nodes) {
      const from = positions.get(node.id);
      if (!from) continue;
      node.connections.forEach((connection, index) => {
        const to = positions.get(connection.childId);
        if (!to) return;
        const fromX = from.x + 80;
        const toX = to.x - 80;
        const curve = Math.max(55, Math.abs(toX - fromX) * 0.42);
        edges.push({
          key: `${node.id}-${connection.childId}-${index}`,
          sourceId: node.id,
          index,
          path: `M ${fromX} ${from.y} C ${fromX + curve} ${from.y}, ${toX - curve} ${to.y}, ${toX} ${to.y}`,
          labelX: (fromX + toX) / 2,
          labelY: (from.y + to.y) / 2 - 9,
          label: `${connection.repeat.min}–${connection.repeat.max}`,
        });
      });
    }
    return {nodes: graphNodes, edges, width, height};
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

const placeholderSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="44" fill="#db816e"/>
</svg>`;
