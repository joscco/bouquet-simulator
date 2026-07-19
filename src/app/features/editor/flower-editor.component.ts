import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
  computed,
  effect,
  inject,
  isDevMode,
  signal,
  untracked,
} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MatIconModule} from '@angular/material/icon';
import {MatSnackBarModule} from '@angular/material/snack-bar';
import {MatTooltipModule} from '@angular/material/tooltip';
import {BouquetStore} from '../../core/state/bouquet.store';
import {
  FlowerDefinition,
  FlowerNodeDefinition,
} from '../../core/models/flower.models';
import {
  DEFAULT_INCOMING_CONNECTION,
  incomingConnectionReference,
  migrateIncomingConnections,
} from '../../core/models/flower-connections';
import {validateFlowerDefinition} from '../../core/models/flower-validation';
import {materializeDefinitionComponents} from '../../core/models/flower-components';
import {downloadBlob, downloadJson, readJsonFile} from '../../shared/download-json';
import {FlowerSubtreeLibrary} from '../../core/state/flower-subtree-library';
import {EditorNotifications} from './services/editor-notifications.service';
import {FlowerEditorPersistence} from './services/flower-editor-persistence.service';
import {FlowerEditorUrlState} from './services/flower-editor-url-state.service';
import {FLOWER_CREATION_DEFAULTS} from '../../core/models/flower-creation-defaults';
import {
  FlowerSubtreeDefinition,
  createFlowerSubtree,
  extractFlowerSubtreeComponent,
  insertFlowerDefinitionReference,
  insertFlowerSubtree,
  isFlowerSubtreeDefinition,
  resolveFlowerSubtreeSelection,
} from '../../core/models/flower-subtree';
import {
  Point,
  createCompactGraphPositions,
  createGraphLayout,
  materializePositions,
  nextEditorNodePosition,
} from './graph/flower-editor-graph';
import {AppButtonComponent} from '../../shared/app-button/app-button.component';
import {TranslocoPipe, TranslocoService} from '@jsverse/transloco';
import {createFlowerLoop} from './domain/flower-editor-loop-creation';
import {
  FlowerEditorTreeComponent,
  FlowerEditorTreeMessage,
} from './components/tree/flower-editor-tree.component';
import {FlowerEditorPreviewComponent} from './components/preview/flower-editor-preview.component';
import {FlowerEditorInspectorComponent} from './components/inspector/flower-editor-inspector.component';
import {
  FlowerComponentCatalogEntry,
  catalogEntryType,
  definitionFromComponent,
  definitionWithEditorState,
  normalizeSearch,
} from './domain/flower-editor-definition';
import {
  resolveFlowerEditorForest,
  withDerivedFlowerRoot,
} from './domain/flower-editor-roots';
import {
  createEmptyFlowerDefinition,
  createFlowerEditorCatalog,
  duplicateFlowerDefinition,
  nextAvailableSlugId,
  normalizeFlowerDefinitionForEditor,
} from './domain/flower-editor-catalog';
import {
  exportBouquetModelGlb,
  flowerModelState,
  glbFilename,
} from '../../shared/bouquet-canvas/exporting/bouquet-model-exporter';
import {
  PreviewLayoutAnimator,
  PreviewLayoutFrame,
} from '../../shared/bouquet-canvas/preview-layout-animator';
import {SettingsDrawerComponent} from '../../shared/settings-drawer/settings-drawer.component';

type EditorTransition =
  | {type: 'catalog'; key: string}
  | {type: 'new'}
  | {type: 'duplicate'}
  | {type: 'import'; definition: FlowerDefinition};

interface EditorHistorySnapshot {
  definition: FlowerDefinition;
  positions: Record<string, Point>;
  selectedNodeId: string;
  signature: string;
}

const MAX_UNDO_STEPS = 30;
const HISTORY_GROUP_WINDOW_MS = 350;

function previewLayoutFrame(insets: {left: number; right: number; top: number; bottom: number}): PreviewLayoutFrame {
  return {...insets, x: 0, y: 0};
}

function previewInsetsFromFrame(frame: PreviewLayoutFrame): {left: number; right: number; top: number; bottom: number} {
  return {left: frame.left, right: frame.right, top: frame.top, bottom: frame.bottom};
}

@Component({
  selector: 'app-flower-editor',
  imports: [
    AppButtonComponent,
    TranslocoPipe,
    FormsModule,
    MatIconModule,
    MatSnackBarModule,
    MatTooltipModule,
    FlowerEditorTreeComponent,
    FlowerEditorPreviewComponent,
    FlowerEditorInspectorComponent,
    SettingsDrawerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './flower-editor.component.html',
  host: {'class': 'block w-full max-w-[100vw] overflow-x-hidden'},
  providers: [EditorNotifications, FlowerEditorPersistence],
})
export class FlowerEditorComponent implements OnDestroy {
  readonly catalogEntryType = catalogEntryType;
  readonly store = inject(BouquetStore);
  private readonly notifications = inject(EditorNotifications);
  private readonly persistence = inject(FlowerEditorPersistence);
  private readonly urlState = inject(FlowerEditorUrlState);
  private readonly subtreeLibrary = inject(FlowerSubtreeLibrary);
  private readonly transloco = inject(TranslocoService);
  readonly isDevelopment = isDevMode();
  readonly draft = signal<FlowerDefinition>(
    migrateIncomingConnections(this.store.definitions()[0]),
  );
  readonly selectedCatalogKey = signal(`definition:${this.draft().id}`);
  private readonly persistedDefinitionId = signal(this.draft().id);
  readonly pendingTransition = signal<EditorTransition | null>(null);
  readonly editorPanelOpen = signal(false);
  readonly graphSectionExpanded = signal(false);
  readonly viewportSize = signal({
    width: typeof window === 'undefined' ? 1280 : window.innerWidth,
    height: typeof window === 'undefined' ? 720 : window.innerHeight,
  });
  readonly portraitLayout = computed(() => {
    const viewport = this.viewportSize();
    return viewport.height >= viewport.width;
  });
  readonly editorPanelExtent = computed(() => {
    const viewport = this.viewportSize();
    return this.portraitLayout()
      ? viewport.height * 0.5
      : viewport.width * 0.5;
  });
  readonly targetPreviewInsets = computed(() => {
    if (!this.editorPanelOpen()) return {left: 0, right: 0, top: 0, bottom: 0};
    return this.portraitLayout()
      ? {left: 0, right: 0, top: 0, bottom: this.editorPanelExtent()}
      : {left: this.editorPanelExtent(), right: 0, top: 0, bottom: 0};
  });
  readonly previewInsets = signal({left: 0, right: 0, top: 0, bottom: 0});
  private readonly previewLayoutAnimator = new PreviewLayoutAnimator();
  readonly catalogSearch = signal(this.draft().name);
  readonly catalogSearchOpen = signal(false);
  readonly selectedNodeId = signal(this.draft().rootNodeId);
  readonly addMenuOpen = signal(false);
  readonly componentSearch = signal('');
  readonly subtreeAnchorIds = signal<Set<string>>(new Set());
  readonly subtreeName = signal('');
  readonly subtreeActionsOpen = signal(false);
  readonly modelExporting = signal(false);
  readonly savedTrees = this.subtreeLibrary.trees;
  readonly catalogEntries = computed<FlowerComponentCatalogEntry[]>(() =>
    createFlowerEditorCatalog(this.store.definitions(), this.savedTrees()));
  readonly componentCatalog = computed(() =>
    this.catalogEntries().filter((entry) => entry.availableAsComponent));
  readonly selectedCatalogEntry = computed(() =>
    this.catalogEntries().find((entry) => entry.key === this.selectedCatalogKey()) ?? null);
  readonly filteredCatalogEntries = computed(() => {
    const query = normalizeSearch(this.catalogSearch());
    if (!query) return this.catalogEntries().slice(0, 8);
    return this.catalogEntries()
      .filter((entry) => normalizeSearch(entry.tree.name).includes(query))
      .slice(0, 8);
  });
  readonly canDeleteSelectedCatalogEntry = computed(() => {
    const entry = this.selectedCatalogEntry();
    return entry !== null && (entry.source === 'saved' || this.store.definitions().length > 1);
  });
  readonly filteredComponentCatalog = computed(() => {
    const query = normalizeSearch(this.componentSearch());
    if (!query) return this.componentCatalog();
    return this.componentCatalog().filter((entry) =>
      normalizeSearch(`${entry.tree.name} ${this.catalogEntryType(entry)} ${entry.source}`).includes(query));
  });
  readonly graphPositions = signal<Record<string, Point>>(
    structuredClone(this.draft().editor?.nodePositions ?? {}),
  );
  private readonly savedSignature = signal('');
  private readonly undoHistory: EditorHistorySnapshot[] = [];
  private lastHistoryRecordAt = 0;
  private lastHistoryGroup = '';
  readonly canUndo = signal(false);
  readonly hasUnsavedChanges = computed(() =>
    this.currentStateSignature() !== this.savedSignature());
  readonly subtreeSelection = computed(() =>
    resolveFlowerSubtreeSelection(this.draft(), this.subtreeAnchorIds()));
  readonly subtreeNodeIds = computed(() => this.subtreeSelection()?.nodeIds ?? new Set<string>());
  readonly previewHighlightedNodeIds = computed<ReadonlySet<string>>(() => {
    if (this.subtreeAnchorIds().size) return this.subtreeNodeIds();
    return new Set([this.selectedNodeId()]);
  });
  readonly selectedIncoming = computed(() =>
    incomingConnectionReference(this.draft(), this.selectedNodeId()));
  readonly selectedNodeName = computed(() =>
    this.draft().nodes.find((node) => node.id === this.selectedNodeId())?.name
      ?? this.transloco.translate('editor.properties'));
  readonly materializedDraft = computed(() => materializeDefinitionComponents([
    this.draft(),
    ...this.store.definitions().filter((definition) => definition.id !== this.draft().id),
  ])[0] ?? this.draft());
  readonly forest = computed(() =>
    resolveFlowerEditorForest(this.draft(), this.selectedNodeId()));
  readonly activeTreeNodeIds = computed<ReadonlySet<string>>(() => this.forest().activeNodeIds);
  readonly graphLayout = computed(() => createGraphLayout(this.materializedDraft(), this.graphPositions()));

  @ViewChild('graphTree') private graphTree?: FlowerEditorTreeComponent;
  @ViewChild('catalogSearchContainer') private catalogSearchContainer?: ElementRef<HTMLElement>;
  @ViewChild(FlowerEditorPreviewComponent) private flowerPreview?: FlowerEditorPreviewComponent;
  constructor() {
    effect(() => {
      const target = this.targetPreviewInsets();
      const current = untracked(this.previewInsets);
      this.previewLayoutAnimator.animate(
        previewLayoutFrame(current),
        previewLayoutFrame(target),
        (frame) => this.previewInsets.set(previewInsetsFromFrame(frame)),
      );
    });
    const requestedCatalogKey = this.urlState.readCatalogKey();
    if (requestedCatalogKey && this.catalogEntries().some((entry) => entry.key === requestedCatalogKey)) {
      this.openCatalogEntry(requestedCatalogKey);
    } else {
      this.graphPositions.set(materializePositions(this.draft()));
      this.urlState.writeCatalogKey(this.selectedCatalogKey());
      this.markCurrentStateSaved();
    }
  }

  @HostListener('document:keydown', ['$event'])
  undoShortcut(event: KeyboardEvent): void {
    if (this.pendingTransition()) return;
    if (!(event.ctrlKey || event.metaKey) || event.shiftKey || event.key.toLowerCase() !== 'z') return;
    event.preventDefault();
    this.undo();
  }

  @HostListener('document:keydown.escape', ['$event'])
  closePortraitOverlayOnEscape(event: Event): void {
    if (!this.editorPanelOpen()) return;
    event.preventDefault();
    this.closePortraitOverlays();
  }

  @HostListener('window:resize')
  updateViewportSize(): void {
    this.viewportSize.set({width: window.innerWidth, height: window.innerHeight});
  }

  @HostListener('document:pointerdown', ['$event'])
  closeCatalogSearchOnOutsidePointer(event: PointerEvent): void {
    if (!this.catalogSearchOpen()) return;
    const container = this.catalogSearchContainer?.nativeElement;
    const target = event.target as Node | null;
    if (container && target && !container.contains(target)) {
      this.catalogSearchOpen.set(false);
    }
  }

  createNewDefinition(): void {
    this.requestTransition({type: 'new'});
  }

  private createNewDefinitionNow(): void {
    const id = this.uniqueDefinitionId('neue-blume');
    const definition = createEmptyFlowerDefinition(id);
    this.store.replaceDefinition(definition);
    this.loadDefinition(definition);
    this.notify('Neue Blume angelegt.');
  }

  duplicateDefinition(): void {
    this.requestTransition({type: 'duplicate'});
  }

  private duplicateDefinitionNow(): void {
    const source = this.definitionWithEditorState();
    const id = this.uniqueDefinitionId(`${source.id}-kopie`);
    const definition = duplicateFlowerDefinition(source, id);
    this.store.replaceDefinition(definition);
    this.loadDefinition(definition);
    this.notify('Blumentyp dupliziert.');
  }

  selectNode(id: string, additive = false): void {
    if (additive) {
      this.toggleSubtreeAnchor(id);
      return;
    }
    if (id && this.draft().nodes.some((node) => node.id === id)) {
      this.draft.update((definition) => withDerivedFlowerRoot(definition, id));
    }
    this.selectedNodeId.set(id);
    this.subtreeAnchorIds.set(new Set());
    this.subtreeActionsOpen.set(false);
  }

  applyDefinitionChange(definition: FlowerDefinition): void {
    const selectedNodeId = definition.nodes.some((node) => node.id === this.selectedNodeId())
      ? this.selectedNodeId()
      : null;
    const normalized = withDerivedFlowerRoot(definition, selectedNodeId);
    if (JSON.stringify(normalized) === JSON.stringify(this.draft())) return;
    this.recordUndo('definition');
    this.draft.set(normalized);
    if (!selectedNodeId) {
      this.selectedNodeId.set(normalized.rootNodeId || normalized.nodes[0]?.id || '');
      this.subtreeAnchorIds.set(new Set());
    }
  }

  clearSubtreeSelection(): void {
    this.subtreeAnchorIds.set(new Set());
    this.subtreeActionsOpen.set(false);
  }

  toggleSubtreeAnchor(id: string): void {
    const previousId = this.selectedNodeId();
    const anchors = new Set(this.subtreeAnchorIds());
    const wasEmpty = anchors.size === 0;
    if (wasEmpty && previousId !== id && this.draft().nodes.some((node) => node.id === previousId)) {
      anchors.add(previousId);
    }
    if (anchors.has(id)) anchors.delete(id);
    else anchors.add(id);
    this.subtreeAnchorIds.set(anchors);
    this.selectedNodeId.set(anchors.has(id) ? id : [...anchors].pop() ?? id);
    this.subtreeActionsOpen.set(false);
    if (wasEmpty && anchors.size && !this.subtreeName().trim()) {
      const selectedName = this.draft().nodes.find((node) => anchors.has(node.id))?.name ?? 'Komponente';
      this.subtreeName.set(`${selectedName} Komponente`);
    }
  }

  toggleSubtreeActions(): void {
    if (!this.subtreeSelection()) {
      this.notify('Wähle mit Shift-Klick mindestens einen zusammenhängenden Knoten aus.');
      return;
    }
    this.addMenuOpen.set(false);
    this.subtreeActionsOpen.update((open) => !open);
  }

  addNode(): void {
    this.addMenuOpen.set(false);
    const existing = new Set(this.draft().nodes.map((node) => node.id));
    let index = this.draft().nodes.length + 1;
    while (existing.has(`node-${index}`)) index++;
    const node: FlowerNodeDefinition = {
      id: `node-${index}`,
      name: `${FLOWER_CREATION_DEFAULTS.node.namePrefix} ${index}`,
      draggable: FLOWER_CREATION_DEFAULTS.node.draggable,
      graphic: null,
      incoming: structuredClone(DEFAULT_INCOMING_CONNECTION),
      connections: [],
    };
    this.recordUndo('structure', true);
    this.graphPositions.update((positions) => ({
      ...positions,
      [node.id]: nextEditorNodePosition(positions, this.selectedNodeId()),
    }));
    this.draft.update((draft) => ({...draft, nodes: [...draft.nodes, node]}));
    this.selectNode(node.id);
  }

  toggleAddMenu(): void {
    this.addMenuOpen.update((open) => !open);
    if (!this.addMenuOpen()) this.componentSearch.set('');
  }

  insertComponentFromAddMenu(entry: FlowerComponentCatalogEntry): void {
    if (entry.source === 'definition') {
      this.insertDefinitionReference(entry.tree.id);
    } else {
      this.insertSavedTree(entry.tree);
    }
    this.addMenuOpen.set(false);
    this.componentSearch.set('');
  }

  addLoop(): void {
    this.addMenuOpen.set(false);
    const selection = this.subtreeSelection()
      ?? resolveFlowerSubtreeSelection(this.draft(), [this.selectedNodeId()]);
    const created = createFlowerLoop(
      this.draft(),
      this.graphPositions(),
      selection,
      this.graphLayout().nodes,
    );
    this.recordUndo('structure', true);
    this.draft.set(created.definition);
    this.graphPositions.set(created.nodePositions);
    if (created.wrappedSelection) this.clearSubtreeSelection();
    this.selectNode(created.loopNodeId);
  }

  autoLayout(): void {
    const positions = createCompactGraphPositions(this.draft());
    this.recordUndo('positions', true);
    this.graphPositions.set(positions);
    this.graphTree?.resetView(positions);
    this.notify('Graph automatisch angeordnet.');
  }

  showTreeMessage(message: FlowerEditorTreeMessage): void {
    if (message.error) this.notifyError(message.text);
    else this.notify(message.text);
  }

  showInspectorMessage(message: string): void {
    this.notify(message);
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
      this.notify('Wähle mit Shift-Klick mindestens einen Knoten aus.');
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
      this.applyDefinitionChange(extracted.definition);
      this.graphPositions.set(extracted.nodePositions);
      this.subtreeAnchorIds.set(new Set());
      this.subtreeName.set('');
      this.selectNode(extracted.insertedNodeId);
      this.notify(`„${name}“ wurde als ein Komponentenknoten extrahiert.`);
    } catch (error: unknown) {
      this.notifyError(error instanceof Error ? error.message : 'Komponente konnte nicht extrahiert werden.');
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
      this.applyDefinitionChange(inserted.definition);
      this.graphPositions.set(inserted.nodePositions);
      this.subtreeAnchorIds.set(new Set());
      this.selectNode(inserted.insertedNodeId);
      this.notify(`„${tree.name}“ wurde als Komponentenknoten angehängt.`);
    } catch (error: unknown) {
      this.notifyError(error instanceof Error ? error.message : 'Komponente konnte nicht eingefügt werden.');
    }
  }

  insertDefinitionReference(definitionId: string): void {
    const parentId = this.selectedNodeId();
    const sourceDefinition = this.store.definitions().find((definition) => definition.id === definitionId);
    if (!sourceDefinition) {
      this.notifyError('Die referenzierte Komponente existiert nicht mehr.');
      return;
    }
    try {
      const inserted = insertFlowerDefinitionReference(
        this.draft(),
        this.graphPositions(),
        sourceDefinition,
        parentId,
      );
      this.applyDefinitionChange(inserted.definition);
      this.graphPositions.set(inserted.nodePositions);
      this.subtreeAnchorIds.set(new Set());
      this.selectNode(inserted.insertedNodeId);
      this.notify(`„${sourceDefinition.name}“ wurde als Referenz angehängt.`);
    } catch (error: unknown) {
      this.notifyError(error instanceof Error ? error.message : 'Komponente konnte nicht eingefügt werden.');
    }
  }

  selectCatalogEntry(key: string): void {
    this.requestTransition({type: 'catalog', key});
  }

  openComponentDefinition(definitionId: string): void {
    const key = `definition:${definitionId}`;
    if (!this.catalogEntries().some((entry) => entry.key === key)) {
      this.notifyError('Die Quelldefinition dieser Komponente existiert nicht mehr.');
      return;
    }
    this.requestTransition({type: 'catalog', key});
  }

  private openCatalogEntry(key: string): void {
    const entry = this.catalogEntries().find((candidate) => candidate.key === key);
    if (!entry) return;
    if (entry.source === 'definition') {
      const definition = this.store.definitions().find((candidate) => candidate.id === entry.tree.id);
      if (definition) this.loadDefinition(definition, key);
      return;
    }
    this.loadDefinition(this.definitionFromComponent(entry.tree, 'component'), key);
  }

  chooseCatalogEntry(entry: FlowerComponentCatalogEntry): void {
    this.selectCatalogEntry(entry.key);
    this.catalogSearchOpen.set(false);
  }

  beginPositionEdit(): void {
    this.recordUndo('positions', true);
  }

  toggleEditorPanel(): void {
    this.editorPanelOpen.update((open) => !open);
  }

  toggleGraphSection(): void {
    this.graphSectionExpanded.update((expanded) => !expanded);
  }

  closePortraitOverlays(): void {
    this.editorPanelOpen.set(false);
  }

  selectNodeFromTree(event: {id: string; additive: boolean}): void {
    this.selectNode(event.id, event.additive);
    if (!event.additive) this.editorPanelOpen.set(true);
  }

  ngOnDestroy(): void {
    this.previewLayoutAnimator.cancel();
  }

  undo(): void {
    let snapshot = this.undoHistory.pop();
    while (snapshot && snapshot.signature === this.currentStateSignature()) {
      snapshot = this.undoHistory.pop();
    }
    this.canUndo.set(this.undoHistory.length > 0);
    if (!snapshot) return;
    this.draft.set(structuredClone(snapshot.definition));
    this.graphPositions.set(structuredClone(snapshot.positions));
    this.selectedNodeId.set(snapshot.definition.nodes.some((node) =>
      node.id === snapshot!.selectedNodeId)
      ? snapshot.selectedNodeId
      : snapshot.definition.rootNodeId);
    this.subtreeAnchorIds.set(new Set());
    this.lastHistoryGroup = '';
    this.lastHistoryRecordAt = 0;
  }

  savePendingChanges(): void {
    const transition = this.pendingTransition();
    if (!transition || !this.saveCurrentDraft()) return;
    this.pendingTransition.set(null);
    this.performTransition(transition);
  }

  discardPendingChanges(): void {
    const transition = this.pendingTransition();
    if (!transition) return;
    this.pendingTransition.set(null);
    if (transition.type === 'duplicate') this.restorePersistedDraft();
    this.performTransition(transition);
  }

  cancelPendingTransition(): void {
    this.pendingTransition.set(null);
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
      this.notifyError(error instanceof Error ? error.message : 'Komponenten-Import fehlgeschlagen.');
    } finally {
      input.value = '';
    }
  }

  saveToCatalog(): void {
    this.saveCurrentDraft();
  }

  private saveCurrentDraft(): boolean {
    const definition = this.definitionWithEditorState();
    if (this.persistence.saveToBrowser(definition, this.persistedDefinitionId())) {
      this.finishDefinitionSave(definition);
      return true;
    }
    return false;
  }

  async saveToDefaults(): Promise<void> {
    if (!this.isDevelopment) return;
    const definition = this.definitionWithEditorState();
    if (await this.persistence.saveToDefaults(definition, this.persistedDefinitionId())) {
      this.finishDefinitionSave(definition);
    }
  }

  async deleteSelectedCatalogEntry(): Promise<void> {
    const entry = this.selectedCatalogEntry();
    if (!entry) return;
    if (entry.source === 'saved') {
      this.deleteSavedCatalogEntry(entry);
      return;
    }
    const definition = this.store.definitions().find((candidate) => candidate.id === entry.tree.id);
    if (!definition) return;
    const nextDefinition = this.persistence.deleteDefinition(definition);
    if (nextDefinition) this.loadDefinition(nextDefinition);
  }

  exportFlower(): void {
    const definition = this.definitionWithEditorState();
    downloadJson(definition, `${definition.id || 'blume'}.flower.json`);
  }

  async exportFlowerModel(seed: number): Promise<void> {
    if (this.modelExporting()) return;
    this.modelExporting.set(true);
    try {
      const definition = this.materializedDraft();
      const blob = await exportBouquetModelGlb(
        flowerModelState(definition, seed),
        [definition],
        {includeVase: false, name: definition.name},
      );
      downloadBlob(blob, glbFilename(definition.name || definition.id, 'blume'));
      this.notify(this.transloco.translate('files.modelExported'));
    } catch {
      this.notifyError(this.transloco.translate('files.modelExportFailed'));
    } finally {
      this.modelExporting.set(false);
    }
  }

  exportCurrentFlowerModel(): void {
    void this.exportFlowerModel(this.flowerPreview?.seed() ?? 0.42);
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
      this.requestTransition({type: 'import', definition});
    } catch (error: unknown) {
      this.notifyError(error instanceof Error ? error.message : 'Import fehlgeschlagen.');
    } finally {
      input.value = '';
    }
  }

  selectDefinition(id: string): void {
    this.selectCatalogEntry(`definition:${id}`);
  }

  private uniqueDefinitionId(seed: string): string {
    return nextAvailableSlugId(
      seed,
      this.store.definitions().map((definition) => definition.id),
      'blume',
    );
  }

  private uniqueSubtreeId(seed: string): string {
    return nextAvailableSlugId(seed, this.savedTrees().map((tree) => tree.id), 'tree');
  }

  private notify(message: string): void {
    this.notifications.show(message);
  }

  private notifyError(message: string): void {
    this.notifications.show(message, 'error');
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
    const clone = normalizeFlowerDefinitionForEditor(definition);
    this.draft.set(clone);
    this.persistedDefinitionId.set(clone.id);
    this.selectedCatalogKey.set(catalogKey);
    this.urlState.writeCatalogKey(catalogKey);
    this.catalogSearch.set(clone.name);
    this.catalogSearchOpen.set(false);
    const positions = materializePositions(clone);
    this.graphPositions.set(positions);
    this.graphTree?.resetView(positions);
    this.subtreeAnchorIds.set(new Set());
    this.selectNode(clone.rootNodeId || clone.nodes[0]?.id || '');
    this.resetUndoHistory();
    this.markCurrentStateSaved();
  }

  private finishDefinitionSave(definition: FlowerDefinition): void {
    this.draft.set(definition);
    this.persistedDefinitionId.set(definition.id);
    const catalogKey = `definition:${definition.id}`;
    this.selectedCatalogKey.set(catalogKey);
    this.urlState.writeCatalogKey(catalogKey);
    this.catalogSearch.set(definition.name);
    this.markCurrentStateSaved();
  }

  private requestTransition(transition: EditorTransition): void {
    if (transition.type === 'catalog' && transition.key === this.selectedCatalogKey()) return;
    this.catalogSearchOpen.set(false);
    if (this.hasUnsavedChanges()) {
      this.pendingTransition.set(transition);
      return;
    }
    this.performTransition(transition);
  }

  private performTransition(transition: EditorTransition): void {
    switch (transition.type) {
      case 'catalog':
        this.openCatalogEntry(transition.key);
        break;
      case 'new':
        this.createNewDefinitionNow();
        break;
      case 'duplicate':
        this.duplicateDefinitionNow();
        break;
      case 'import':
        this.loadDefinition(transition.definition);
        this.notify('Geladen.');
        break;
    }
  }

  private restorePersistedDraft(): void {
    const definition = this.store.definitions().find((candidate) =>
      candidate.id === this.persistedDefinitionId());
    if (!definition) return;
    const clone = normalizeFlowerDefinitionForEditor(definition);
    this.draft.set(clone);
    this.graphPositions.set(materializePositions(clone));
    this.selectedNodeId.set(clone.rootNodeId || clone.nodes[0]?.id || '');
  }

  private recordUndo(group: string, forceNewStep = false): void {
    const now = Date.now();
    if (
      !forceNewStep
      && group === this.lastHistoryGroup
      && now - this.lastHistoryRecordAt < HISTORY_GROUP_WINDOW_MS
    ) return;
    const snapshot = this.currentSnapshot();
    if (this.undoHistory.at(-1)?.signature === snapshot.signature) return;
    this.undoHistory.push(snapshot);
    if (this.undoHistory.length > MAX_UNDO_STEPS) this.undoHistory.shift();
    this.canUndo.set(true);
    this.lastHistoryGroup = group;
    this.lastHistoryRecordAt = now;
  }

  private currentSnapshot(): EditorHistorySnapshot {
    return {
      definition: structuredClone(this.draft()),
      positions: structuredClone(this.graphPositions()),
      selectedNodeId: this.selectedNodeId(),
      signature: this.currentStateSignature(),
    };
  }

  private currentStateSignature(): string {
    return JSON.stringify(definitionWithEditorState(this.draft(), this.graphPositions()));
  }

  private markCurrentStateSaved(): void {
    this.savedSignature.set(this.currentStateSignature());
  }

  private resetUndoHistory(): void {
    this.undoHistory.length = 0;
    this.canUndo.set(false);
    this.lastHistoryGroup = '';
    this.lastHistoryRecordAt = 0;
  }

  private definitionWithEditorState(): FlowerDefinition {
    return withDerivedFlowerRoot(
      definitionWithEditorState(this.draft(), this.graphPositions()),
      this.selectedNodeId(),
    );
  }

  private definitionFromComponent(tree: FlowerSubtreeDefinition, role: 'flower' | 'component'): FlowerDefinition {
    return definitionFromComponent(tree, role, this.draft().stem);
  }
}
