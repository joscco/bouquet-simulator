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
import {FlowerDefinition} from '../../../../core/models/flower.models';
import {
  connectionFromIncoming,
  effectiveConnection,
  incomingConnectionReference,
  nodeIncomingOrDefault,
} from '../../../../core/models/flower-connections';
import {clamp} from '../../../../core/utils/numbers';
import {
  Point,
  createCompactGraphPositions,
  createGraphLayout,
} from '../../graph/flower-editor-graph';
import {
  absorbConnectedSubtreeIntoLoop,
  initializeEmptyLoopWithNode,
} from '../../domain/flower-editor-loops';
import {
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

interface CompactGraphEdge {
  key: string;
  sourceId: string;
  targetId: string;
  start: Point;
  end: Point;
  path: string;
}

interface CompactLoopRegion {
  id: string;
  name: string;
  compactName: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  root: boolean;
  inputPoint: Point;
  outputPoints: Array<Point & {label: string; name: string}>;
}

const COMPACT_NODE_WIDTH = 112;
const COMPACT_NODE_HEIGHT = 52;

function distributedPortOffsets(count: number, availableSpan: number): number[] {
  if (count <= 1) return [0];
  const span = Math.min(availableSpan, (count - 1) * 19);
  return Array.from({length: count}, (_, index) => -span / 2 + span * index / (count - 1));
}

function compactConnectionPath(
  start: Point,
  end: Point,
  direction: 'vertical' | 'horizontal',
): string {
  if (direction === 'horizontal') {
    const distance = Math.abs(end.x - start.x);
    const curve = Math.max(24, distance * 0.46);
    const sign = end.x >= start.x ? 1 : -1;
    return `M ${start.x} ${start.y} C ${start.x + sign * curve} ${start.y}, ${end.x - sign * curve} ${end.y}, ${end.x} ${end.y}`;
  }
  const distance = Math.abs(end.y - start.y);
  const curve = Math.max(24, distance * 0.46);
  const sign = end.y >= start.y ? 1 : -1;
  return `M ${start.x} ${start.y} C ${start.x} ${start.y + sign * curve}, ${end.x} ${end.y - sign * curve}, ${end.x} ${end.y}`;
}

@Component({
  selector: 'app-flower-editor-tree',
  imports: [],
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
  readonly compactLayoutDirection = input<'vertical' | 'horizontal'>('horizontal');

  readonly definitionChange = output<FlowerDefinition>();
  readonly positionsChange = output<Record<string, Point>>();
  readonly nodeSelection = output<FlowerEditorTreeSelection>();
  readonly componentOpen = output<string>();
  readonly positionEditStart = output<void>();
  readonly message = output<FlowerEditorTreeMessage>();

  readonly graphZoom = signal(1);
  readonly graphCenter = signal<Point>({x: 150, y: 95});
  readonly graphCameraTouched = signal(false);
  readonly graphCameraDefinitionId = signal<string | null>(null);
  readonly connectionDrag = signal<{
    sourceId: string;
    start: Point;
    end: Point;
    loopStartId?: string;
  } | null>(null);
  readonly graphLayout = computed(() => createGraphLayout(this.layoutDefinition(), this.positions()));
  readonly compactGraph = computed(() => {
    const definition = this.layoutDefinition();
    const direction = this.compactLayoutDirection();
    const layout = createGraphLayout(definition, createCompactGraphPositions(definition));
    const sourceNodes = layout.nodes.map((node) => direction === 'horizontal'
      ? {...node, x: -node.y, y: node.x}
      : node);
    if (!sourceNodes.length) {
      return {nodes: [], edges: [] as CompactGraphEdge[], loops: [] as CompactLoopRegion[]};
    }

    const minimumX = Math.min(...sourceNodes.map((node) => node.x));
    const maximumX = Math.max(...sourceNodes.map((node) => node.x));
    const minimumY = Math.min(...sourceNodes.map((node) => node.y));
    const maximumY = Math.max(...sourceNodes.map((node) => node.y));
    const availableWidth = 224;
    const availableHeight = 118;
    const rawSpanX = maximumX - minimumX;
    const rawSpanY = maximumY - minimumY;
    const fittedScale = Math.max(0.82, Math.min(1,
      availableWidth / Math.max(1, rawSpanX),
      availableHeight / Math.max(1, rawSpanY),
    ));
    // Do not compress the hierarchy axis. Its level gap is what gives the
    // connection curves enough visible length between the node cards. Only the
    // perpendicular branch distribution may be condensed to fit the drawer.
    const scaleX = direction === 'horizontal' ? 1 : fittedScale;
    const scaleY = direction === 'vertical' ? 1 : fittedScale;
    const renderedWidth = rawSpanX * scaleX;
    const renderedHeight = rawSpanY * scaleY;
    const offsetX = (300 - renderedWidth) / 2;
    const offsetY = (190 - renderedHeight) / 2;
    const nodes = sourceNodes.map((node) => {
      const x = offsetX + (node.x - minimumX) * scaleX;
      const y = offsetY + (node.y - minimumY) * scaleY;
      const outputCount = Math.max(1, node.outputPorts.length);
      const compactWidth = COMPACT_NODE_WIDTH;
      const compactHeight = COMPACT_NODE_HEIGHT;
      const offsets = distributedPortOffsets(outputCount, compactHeight - 18);
      const compactLabelLength = node.component ? 9 : 13;
      const compactLabel = node.name.length > compactLabelLength
        ? `${node.name.slice(0, compactLabelLength - 1)}…`
        : node.name;
      const compactType = node.component
        ? 'KOMPONENTE'
        : node.hasGraphic
          ? '3D-ELEMENT'
          : node.root
            ? 'START'
            : 'KNOTEN';
      return {
        ...node,
        x,
        y,
        compactWidth,
        compactHeight,
        compactLabel,
        compactType,
        compactInputPoint: direction === 'vertical'
          ? {x, y: y + compactHeight / 2}
          : {x: x - compactWidth / 2, y},
        compactOutputPoints: offsets.map((offset, index) => ({
          ...(direction === 'vertical'
            ? {x: x + offset, y: y - compactHeight / 2}
            : {x: x + compactWidth / 2, y: y + offset}),
          label: node.outputPortLabels[index] ?? (outputCount > 1 ? String(index + 1) : ''),
          name: node.outputPortNames[index] ?? '',
        })),
      };
    });
    const nodesById = new Map(nodes.map((node) => [node.id, node]));
    const originalNodesById = new Map(nodes.map((node) => [node.id, {...node}]));
    const loops = definition.nodes.flatMap<CompactLoopRegion>((loopNode) => {
      if (!loopNode.loop) return [];
      const loop = nodesById.get(loopNode.id);
      if (!loop) return [];
      const members = (loopNode.loop.memberNodeIds ?? [])
        .map((id) => originalNodesById.get(id))
        .filter((node) => node !== undefined);
      const points = members.length ? members : [originalNodesById.get(loopNode.id) ?? loop];
      const minimumMemberX = Math.min(...points.map((node) => node.x - node.compactWidth / 2));
      const maximumMemberX = Math.max(...points.map((node) => node.x + node.compactWidth / 2));
      const minimumMemberY = Math.min(...points.map((node) => node.y - node.compactHeight / 2));
      const maximumMemberY = Math.max(...points.map((node) => node.y + node.compactHeight / 2));
      const label = loopNode.loop.repeat.min === loopNode.loop.repeat.max
        ? `${loopNode.loop.repeat.min}×`
        : `${loopNode.loop.repeat.min}–${loopNode.loop.repeat.max}×`;
      const badgeWidth = 18 + label.length * 5.2;
      const width = Math.max(190, maximumMemberX - minimumMemberX + 64, badgeWidth + 48);
      const height = Math.max(134, maximumMemberY - minimumMemberY + 72);
      const x = (minimumMemberX + maximumMemberX - width) / 2;
      const y = minimumMemberY - 42;
      const outputCount = Math.max(1, loop.outputPorts.length);
      const outputOffsets = distributedPortOffsets(
        outputCount,
        direction === 'vertical' ? width - 32 : height - 32,
      );
      const inputPoint = direction === 'vertical'
        ? {x: x + width / 2, y: y + height}
        : {x, y: y + height / 2};
      const outputPoints = outputOffsets.map((offset, index) => ({
        ...(direction === 'vertical'
          ? {x: x + width / 2 + offset, y}
          : {x: x + width, y: y + height / 2 + offset}),
        label: loop.outputPortLabels[index] ?? (outputCount > 1 ? String(index + 1) : ''),
        name: loop.outputPortNames[index] ?? '',
      }));
      loop.compactInputPoint = inputPoint;
      loop.compactOutputPoints = outputPoints;
      return [{
        id: loopNode.id,
        name: loopNode.name,
        compactName: loopNode.name.length > 18
          ? `${loopNode.name.slice(0, 17)}…`
          : loopNode.name,
        label,
        x,
        y,
        width,
        height,
        root: loop.root,
        inputPoint,
        outputPoints,
      }];
    });
    const edges = definition.nodes.flatMap<CompactGraphEdge>((sourceDefinition) =>
      sourceDefinition.connections.flatMap((legacyConnection, connectionIndex) => {
        const targetId = effectiveConnection(definition, legacyConnection).childId;
        const source = nodesById.get(sourceDefinition.id);
        const target = nodesById.get(targetId);
        if (!source || !target || source.id === target.id) return [];
        const start = source.compactOutputPoints[
          Math.min(connectionIndex, source.compactOutputPoints.length - 1)
        ] ?? {x: source.x, y: source.y};
        const end = target.compactInputPoint;
        return [{
          key: `${source.id}-${target.id}-${connectionIndex}`,
          sourceId: source.id,
          targetId: target.id,
          start,
          end,
          path: compactConnectionPath(start, end, direction),
        }];
      }));
    return {nodes, edges, loops};
  });
  readonly graphViewBox = computed(() => {
    const framed = this.framedCompactCamera();
    const cameraIsCurrent = this.graphCameraTouched()
      && this.graphCameraDefinitionId() === this.layoutDefinition().id;
    const zoom = cameraIsCurrent ? this.graphZoom() : framed.zoom;
    const center = cameraIsCurrent ? this.graphCenter() : framed.center;
    const width = 300 / zoom;
    const height = 190 / zoom;
    return `${center.x - width / 2} ${center.y - height / 2} ${width} ${height}`;
  });
  readonly pendingConnectionPath = computed(() => {
    const pending = this.connectionDrag();
    return pending
      ? compactConnectionPath(pending.start, pending.end, this.compactLayoutDirection())
      : '';
  });
  @ViewChild('graphCanvas', {static: false}) private graphCanvas?: ElementRef<SVGSVGElement>;
  private nodeDrag: {
    pointerId: number;
    nodeId: string;
    offset: Point;
    historyStarted: boolean;
  } | null = null;
  private readonly graphTouches = new Map<number, Point>();
  private graphPinchDistance: number | null = null;
  private graphPan: {pointerId: number; client: Point; center: Point} | null = null;

  resetView(positions: Record<string, Point>): void {
    void positions;
    this.resetCompactView();
  }

  centerAfterLayout(positions: Record<string, Point>): void {
    void positions;
    this.resetCompactView();
  }

  resetCompactView(): void {
    const camera = this.framedCompactCamera();
    this.graphCenter.set(camera.center);
    this.graphZoom.set(camera.zoom);
    this.graphCameraDefinitionId.set(this.layoutDefinition().id);
    this.graphCameraTouched.set(true);
  }

  zoomCompactView(factor: number): void {
    this.initializeGraphCamera();
    this.setGraphZoom(this.graphZoom() * factor);
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
    this.initializeGraphCamera();
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
      center: this.currentGraphCenter(),
    };
    (event.currentTarget as SVGElement).setPointerCapture(event.pointerId);
  }

  graphWheel(event: WheelEvent): void {
    event.preventDefault();
    this.initializeGraphCamera();
    const currentZoom = this.graphZoom();
    const currentCenter = this.currentGraphCenter();
    const point = this.graphClientPoint(event);
    const currentWidth = 300 / currentZoom;
    const currentHeight = 190 / currentZoom;
    const relative = {
      x: (point.x - (currentCenter.x - currentWidth / 2)) / currentWidth,
      y: (point.y - (currentCenter.y - currentHeight / 2)) / currentHeight,
    };
    const nextZoom = clamp(currentZoom * Math.exp(-event.deltaY * 0.0015), 0.3, 3);
    const nextWidth = 300 / nextZoom;
    const nextHeight = 190 / nextZoom;
    this.graphZoom.set(nextZoom);
    this.graphCenter.set({
      x: point.x - (relative.x - 0.5) * nextWidth,
      y: point.y - (relative.y - 0.5) * nextHeight,
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
      historyStarted: false,
    };
    (event.currentTarget as SVGGElement).setPointerCapture(event.pointerId);
  }

  selectCompactNode(event: PointerEvent, nodeId: string): void {
    if (event.button !== 0 && event.pointerType !== 'touch') return;
    event.stopPropagation();
    this.selectNode(nodeId, event.shiftKey);
  }

  startCompactPortConnection(event: PointerEvent, nodeId: string, portIndex = 0): void {
    if (event.button !== 0 && event.pointerType !== 'touch') return;
    event.preventDefault();
    event.stopPropagation();
    const source = this.compactGraph().nodes.find((node) => node.id === nodeId);
    if (!source) return;
    this.selectNode(nodeId);
    const start = source.compactOutputPoints[portIndex]
      ?? source.compactOutputPoints[0]
      ?? {x: source.x, y: source.y};
    const definitionNode = this.definition().nodes.find((node) => node.id === nodeId);
    this.connectionDrag.set({
      sourceId: nodeId,
      start,
      end: start,
      loopStartId: definitionNode?.loop && !(definitionNode.loop.memberNodeIds?.length)
        ? nodeId
        : undefined,
    });
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
      const viewWidth = 300 / this.graphZoom();
      const viewHeight = 190 / this.graphZoom();
      const renderedScale = Math.min(bounds.width / viewWidth, bounds.height / viewHeight);
      this.graphCenter.set({
        x: this.graphPan.center.x - (event.clientX - this.graphPan.client.x) / renderedScale,
        y: this.graphPan.center.y - (event.clientY - this.graphPan.client.y) / renderedScale,
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
    if (!this.connectionDrag()) return;
    if (event.type === 'pointerup') {
      const point = this.graphPoint(event);
      const svg = this.graphCanvas?.nativeElement;
      const bounds = svg?.getBoundingClientRect();
      const renderedScale = bounds
        ? Math.min(
          bounds.width / (300 / this.graphZoom()),
          bounds.height / (190 / this.graphZoom()),
        )
        : 1;
      const targetRadius = Math.min(60, 24 / Math.max(0.4, renderedScale));
      const target = this.compactGraph().nodes
        .map((node) => {
          const targetPoint = node.root ? node : node.compactInputPoint;
          return {node, distance: Math.hypot(targetPoint.x - point.x, targetPoint.y - point.y)};
        })
        .filter((candidate) => candidate.distance <= targetRadius)
        .sort((first, second) => first.distance - second.distance)[0]?.node;
      if (target) {
        this.completeConnection(target.id);
        return;
      }
    }
    this.connectionDrag.set(null);
  }

  finishConnection(event: PointerEvent, targetId: string): void {
    const pending = this.connectionDrag();
    if (!pending) return;
    // Touch pointers are implicitly captured by their start element. In that case the
    // pointerup still arrives at the source circle; let the SVG resolve the real target
    // from the final finger position instead.
    if (pending.sourceId === targetId) return;
    event.stopPropagation();
    this.completeConnection(targetId);
  }

  private completeConnection(targetId: string): void {
    const pending = this.connectionDrag();
    if (!pending) return;
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

  openComponent(event: Event, definitionId: string): void {
    event.preventDefault();
    event.stopPropagation();
    this.componentOpen.emit(definitionId);
  }

  private selectNode(id: string, additive = false): void {
    this.nodeSelection.emit({id, additive});
  }

  private moveDraggedNode(point: Point): void {
    const layout = this.graphLayout();
    const dragged = layout.nodes.find((node) => node.id === this.nodeDrag!.nodeId);
    if (!dragged) return;
    if (!this.nodeDrag!.historyStarted) {
      this.nodeDrag!.historyStarted = true;
      this.positionEditStart.emit();
    }
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
    this.graphCameraTouched.set(true);
    this.graphZoom.set(clamp(zoom, 0.3, 3));
  }

  private currentGraphCenter(): Point {
    return this.graphCameraTouched()
      && this.graphCameraDefinitionId() === this.layoutDefinition().id
      ? this.graphCenter()
      : this.framedCompactCamera().center;
  }

  private initializeGraphCamera(): void {
    if (
      this.graphCameraTouched()
      && this.graphCameraDefinitionId() === this.layoutDefinition().id
    ) return;
    const camera = this.framedCompactCamera();
    this.graphCenter.set(camera.center);
    this.graphZoom.set(camera.zoom);
    this.graphCameraDefinitionId.set(this.layoutDefinition().id);
    this.graphCameraTouched.set(true);
  }

  private framedCompactCamera(): {center: Point; zoom: number} {
    const graph = this.compactGraph();
    const visibleNodes = graph.nodes.filter((node) => !node.loop);
    if (!visibleNodes.length && !graph.loops.length) {
      return {center: {x: 150, y: 95}, zoom: 1};
    }
    const minimumX = Math.min(
      ...visibleNodes.map((node) => node.x - node.compactWidth / 2 - 18),
      ...graph.loops.map((loop) => loop.x - 8),
    );
    const maximumX = Math.max(
      ...visibleNodes.map((node) => node.x + node.compactWidth / 2 + 18),
      ...graph.loops.map((loop) => loop.x + loop.width + 8),
    );
    const minimumY = Math.min(
      ...visibleNodes.map((node) => node.y - node.compactHeight / 2 - 46),
      ...graph.loops.map((loop) => loop.y - 8),
    );
    const maximumY = Math.max(
      ...visibleNodes.map((node) => node.y + node.compactHeight / 2 + 18),
      ...graph.loops.map((loop) => loop.y + loop.height + 8),
    );
    return {
      center: {x: (minimumX + maximumX) / 2, y: (minimumY + maximumY) / 2},
      zoom: clamp(Math.min(
        1,
        300 / Math.max(1, maximumX - minimumX),
        190 / Math.max(1, maximumY - minimumY),
      ), 0.3, 1),
    };
  }

}
