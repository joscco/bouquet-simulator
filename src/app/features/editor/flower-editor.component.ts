import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {MatButtonModule} from '@angular/material/button';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatIconModule} from '@angular/material/icon';
import {MatSliderModule} from '@angular/material/slider';
import {MatSnackBar, MatSnackBarModule} from '@angular/material/snack-bar';
import {MatTooltipModule} from '@angular/material/tooltip';
import {BouquetStore} from '../../core/state/bouquet.store';
import {
  BouquetState,
  FlowerDefinition,
  FlowerNodeComponent,
  FlowerNodeConnection,
  FlowerNodeDefinition,
  FlowerNodeGraphic,
  FlowerNodeIncomingConnection,
  GraphicPrimitive,
  NumberRange,
} from '../../core/models/flower.models';
import {
  DEFAULT_INCOMING_CONNECTION,
  connectionFromIncoming,
  incomingConnectionReference,
  migrateIncomingConnections,
  nodeIncomingOrDefault,
} from '../../core/models/flower-connections';
import {
  BUILT_IN_GRAPHICS,
  canonicalGraphicPrimitive,
} from '../../core/rendering/graphic-geometries';
import {graphicRotationSettings} from '../../core/rendering/graphic-orientation';
import {validateFlowerDefinition} from '../../core/models/flower-validation';
import {BouquetCanvasComponent} from '../../shared/bouquet-canvas/bouquet-canvas.component';
import {IntervalSliderComponent} from '../../shared/interval-slider/interval-slider.component';
import {downloadJson, readJsonFile} from '../../shared/download-json';
import {GraphicPainterComponent} from './graphic-painter.component';
import {FlowerSubtreeLibrary} from '../../core/state/flower-subtree-library';
import {
  FlowerSubtreeDefinition,
  createFlowerDefinitionComponent,
  createFlowerSubtree,
  extractFlowerSubtreeComponent,
  insertFlowerSubtree,
  isFlowerSubtreeDefinition,
  resolveFlowerSubtreeSelection,
} from '../../core/models/flower-subtree';
import {
  Point,
  createGraphLayout,
  curvedConnectionPath,
  materializePositions,
} from './flower-editor-graph';

interface FlowerComponentCatalogEntry {
  key: string;
  source: 'definition' | 'saved';
  role: 'flower' | 'component';
  tree: FlowerSubtreeDefinition;
}

@Component({
  selector: 'app-flower-editor',
  imports: [
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatSliderModule,
    MatSnackBarModule,
    MatTooltipModule,
    BouquetCanvasComponent,
    IntervalSliderComponent,
    GraphicPainterComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './flower-editor.component.html',
})
export class FlowerEditorComponent {
  readonly graphicPrimitives = BUILT_IN_GRAPHICS;
  readonly store = inject(BouquetStore);
  private readonly snackBar = inject(MatSnackBar);
  private readonly subtreeLibrary = inject(FlowerSubtreeLibrary);
  readonly draft = signal<FlowerDefinition>(
    migrateIncomingConnections(this.store.definitions()[0]),
  );
  readonly selectedCatalogKey = signal(`definition:${this.draft().id}`);
  readonly selectedNodeId = signal(this.draft().rootNodeId);
  readonly addMenuOpen = signal(false);
  readonly componentSearch = signal('');
  readonly subtreeAnchorIds = signal<Set<string>>(new Set());
  readonly subtreeName = signal('');
  readonly savedTrees = this.subtreeLibrary.trees;
  readonly componentCatalog = computed<FlowerComponentCatalogEntry[]>(() => [
    ...this.store.definitions().map((definition) => ({
      key: `definition:${definition.id}`,
      source: 'definition' as const,
      role: (definition.catalogRole ?? 'flower') as 'flower' | 'component',
      tree: createFlowerDefinitionComponent(migrateIncomingConnections(definition)),
    })),
    ...this.savedTrees().map((tree) => ({
      key: `saved:${tree.id}`,
      source: 'saved' as const,
      role: 'component' as const,
      tree,
    })),
  ]);
  readonly selectedCatalogEntry = computed(() =>
    this.componentCatalog().find((entry) => entry.key === this.selectedCatalogKey()) ?? null);
  readonly canDeleteSelectedCatalogEntry = computed(() => {
    const entry = this.selectedCatalogEntry();
    return entry !== null && (entry.source === 'saved' || this.store.definitions().length > 1);
  });
  readonly filteredComponentCatalog = computed(() => {
    const query = normalizeSearch(this.componentSearch());
    if (!query) return this.componentCatalog();
    return this.componentCatalog().filter((entry) =>
      normalizeSearch(`${entry.tree.name} ${entry.role} ${entry.source}`).includes(query));
  });
  readonly graphZoom = signal(1);
  readonly graphCenter = signal<Point>({x: 500, y: 500});
  readonly previewZoom = signal(1);
  readonly previewViewOffset = signal<Point>({x: 0, y: 0});
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

  readonly subtreeSelection = computed(() =>
    resolveFlowerSubtreeSelection(this.draft(), this.subtreeAnchorIds()));
  readonly subtreeNodeIds = computed(() => this.subtreeSelection()?.nodeIds ?? new Set<string>());
  readonly selectedNode = computed(() =>
    this.draft().nodes.find((node) => node.id === this.selectedNodeId()) ?? null);
  readonly selectedIncoming = computed(() =>
    incomingConnectionReference(this.draft(), this.selectedNodeId()));
  readonly incomingSettings = computed(() => {
    const node = this.selectedNode();
    return node ? nodeIncomingOrDefault(node) : structuredClone(DEFAULT_INCOMING_CONNECTION);
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

  updateCatalogRole(isFlower: boolean): void {
    this.draft.update((draft) => ({
      ...draft,
      catalogRole: isFlower ? 'flower' : 'component',
    }));
  }

  updateCatalogIconSymbol(value: string): void {
    const symbol = [...value.trim()][0] ?? '✿';
    this.draft.update((draft) => ({
      ...draft,
      catalogIcon: {
        symbol,
        color: draft.catalogIcon?.color ?? this.previewColorFromDefinition(draft),
      },
    }));
  }

  updateCatalogIconColor(color: string): void {
    this.draft.update((draft) => ({
      ...draft,
      catalogIcon: {
        symbol: draft.catalogIcon?.symbol ?? '✿',
        color,
      },
    }));
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
      catalogRole: 'flower',
      catalogIcon: {symbol: '✿', color: '#5b8d53'},
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
    this.subtreeAnchorIds.set(new Set());
  }

  clearSubtreeSelection(): void {
    this.subtreeAnchorIds.set(new Set());
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

  componentOutputCount(tree: FlowerNodeComponent): number {
    const ids = new Set(tree.nodes.map((node) => node.id));
    const preferred = (tree.outputNodeIds ?? []).filter((id) => ids.has(id));
    if (preferred.length) return preferred.length;
    const parents = new Set(tree.nodes.flatMap((node) =>
      node.connections
        .filter((connection) => ids.has(connection.childId))
        .map(() => node.id)));
    return tree.nodes.filter((node) => !parents.has(node.id)).length;
  }

  toggleSubtreeAnchor(id: string): void {
    this.selectedNodeId.set(id);
    const wasEmpty = this.subtreeAnchorIds().size === 0;
    this.subtreeAnchorIds.update((anchors) => {
      const next = new Set(anchors);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    if (wasEmpty && !this.subtreeName().trim()) {
      const selectedName = this.selectedNode()?.name ?? 'Komponente';
      this.subtreeName.set(`${selectedName} Komponente`);
    }
  }

  selectConnection(event: PointerEvent, targetId: string): void {
    event.stopPropagation();
    this.selectNode(targetId);
  }

  addNode(): void {
    this.addMenuOpen.set(false);
    const existing = new Set(this.draft().nodes.map((node) => node.id));
    let index = this.draft().nodes.length + 1;
    while (existing.has(`node-${index}`)) index++;
    const node: FlowerNodeDefinition = {
      id: `node-${index}`,
      name: `Knoten ${index}`,
      draggable: false,
      graphic: null,
      incoming: structuredClone(DEFAULT_INCOMING_CONNECTION),
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

  toggleAddMenu(): void {
    this.addMenuOpen.update((open) => !open);
    if (!this.addMenuOpen()) this.componentSearch.set('');
  }

  insertComponentFromAddMenu(tree: FlowerSubtreeDefinition): void {
    this.insertSavedTree(tree);
    this.addMenuOpen.set(false);
    this.componentSearch.set('');
  }

  addLoop(): void {
    this.addMenuOpen.set(false);
    const existing = new Set(this.draft().nodes.map((node) => node.id));
    let index = 1;
    while (existing.has(`loop-${index}`)) index++;
    const node: FlowerNodeDefinition = {
      id: `loop-${index}`,
      name: `Wiederholung ${index}`,
      draggable: false,
      graphic: null,
      incoming: structuredClone(DEFAULT_INCOMING_CONNECTION),
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

  panPreview(delta: {dx: number; dy: number}): void {
    this.previewViewOffset.update((offset) => ({
      x: offset.x + delta.dx,
      y: offset.y + delta.dy,
    }));
  }

  resetPreviewView(): void {
    this.previewViewOffset.set({x: 0, y: 0});
    this.previewPitch.set(0);
    this.previewRotation.set(0);
    this.previewZoom.set(1);
  }

  graphPointerDown(event: PointerEvent): void {
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
      connections: [],
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

  setHasGraphic(value: boolean): void {
    const defaultGraphic: FlowerNodeGraphic = {
      primitive: 'leaf-pointed',
      color: '#5b8d53',
      width: 50,
      height: 50,
      depth: 8,
      scale: 1,
      offset: {x: 0, y: 0, z: 0},
      orientation: 'toward-parent',
      rotationBase: 0,
      rotationSpread: 0,
      rotation: {min: 0, max: 0},
      start: {x: 0.5, y: 0.9},
      end: {x: 0.5, y: 0.1},
    };
    this.updateSelectedNode((node) => ({...node, graphic: value ? node.graphic ?? defaultGraphic : null}));
  }

  updateGraphic(key: 'width' | 'height' | 'depth' | 'scale', value: number): void {
    this.updateSelectedNode((node) => node.graphic
      ? {...node, graphic: {...node.graphic, [key]: Number(value)}}
      : node);
  }

  updateGraphicOffset(key: 'x' | 'y' | 'z', value: number): void {
    this.updateSelectedNode((node) => node.graphic
      ? {
          ...node,
          graphic: {
            ...node.graphic,
            offset: {...(node.graphic.offset ?? {x: 0, y: 0, z: 0}), [key]: Number(value)},
          },
        }
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

  graphicPrimitive(graphic: FlowerNodeGraphic): GraphicPrimitive {
    return canonicalGraphicPrimitive(graphic.primitive ?? 'leaf-pointed');
  }

  isPaintableGraphic(graphic: FlowerNodeGraphic): boolean {
    return this.graphicPrimitives.find((entry) =>
      entry.value === this.graphicPrimitive(graphic))?.organic ?? false;
  }

  updateGraphicPaint(paint: NonNullable<FlowerNodeGraphic['paint']>): void {
    this.updateSelectedNode((node) => node.graphic
      ? {...node, graphic: {...node.graphic, paint}}
      : node);
  }

  updateGraphicBend(key: 'bendMain' | 'bendCross', value: number): void {
    this.updateSelectedNode((node) => node.graphic
      ? {...node, graphic: {...node.graphic, [key]: Number(value)}}
      : node);
  }

  graphicRotationBase(graphic: FlowerNodeGraphic): number {
    return Math.round(graphicRotationSettings(graphic).base);
  }

  graphicRotationSpread(graphic: FlowerNodeGraphic): number {
    return Math.round(graphicRotationSettings(graphic).spread);
  }

  updateGraphicRotationBase(base: number): void {
    this.updateGraphicRotationSettings(Number(base), this.graphicRotationSpread(this.selectedNode()!.graphic!));
  }

  updateGraphicRotationSpread(spread: number): void {
    this.updateGraphicRotationSettings(
      this.graphicRotationBase(this.selectedNode()!.graphic!),
      Math.max(0, Math.min(180, Number(spread))),
    );
  }

  updateGraphicOrientation(orientation: NonNullable<FlowerNodeGraphic['orientation']>): void {
    this.updateSelectedNode((node) => node.graphic
      ? {...node, graphic: {...node.graphic, orientation}}
      : node);
  }

  private updateGraphicRotationSettings(base: number, spread: number): void {
    const normalizedBase = Math.max(-180, Math.min(180, base));
    this.updateSelectedNode((node) => node.graphic
      ? {
          ...node,
          graphic: {
            ...node.graphic,
            rotationBase: normalizedBase,
            rotationSpread: spread,
            rotation: {
              min: normalizedBase - spread,
              max: normalizedBase + spread,
            },
          },
        }
      : node);
  }

  updateIncomingRange(
    group: 'repeat' | 'length' | 'angle' | 'azimuth',
    value: NumberRange,
  ): void {
    this.updateIncoming((incoming) => ({
      ...incoming,
      [group]: value,
    }));
  }

  incomingRandomness(incoming: FlowerNodeIncomingConnection): number {
    return Math.round((incoming.randomness ?? 0.35) * 100);
  }

  updateIncomingRandomness(percentage: number): void {
    this.updateIncoming((incoming) => ({
      ...incoming,
      randomness: Math.max(0, Math.min(1, Number(percentage) / 100)),
    }));
  }

  updateLoopRepeat(repeat: NumberRange): void {
    this.updateSelectedNode((node) => node.loop
      ? {...node, loop: {...node.loop, repeat}}
      : node);
  }

  incomingStemColor(incoming: FlowerNodeIncomingConnection): string {
    return incoming.stem?.color ?? this.draft().stem.color;
  }

  incomingStemWidth(incoming: FlowerNodeIncomingConnection): number {
    return incoming.stem?.width ?? this.draft().stem.width;
  }

  updateIncomingStem(key: 'color' | 'width', value: string | number): void {
    this.updateIncoming((incoming) => ({
      ...incoming,
      stem: {
        color: key === 'color' ? String(value) : this.incomingStemColor(incoming),
        width: key === 'width' ? Number(value) : this.incomingStemWidth(incoming),
      },
    }));
  }

  removeIncomingConnection(): void {
    const incoming = this.selectedIncoming();
    if (!incoming) return;
    this.updateConnectionForSource(incoming.sourceId, (connections) =>
      connections.filter((_, index) => index !== incoming.index));
  }

  startNodeDrag(event: PointerEvent, nodeId: string): void {
    if (event.button !== 0) return;
    event.stopPropagation();
    if (event.shiftKey) {
      this.toggleSubtreeAnchor(nodeId);
      return;
    }
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
    if (event.shiftKey) {
      this.toggleSubtreeAnchor(sourceId);
      return;
    }
    const source = this.graphLayout().nodes.find((node) => node.id === sourceId);
    if (!source) return;
    this.selectNode(sourceId);
    const start = {x: source.x, y: source.y - source.height / 2};
    this.connectionDrag.set({sourceId, start, end: start});
  }

  startLoopPath(event: PointerEvent, loopId: string): void {
    event.stopPropagation();
    if (event.shiftKey) {
      this.toggleSubtreeAnchor(loopId);
      return;
    }
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
    if (
      targetId === this.draft().rootNodeId
      || incomingConnectionReference(this.draft(), targetId)
    ) {
      this.notify('Dieser Knoten hat bereits eine Eingangsverbindung.');
      return;
    }
    const target = this.draft().nodes.find((node) => node.id === targetId);
    if (!target) return;
    const incoming = nodeIncomingOrDefault(target);
    const connection = connectionFromIncoming(targetId, incoming);
    this.updateConnectionForSource(pending.sourceId, (connections) => {
      return [...connections, connection];
    });
    this.draft.update((draft) => ({
      ...draft,
      nodes: draft.nodes.map((node) =>
        node.id === targetId ? {...node, incoming} : node),
    }));
    this.selectNode(targetId);
  }

  exportSelectedSubtree(): void {
    const selection = this.subtreeSelection();
    if (!selection) {
      this.notify('Markiere mindestens einen zusammenhängenden Knoten.');
      return;
    }
    const name = this.subtreeName().trim()
      || this.draft().nodes.find((node) => node.id === selection.rootNodeId)?.name
      || 'Komponente';
    const id = this.uniqueSubtreeId(name);
    const tree = createFlowerSubtree(
      this.draft(),
      this.graphPositions(),
      selection,
      {id, name},
    );
    this.subtreeLibrary.save(tree);
    downloadJson(tree, `${tree.id}.tree.json`);
    this.notify(`„${tree.name}“ wurde als Komponente gespeichert und exportiert.`);
  }

  extractSelectedSubtree(): void {
    const selection = this.subtreeSelection();
    if (!selection) {
      this.notify('Markiere mit Shift mindestens einen Knoten.');
      return;
    }
    const name = this.subtreeName().trim()
      || this.draft().nodes.find((node) => node.id === selection.rootNodeId)?.name
      || 'Komponente';
    const id = this.uniqueSubtreeId(name);
    try {
      const extracted = extractFlowerSubtreeComponent(
        this.draft(),
        this.graphPositions(),
        selection,
        {id, name},
      );
      this.subtreeLibrary.save(extracted.subtree);
      this.draft.set(extracted.definition);
      this.graphPositions.set(extracted.nodePositions);
      this.subtreeAnchorIds.set(new Set());
      this.subtreeName.set('');
      this.selectNode(extracted.insertedNodeId);
      this.notify(`„${name}“ wurde als ein Komponentenknoten extrahiert.`);
    } catch (error: unknown) {
      this.notify(error instanceof Error ? error.message : 'Komponente konnte nicht extrahiert werden.');
    }
  }

  insertSavedTree(tree: FlowerSubtreeDefinition): void {
    const parentId = this.selectedNodeId();
    try {
      const inserted = insertFlowerSubtree(
        this.draft(),
        this.graphPositions(),
        tree,
        parentId,
      );
      this.draft.set(inserted.definition);
      this.graphPositions.set(inserted.nodePositions);
      this.subtreeAnchorIds.set(new Set());
      this.selectNode(inserted.insertedNodeId);
      this.notify(`„${tree.name}“ wurde als Komponentenknoten angehängt.`);
    } catch (error: unknown) {
      this.notify(error instanceof Error ? error.message : 'Komponente konnte nicht eingefügt werden.');
    }
  }

  selectCatalogEntry(key: string): void {
    const entry = this.componentCatalog().find((candidate) => candidate.key === key);
    if (!entry) return;
    if (entry.source === 'definition') {
      const definition = this.store.definitions().find((candidate) => candidate.id === entry.tree.id);
      if (definition) this.loadDefinition(definition, key);
      return;
    }
    this.loadDefinition(this.definitionFromComponent(entry.tree, 'component'), key);
  }

  downloadSavedTree(tree: FlowerSubtreeDefinition): void {
    downloadJson(tree, `${tree.id}.tree.json`);
  }

  removeSavedTree(id: string): void {
    this.subtreeLibrary.remove(id);
    this.notify('Komponente aus der Bibliothek entfernt.');
  }

  saveComponentAsFlower(tree: FlowerSubtreeDefinition): void {
    const definition = {
      ...this.definitionFromComponent(tree, 'flower'),
      id: this.uniqueDefinitionId(tree.id || tree.name),
    };
    this.store.replaceDefinition(definition);
    this.notify(`„${definition.name}“ ist jetzt als fertige Blume verfügbar.`);
  }

  async importTree(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const tree = await readJsonFile<unknown>(file);
      if (!isFlowerSubtreeDefinition(tree)) throw new Error('Keine gültige Komponenten-Datei.');
      const imported = this.subtreeLibrary.import(tree);
      this.notify(`„${imported.name}“ wurde zu den Komponenten hinzugefügt.`);
    } catch (error: unknown) {
      this.notify(error instanceof Error ? error.message : 'Komponenten-Import fehlgeschlagen.');
    } finally {
      input.value = '';
    }
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
      await this.writeDefinitionsToDefaults(definitions);
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

  async deleteSelectedCatalogEntry(): Promise<void> {
    const entry = this.selectedCatalogEntry();
    if (!entry) return;
    if (entry.source === 'saved') {
      this.deleteSavedCatalogEntry(entry);
      return;
    }
    if (this.store.definitions().length <= 1) {
      this.notify('Mindestens eine Definition muss erhalten bleiben.');
      return;
    }

    const definition = this.store.definitions().find((candidate) => candidate.id === entry.tree.id);
    if (!definition) return;
    const usage = this.store.definitionUsage(definition.id);
    const usageLines: string[] = [];
    if (usage.bouquetInstances > 0) {
      usageLines.push(
        `${usage.bouquetInstances} ${usage.bouquetInstances === 1 ? 'Blume im aktuellen Strauß wird' : 'Blumen im aktuellen Strauß werden'} ebenfalls entfernt.`,
      );
    }
    if (usage.componentDefinitions.length > 0) {
      usageLines.push(
        `Als Teilkomponente verwendet in: ${usage.componentDefinitions.map((entry) => entry.name).join(', ')}. Die dort eingebetteten Kopien bleiben erhalten.`,
      );
    }

    const warning = usageLines.length
      ? `„${definition.name}“ wird aktuell verwendet.\n\n${usageLines.join('\n')}\n\nDefinition trotzdem löschen?`
      : `Definition „${definition.name}“ wirklich löschen?`;
    if (!globalThis.confirm(warning)) return;
    if (usageLines.length && !globalThis.confirm(
      `„${definition.name}“ ist in Benutzung. Das Löschen jetzt endgültig bestätigen.`,
    )) return;

    const definitions = this.store.definitions().filter((candidate) => candidate.id !== definition.id);
    try {
      await this.writeDefinitionsToDefaults(definitions);
      this.store.removeDefinition(definition.id);
      const nextDefinition = definitions[0];
      if (nextDefinition) this.loadDefinition(nextDefinition);
      this.notify(`„${definition.name}“ wurde gelöscht.`);
    } catch (deleteError: unknown) {
      this.notify(
        deleteError instanceof Error
          ? `Löschen fehlgeschlagen: ${deleteError.message}`
          : 'Löschen fehlgeschlagen.',
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

  private uniqueDefinitionId(seed: string): string {
    const existing = new Set(this.store.definitions().map((definition) => definition.id));
    const base = slugify(seed) || 'blume';
    let id = base;
    let suffix = 2;
    while (existing.has(id)) id = `${base}-${suffix++}`;
    return id;
  }

  private uniqueSubtreeId(seed: string): string {
    const existing = new Set(this.savedTrees().map((tree) => tree.id));
    const base = slugify(seed) || 'tree';
    let id = base;
    let suffix = 2;
    while (existing.has(id)) id = `${base}-${suffix++}`;
    return id;
  }

  private notify(message: string): void {
    this.snackBar.open(message);
  }

  private async writeDefinitionsToDefaults(definitions: FlowerDefinition[]): Promise<void> {
    const response = await fetch('/api/defaults', {
      method: 'PUT',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify(definitions),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null) as {error?: string} | null;
      throw new Error(body?.error ?? `Defaults-Server antwortet mit ${response.status}.`);
    }
  }

  private deleteSavedCatalogEntry(entry: FlowerComponentCatalogEntry): void {
    const usage = this.store.componentUsage(entry.tree.id);
    const warning = usage.length
      ? `„${entry.tree.name}“ wird als Teilkomponente verwendet in: ${usage.map((definition) => definition.name).join(', ')}.\n\nDie eingebetteten Kopien bleiben erhalten. Bibliothekseintrag trotzdem löschen?`
      : `Bibliothekseintrag „${entry.tree.name}“ wirklich löschen?`;
    if (!globalThis.confirm(warning)) return;
    if (usage.length && !globalThis.confirm(
      `„${entry.tree.name}“ ist in Benutzung. Das Löschen jetzt endgültig bestätigen.`,
    )) return;

    this.subtreeLibrary.remove(entry.tree.id);
    const nextDefinition = this.store.definitions()[0];
    if (nextDefinition) this.loadDefinition(nextDefinition);
    this.notify(`„${entry.tree.name}“ wurde aus der Komponentenbibliothek gelöscht.`);
  }

  private loadDefinition(definition: FlowerDefinition, catalogKey = `definition:${definition.id}`): void {
    const clone = migrateIncomingConnections(definition);
    this.draft.set(clone);
    this.selectedCatalogKey.set(catalogKey);
    this.graphPositions.set(materializePositions(clone));
    this.subtreeAnchorIds.set(new Set());
    this.selectNode(clone.rootNodeId);
  }

  private definitionWithEditorState(): FlowerDefinition {
    return {
      ...this.draft(),
      editor: {nodePositions: structuredClone(this.graphPositions())},
    };
  }

  private definitionFromComponent(tree: FlowerSubtreeDefinition, role: 'flower' | 'component'): FlowerDefinition {
    const rootPosition = {x: 500, y: 840};
    const relativePositions = tree.editor?.nodePositions ?? {};
    return {
      schemaVersion: 2,
      id: tree.id,
      name: tree.name,
      catalogRole: role,
      catalogIcon: {symbol: '✿', color: this.draft().catalogIcon?.color ?? '#5b8d53'},
      rootNodeId: tree.rootNodeId,
      stem: structuredClone(this.draft().stem),
      nodes: structuredClone(tree.nodes),
      editor: {
        nodePositions: Object.fromEntries(tree.nodes.map((node) => {
          const relative = relativePositions[node.id] ?? {x: 0, y: 0};
          return [node.id, {
            x: rootPosition.x + relative.x,
            y: rootPosition.y + relative.y,
          }];
        })),
      },
    };
  }

  private previewColorFromDefinition(definition: FlowerDefinition): string {
    return [...definition.nodes].reverse().find((node) => node.graphic)?.graphic?.color ?? '#5b8d53';
  }

  private updateSelectedNode(update: (node: FlowerNodeDefinition) => FlowerNodeDefinition): void {
    const selectedId = this.selectedNodeId();
    this.draft.update((draft) => ({
      ...draft,
      nodes: draft.nodes.map((node) => node.id === selectedId ? update(node) : node),
    }));
  }

  private updateIncoming(
    update: (incoming: FlowerNodeIncomingConnection) => FlowerNodeIncomingConnection,
  ): void {
    this.updateSelectedNode((node) => ({...node, incoming: update(nodeIncomingOrDefault(node))}));
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

function normalizeSearch(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss');
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
