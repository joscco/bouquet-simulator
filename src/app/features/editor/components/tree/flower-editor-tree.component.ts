import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {FlowerDefinition} from '../../../../core/models/flower.models';
import {
  connectionFromIncoming,
  incomingConnectionReference,
  nodeIncomingOrDefault,
} from '../../../../core/models/flower-connections';
import {validateFlowerDefinition} from '../../../../core/models/flower-validation';
import {clamp} from '../../../../core/utils/numbers';
import {
  Point,
  createGraphLayout,
  curvedConnectionPath,
} from '../../graph/flower-editor-graph';
import {
  absorbConnectedSubtreeIntoLoop,
  initializeEmptyLoopWithNode,
} from '../../domain/flower-editor-loops';
import {
  centerOfGraphPositions,
  graphPointerDistance,
  nestedGraphNodeIds,
  wouldCreateFlowerCycle,
} from '../../domain/flower-editor-tree-interactions';

export interface FlowerEditorTreeSelection {
  id: string;
  additive: boolean;
}

export interface FlowerEditorTreeMessage {
  text: string;
  error?: boolean;
}

@Component({
  selector: 'app-flower-editor-tree',
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './flower-editor-tree.component.html',
  host: {'class': 'relative block h-full min-h-0 w-full'},
})
export class FlowerEditorTreeComponent {
  readonly definition = input.required<FlowerDefinition>();
  readonly layoutDefinition = input.required<FlowerDefinition>();
  readonly positions = input.required<Record<string, Point>>();
  readonly selectedNodeId = input.required<string>();
  readonly activeNodeIds = input<ReadonlySet<string>>(new Set());
  readonly subtreeAnchorIds = input<Set<string>>(new Set());
  readonly subtreeNodeIds = input<Set<string>>(new Set());

  readonly definitionChange = output<FlowerDefinition>();
  readonly positionsChange = output<Record<string, Point>>();
  readonly nodeSelection = output<FlowerEditorTreeSelection>();
  readonly message = output<FlowerEditorTreeMessage>();

  readonly graphZoom = signal(1);
  readonly graphCenter = signal<Point>({x: 500, y: 500});
  readonly connectionDrag = signal<{
    sourceId: string;
    start: Point;
    end: Point;
    loopStartId?: string;
  } | null>(null);
  readonly graphLayout = computed(() => createGraphLayout(this.layoutDefinition(), this.positions()));
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
  readonly validationIssues = computed(() => validateFlowerDefinition(this.definition(), {allowForest: true}));
  readonly validationErrorCount = computed(() =>
    this.validationIssues().filter((issue) => issue.severity === 'error').length);

  @ViewChild('graphCanvas', {static: false}) private graphCanvas?: ElementRef<SVGSVGElement>;
  private nodeDrag: {pointerId: number; nodeId: string; offset: Point} | null = null;
  private readonly graphTouches = new Map<number, Point>();
  private graphPinchDistance: number | null = null;
  private graphPan: {pointerId: number; client: Point; center: Point} | null = null;

  resetView(positions: Record<string, Point>): void {
    this.graphCenter.set(centerOfGraphPositions(positions));
    this.graphZoom.set(1);
  }

  isSubtreeNodeSelected(id: string): boolean {
    return this.subtreeNodeIds().has(id);
  }

  isSubtreeAnchor(id: string): boolean {
    return this.subtreeAnchorIds().has(id);
  }

  isSubtreeEdge(sourceId: string, targetId: string): boolean {
    const selected = this.subtreeNodeIds();
    return selected.has(sourceId) && selected.has(targetId);
  }

  isActiveNode(id: string): boolean {
    return this.activeNodeIds().has(id);
  }

  isActiveEdge(sourceId: string, targetId: string): boolean {
    const active = this.activeNodeIds();
    return active.has(sourceId) && active.has(targetId);
  }

  selectConnection(event: PointerEvent, targetId: string): void {
    event.stopPropagation();
    this.selectNode(targetId);
  }

  selectNodeFromKeyboard(event: Event, id: string): void {
    this.selectNode(id, (event as KeyboardEvent).shiftKey);
  }

  graphPointerDown(event: PointerEvent): void {
    if (event.button !== 0 && event.pointerType !== 'touch') return;
    if (event.pointerType === 'touch') {
      this.graphTouches.set(event.pointerId, {x: event.clientX, y: event.clientY});
      if (this.graphTouches.size === 2) {
        this.graphPan = null;
        this.graphPinchDistance = graphPointerDistance(this.graphTouches);
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

  startNodeDrag(event: PointerEvent, nodeId: string): void {
    if (event.button !== 0) return;
    if (event.shiftKey) {
      event.stopPropagation();
      this.selectNode(nodeId, true);
      return;
    }
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

  startConnection(event: PointerEvent, sourceId: string, portIndex = 0): void {
    event.stopPropagation();
    const source = this.graphLayout().nodes.find((node) => node.id === sourceId);
    if (!source) return;
    this.selectNode(sourceId);
    const start = source.outputPorts[portIndex]
      ?? source.outputPorts[0]
      ?? {x: source.x, y: source.y - source.height / 2};
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
    this.definitionChange.emit({
      ...this.definition(),
      nodes: this.definition().nodes.map((node) => node.id === loopId && node.loop
        ? {...node, loop: {...node.loop, endNodeId: pending.sourceId}}
        : node),
    });
    this.selectNode(loopId);
  }

  graphPointerMove(event: PointerEvent): void {
    if (event.pointerType === 'touch' && this.graphTouches.has(event.pointerId)) {
      this.graphTouches.set(event.pointerId, {x: event.clientX, y: event.clientY});
      if (this.graphTouches.size === 2) {
        const distance = graphPointerDistance(this.graphTouches);
        if (this.graphPinchDistance) this.setGraphZoom(this.graphZoom() * distance / this.graphPinchDistance);
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
      this.moveDraggedNode(point);
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
    if (targetId === this.definition().rootNodeId) {
      this.message.emit({text: 'Der Startknoten hat keinen Eingang.'});
      return;
    }
    if (pending.loopStartId) {
      const initialized = initializeEmptyLoopWithNode(
        this.definition(),
        pending.loopStartId,
        targetId,
      );
      if (!initialized.addedNodeIds.length) {
        this.message.emit({
          text: 'Dieser Knoten kann nicht als erstes Mitglied der Wiederholung verwendet werden.',
          error: true,
        });
        return;
      }
      this.definitionChange.emit(initialized.definition);
      this.selectNode(pending.loopStartId);
      return;
    }
    if (wouldCreateFlowerCycle(this.definition(), pending.sourceId, targetId)) {
      this.message.emit({text: 'Diese Verbindung würde einen Zyklus erzeugen.'});
      return;
    }
    if (incomingConnectionReference(this.definition(), targetId)) {
      this.message.emit({text: 'Dieser Knoten hat bereits eine Eingangsverbindung.'});
      return;
    }
    const target = this.definition().nodes.find((node) => node.id === targetId);
    if (!target) return;
    const incoming = nodeIncomingOrDefault(target);
    const connection = connectionFromIncoming(targetId);
    const connected: FlowerDefinition = {
      ...this.definition(),
      nodes: this.definition().nodes.map((node) => {
        if (node.id === pending.sourceId) return {...node, connections: [...node.connections, connection]};
        if (node.id === targetId) return {...node, incoming: structuredClone(incoming)};
        return node;
      }),
    };
    const membership = absorbConnectedSubtreeIntoLoop(connected, pending.sourceId, targetId);
    this.definitionChange.emit(membership.definition);
    if (membership.addedNodeIds.length) {
      const absorbed = new Set(membership.addedNodeIds);
      this.positionsChange.emit(Object.fromEntries(
        Object.entries(this.positions()).filter(([id]) => !absorbed.has(id)),
      ));
    }
    this.selectNode(targetId);
  }

  private selectNode(id: string, additive = false): void {
    this.nodeSelection.emit({id, additive});
  }

  private moveDraggedNode(point: Point): void {
    const layout = this.graphLayout();
    const dragged = layout.nodes.find((node) => node.id === this.nodeDrag!.nodeId);
    if (!dragged) return;
    const target = {x: point.x - this.nodeDrag!.offset.x, y: point.y - this.nodeDrag!.offset.y};
    if (!dragged.loop) {
      this.positionsChange.emit({...this.positions(), [dragged.id]: target});
      return;
    }
    const delta = {x: target.x - dragged.x, y: target.y - dragged.y};
    const movedNodeIds = nestedGraphNodeIds(layout.nodes, dragged.id);
    const next = {...this.positions()};
    for (const id of movedNodeIds) {
      const current = this.positions()[id] ?? layout.nodes.find((node) => node.id === id) ?? dragged;
      next[id] = {x: current.x + delta.x, y: current.y + delta.y};
    }
    this.positionsChange.emit(next);
  }

  private graphPoint(event: PointerEvent): Point {
    return this.graphClientPoint(event);
  }

  private graphClientPoint(event: {clientX: number; clientY: number}): Point {
    const svg = this.graphCanvas?.nativeElement;
    if (!svg) return {x: 0, y: 0};
    return new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM()?.inverse());
  }

  private setGraphZoom(zoom: number): void {
    this.graphZoom.set(clamp(zoom, 0.2, 1.8));
  }

}
