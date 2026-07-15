import {
  ChangeDetectionStrategy,
  Component,
  ViewChild,
  computed,
  inject,
  isDevMode,
  signal,
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
  nodeIncomingOrDefault,
  normalizeConnectionReferences,
} from '../../core/models/flower-connections';
import {validateFlowerDefinition} from '../../core/models/flower-validation';
import {downloadJson, readJsonFile} from '../../shared/download-json';
import {FlowerSubtreeLibrary} from '../../core/state/flower-subtree-library';
import {FlowerDefinitionStorage} from '../../core/state/flower-definition-storage.service';
import {EditorNotifications} from './services/editor-notifications.service';
import {
  FlowerSubtreeDefinition,
  createFlowerDefinitionComponent,
  createFlowerSubtree,
  extractFlowerSubtreeComponent,
  insertFlowerDefinitionReference,
  insertFlowerSubtree,
  isFlowerSubtreeDefinition,
  resolveFlowerSubtreeSelection,
} from '../../core/models/flower-subtree';
import {
  isAvailableAsComponent,
  isAvailableInBouquet,
  normalizeFlowerCatalogCapabilities,
} from '../../core/models/flower-catalog';
import {
  Point,
  createCompactGraphPositions,
  createGraphLayout,
  materializePositions,
} from './graph/flower-editor-graph';
import {ViewSwitcherComponent} from '../../shared/view-switcher.component';
import {loopOutputNodeIds} from './domain/flower-editor-loops';
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
  nodeBounds,
  normalizeSearch,
  selectedExternalConnections,
  slugify,
} from './domain/flower-editor-definition';

@Component({
  selector: 'app-flower-editor',
  imports: [
    FormsModule,
    MatIconModule,
    MatSnackBarModule,
    MatTooltipModule,
    ViewSwitcherComponent,
    FlowerEditorTreeComponent,
    FlowerEditorPreviewComponent,
    FlowerEditorInspectorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './flower-editor.component.html',
  host: {'class': 'block w-full max-w-[100vw] overflow-x-hidden'},
  providers: [EditorNotifications],
})
export class FlowerEditorComponent {
  readonly catalogEntryType = catalogEntryType;
  readonly store = inject(BouquetStore);
  private readonly notifications = inject(EditorNotifications);
  private readonly subtreeLibrary = inject(FlowerSubtreeLibrary);
  private readonly definitionStorage = inject(FlowerDefinitionStorage);
  readonly isDevelopment = isDevMode();
  readonly draft = signal<FlowerDefinition>(
    migrateIncomingConnections(this.store.definitions()[0]),
  );
  readonly selectedCatalogKey = signal(`definition:${this.draft().id}`);
  readonly selectedNodeId = signal(this.draft().rootNodeId);
  readonly addMenuOpen = signal(false);
  readonly componentSearch = signal('');
  readonly subtreeAnchorIds = signal<Set<string>>(new Set());
  readonly subtreeName = signal('');
  readonly subtreeActionsOpen = signal(false);
  readonly savedTrees = this.subtreeLibrary.trees;
  readonly catalogEntries = computed<FlowerComponentCatalogEntry[]>(() => [
    ...this.store.definitions().map((definition) => ({
      key: `definition:${definition.id}`,
      source: 'definition' as const,
      availableInBouquet: isAvailableInBouquet(definition),
      availableAsComponent: isAvailableAsComponent(definition),
      tree: createFlowerDefinitionComponent(migrateIncomingConnections(definition)),
    })),
    ...this.savedTrees().map((tree) => ({
      key: `saved:${tree.id}`,
      source: 'saved' as const,
      availableInBouquet: false,
      availableAsComponent: true,
      tree,
    })),
  ]);
  readonly componentCatalog = computed(() =>
    this.catalogEntries().filter((entry) => entry.availableAsComponent));
  readonly selectedCatalogEntry = computed(() =>
    this.catalogEntries().find((entry) => entry.key === this.selectedCatalogKey()) ?? null);
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
  readonly subtreeSelection = computed(() =>
    resolveFlowerSubtreeSelection(this.draft(), this.subtreeAnchorIds()));
  readonly subtreeNodeIds = computed(() => this.subtreeSelection()?.nodeIds ?? new Set<string>());
  readonly previewHighlightedNodeIds = computed<ReadonlySet<string>>(() => {
    if (this.subtreeAnchorIds().size) return this.subtreeNodeIds();
    return new Set([this.selectedNodeId()]);
  });
  readonly selectedIncoming = computed(() =>
    incomingConnectionReference(this.draft(), this.selectedNodeId()));
  readonly graphLayout = computed(() => createGraphLayout(this.draft(), this.graphPositions()));

  @ViewChild('graphTree') private graphTree?: FlowerEditorTreeComponent;
  constructor() {
    this.graphPositions.set(materializePositions(this.draft()));
  }

  createNewDefinition(): void {
    const id = this.uniqueDefinitionId('neue-blume');
    const definition: FlowerDefinition = {
      schemaVersion: 2,
      id,
      name: 'Neue Blume',
      catalogRole: 'flower',
      availableInBouquet: true,
      availableAsComponent: true,
      rootNodeId: 'base',
      stem: {color: '#426f50', highlightColor: '#82a878', width: 8, taper: 1, bend: 0, curve: 14},
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

  selectNode(id: string, additive = false): void {
    if (additive) {
      this.toggleSubtreeAnchor(id);
      return;
    }
    this.selectedNodeId.set(id);
    this.subtreeAnchorIds.set(new Set());
    this.subtreeActionsOpen.set(false);
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
    const selection = this.subtreeSelection();
    const existing = new Set(this.draft().nodes.map((node) => node.id));
    let index = 1;
    while (existing.has(`loop-${index}`)) index++;
    if (selection) {
      if (selection.rootNodeId === this.draft().rootNodeId) {
        this.notify('Die Basis kann nicht direkt in eine Wiederholung umgewandelt werden.');
        return;
      }
      const memberNodeIds = [...selection.nodeIds];
      const continuationOutputNodeIds = loopOutputNodeIds(this.draft(), memberNodeIds);
      const bounds = nodeBounds(this.graphLayout().nodes.filter((node) => selection.nodeIds.has(node.id)));
      const node: FlowerNodeDefinition = {
        id: `loop-${index}`,
        name: `Wiederholung ${index}`,
        draggable: false,
        graphic: null,
        incoming: selection.rootNodeId === this.draft().rootNodeId
          ? undefined
          : structuredClone(nodeIncomingOrDefault(this.draft().nodes.find((candidate) => candidate.id === selection.rootNodeId)!)),
        connections: selectedExternalConnections(this.draft(), memberNodeIds),
        loop: {
          repeat: {min: 2, max: 4},
          startNodeId: selection.rootNodeId,
          endNodeId: continuationOutputNodeIds[0] ?? selection.rootNodeId,
          memberNodeIds,
          continuationOutputNodeIds,
        },
      };
      this.graphPositions.update((positions) => ({
        ...positions,
        [node.id]: {x: bounds.x, y: bounds.y},
      }));
      this.draft.update((draft) => ({
        ...draft,
        rootNodeId: selection.rootNodeId === draft.rootNodeId ? node.id : draft.rootNodeId,
        nodes: [
          ...draft.nodes.map((candidate) => ({
            ...candidate,
            connections: candidate.connections
              .filter((connection) => !selection.nodeIds.has(candidate.id) || selection.nodeIds.has(connection.childId))
              .map((connection) => connection.childId === selection.rootNodeId ? {...connection, childId: node.id} : connection),
          })),
          node,
        ],
      }));
      this.clearSubtreeSelection();
      this.selectNode(node.id);
      return;
    }
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
    const positions = createCompactGraphPositions(this.draft());
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
      this.draft.set(extracted.definition);
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
      this.draft.set(inserted.definition);
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
      this.draft.set(inserted.definition);
      this.graphPositions.set(inserted.nodePositions);
      this.subtreeAnchorIds.set(new Set());
      this.selectNode(inserted.insertedNodeId);
      this.notify(`„${sourceDefinition.name}“ wurde als Referenz angehängt.`);
    } catch (error: unknown) {
      this.notifyError(error instanceof Error ? error.message : 'Komponente konnte nicht eingefügt werden.');
    }
  }

  selectCatalogEntry(key: string): void {
    const entry = this.catalogEntries().find((candidate) => candidate.key === key);
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
      this.notifyError(error instanceof Error ? error.message : 'Komponenten-Import fehlgeschlagen.');
    } finally {
      input.value = '';
    }
  }

  saveToCatalog(): void {
    const definition = this.definitionWithEditorState();
    const error = validateFlowerDefinition(definition).find((issue) => issue.severity === 'error');
    if (error) {
      this.notifyError(`Speichern nicht möglich: ${error.message}`);
      return;
    }
    const definitions = this.store.definitions().some((candidate) => candidate.id === definition.id)
      ? this.store.definitions().map((candidate) => candidate.id === definition.id ? definition : candidate)
      : [...this.store.definitions(), definition];
    try {
      this.definitionStorage.saveDefinitions(definitions);
      this.draft.set(definition);
      this.store.replaceDefinition(definition);
      this.notify('Im Browser gespeichert.');
    } catch (saveError: unknown) {
      this.notifyError(
        saveError instanceof Error
          ? `Speichern fehlgeschlagen: ${saveError.message}`
          : 'Speichern fehlgeschlagen.',
      );
    }
  }

  async saveToDefaults(): Promise<void> {
    if (!this.isDevelopment) return;
    const definition = this.definitionWithEditorState();
    const error = validateFlowerDefinition(definition).find((issue) => issue.severity === 'error');
    if (error) {
      this.notifyError(`Übernahme nicht möglich: ${error.message}`);
      return;
    }
    const definitions = this.store.definitions().some((candidate) => candidate.id === definition.id)
      ? this.store.definitions().map((candidate) => candidate.id === definition.id ? definition : candidate)
      : [...this.store.definitions(), definition];
    try {
      await this.writeDefinitionsToDefaults(definitions);
      this.draft.set(definition);
      this.store.replaceDefinition(definition);
      this.definitionStorage.trySaveDefinitions(definitions);
      this.notify('In src/app/core/data/default-flowers.ts übernommen.');
    } catch (saveError: unknown) {
      this.notifyError(
        saveError instanceof Error
          ? `Übernahme in Defaults fehlgeschlagen: ${saveError.message}`
          : 'Übernahme in Defaults fehlgeschlagen.',
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
      this.definitionStorage.saveDefinitions(definitions);
      this.store.removeDefinition(definition.id);
      const nextDefinition = definitions[0];
      if (nextDefinition) this.loadDefinition(nextDefinition);
      this.notify(`„${definition.name}“ wurde gelöscht.`);
    } catch (deleteError: unknown) {
      this.notifyError(
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
      this.notifyError(error instanceof Error ? error.message : 'Import fehlgeschlagen.');
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
    this.notifications.show(message);
  }

  private notifyError(message: string): void {
    this.notifications.show(message, 'error');
  }

  private async writeDefinitionsToDefaults(definitions: FlowerDefinition[]): Promise<void> {
    if (!this.isDevelopment) {
      throw new Error('Der Defaults-Server ist nur in der lokalen Entwicklung verfügbar.');
    }
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
    const clone = normalizeFlowerCatalogCapabilities(
      normalizeConnectionReferences(migrateIncomingConnections(definition)),
    );
    this.draft.set(clone);
    this.selectedCatalogKey.set(catalogKey);
    const positions = materializePositions(clone);
    this.graphPositions.set(positions);
    this.subtreeAnchorIds.set(new Set());
    this.selectNode(clone.rootNodeId);
  }

  private definitionWithEditorState(): FlowerDefinition {
    return definitionWithEditorState(this.draft(), this.graphPositions());
  }

  private definitionFromComponent(tree: FlowerSubtreeDefinition, role: 'flower' | 'component'): FlowerDefinition {
    return definitionFromComponent(tree, role, this.draft().stem);
  }
}
