import {ChangeDetectionStrategy, Component, computed, input, output, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MatIconModule} from '@angular/material/icon';
import {MatTooltipModule} from '@angular/material/tooltip';
import {
  FlowerDefinition,
  FlowerNodeDefinition,
  FlowerNodeGraphic,
  FlowerNodeIncomingConnection,
  GraphicPatternLayer,
  GraphicPatternType,
  GraphicPrimitive,
  MAX_GRAPHIC_BEND,
  NumberRange,
} from '../../../../core/models/flower.models';
import {
  DEFAULT_INCOMING_CONNECTION,
  incomingConnectionReference,
  nodeIncomingOrDefault,
} from '../../../../core/models/flower-connections';
import {BUILT_IN_GRAPHICS, canonicalGraphicPrimitive} from '../../../../core/rendering/graphic-geometries';
import {graphicRotationSettings} from '../../../../core/rendering/graphic-orientation';
import {clamp} from '../../../../core/utils/numbers';
import {IntervalSliderComponent} from '../../../../shared/interval-slider/interval-slider.component';
import {NumericFieldComponent} from '../../../../shared/numeric-field/numeric-field.component';
import {NumericSliderComponent} from '../../../../shared/numeric-slider/numeric-slider.component';
import {EditorDisclosureComponent} from '../../../../shared/editor-disclosure/editor-disclosure.component';
import {definitionOutputNodeIds} from '../../domain/flower-editor-definition';
import {Point, createGraphLayout} from '../../graph/flower-editor-graph';
import {loopOutputNodeIds, pruneDisconnectedLoopMembers} from '../../domain/flower-editor-loops';
import {
  GRAPHIC_PATTERN_OPTIONS,
  graphicPatternLabel,
} from '../../domain/flower-editor-graphic-patterns';
import {
  hasGraphicBendProfile,
  removedGraphicPattern,
  withAddedGraphicPattern,
  withGraphicBendProfile,
  withGraphicBendProfileValue,
  withGraphicEnabled,
  withGraphicOffset,
  withGraphicPatch,
  withGraphicPatternPatch,
  withGraphicRotationRange,
  withMovedGraphicPattern,
  withoutGraphicPattern,
  withRestoredGraphicPattern,
} from '../../domain/flower-editor-graphic-updates';
import {
  IncomingStemProperty,
  incomingStemBend,
  incomingStemBendRotation,
  incomingStemColor,
  incomingStemCurve,
  incomingStemEndWidth,
  incomingStemStartWidth,
  withIncomingStemBendRotation,
  withIncomingStemProperty,
} from '../../domain/flower-editor-incoming-stem';
import {
  duplicateFlowerEditorNode,
  removeFlowerEditorNode,
} from '../../domain/flower-editor-node-updates';

@Component({
  selector: 'app-flower-editor-inspector',
  imports: [
    FormsModule,
    MatIconModule,
    MatTooltipModule,
    IntervalSliderComponent,
    NumericFieldComponent,
    NumericSliderComponent,
    EditorDisclosureComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './flower-editor-inspector.component.html',
  host: {
    'class': 'block h-full min-h-0 min-w-0 overflow-x-hidden overflow-y-auto bg-white lg:col-start-1 lg:row-start-1 lg:border-r lg:border-stone-200 [scrollbar-gutter:stable]',
  },
})
export class FlowerEditorInspectorComponent {
  readonly maximumGraphicBend = MAX_GRAPHIC_BEND;
  readonly definition = input.required<FlowerDefinition>();
  readonly positions = input.required<Record<string, Point>>();
  readonly selectedNodeId = input.required<string>();

  readonly definitionChange = output<FlowerDefinition>();
  readonly positionsChange = output<Record<string, Point>>();
  readonly nodeSelection = output<string>();
  readonly message = output<string>();

  readonly definitionSectionExpanded = signal(false);
  readonly connectionSectionExpanded = signal(true);
  readonly loopSectionExpanded = signal(true);
  readonly graphicBasicsExpanded = signal(true);
  readonly graphicPositionExpanded = signal(false);
  readonly graphicBendExpanded = signal(false);
  readonly graphicPatternsExpanded = signal(false);
  readonly graphicOrientationExpanded = signal(false);

  readonly graphicPrimitives = BUILT_IN_GRAPHICS;
  readonly graphicPatternTypes = GRAPHIC_PATTERN_OPTIONS;
  readonly graphicPatternLabel = graphicPatternLabel;
  readonly removedPattern = signal<{
    nodeId: string;
    pattern: GraphicPatternLayer;
    index: number;
  } | null>(null);
  readonly restorablePattern = computed(() => {
    const removed = this.removedPattern();
    return removed?.nodeId === this.selectedNodeId() ? removed : null;
  });
  readonly selectedNode = computed(() =>
    this.definition().nodes.find((node) => node.id === this.selectedNodeId()) ?? null);
  readonly selectedIncoming = computed(() =>
    incomingConnectionReference(this.definition(), this.selectedNodeId()));
  readonly incomingSettings = computed(() => {
    const node = this.selectedNode();
    return node ? nodeIncomingOrDefault(node) : structuredClone(DEFAULT_INCOMING_CONNECTION);
  });

  updateRoot(key: 'id' | 'name', value: string): void {
    this.updateDefinition((definition) => ({...definition, [key]: value}));
  }

  updateCatalogCapability(key: 'availableInBouquet' | 'availableAsComponent', enabled: boolean): void {
    this.updateDefinition((definition) => ({...definition, [key]: enabled}));
  }

  duplicateSelectedNode(): void {
    const update = duplicateFlowerEditorNode(this.definition(), this.positions(), this.selectedNodeId());
    if (!update) return;
    this.definitionChange.emit(update.definition);
    this.positionsChange.emit(update.positions);
    this.nodeSelection.emit(update.selectedNodeId);
  }

  removeSelectedNode(): void {
    const update = removeFlowerEditorNode(this.definition(), this.positions(), this.selectedNodeId());
    this.definitionChange.emit(update.definition);
    this.positionsChange.emit(update.positions);
    this.nodeSelection.emit(update.selectedNodeId);
  }

  updateNodeName(value: string): void {
    this.updateSelectedNode((node) => ({...node, name: value}));
  }

  setHasGraphic(value: boolean): void {
    this.updateSelectedNode((node) => withGraphicEnabled(node, value));
  }

  updateGraphic(key: 'width' | 'height' | 'depth' | 'scale', value: number): void {
    this.updateSelectedNode((node) => withGraphicPatch(node, {[key]: Number(value)}));
  }

  updateGraphicOffset(key: 'x' | 'y' | 'z', value: number): void {
    this.updateSelectedNode((node) => withGraphicOffset(node, key, value));
  }

  updateGraphicPrimitive(primitive: GraphicPrimitive): void {
    this.updateSelectedNode((node) => withGraphicPatch(node, {primitive}));
  }

  updateGraphicColor(color: string): void {
    this.updateSelectedNode((node) => withGraphicPatch(node, {color}));
  }

  addGraphicPattern(type: GraphicPatternType): void {
    const graphic = this.selectedNode()?.graphic;
    if (!graphic || this.graphicPrimitive(graphic) === 'png') return;
    this.updateSelectedNode((node) => withAddedGraphicPattern(node, type));
    this.removedPattern.set(null);
  }

  updateGraphicPattern(id: string, patch: Partial<GraphicPatternLayer>): void {
    this.updateSelectedNode((node) => withGraphicPatternPatch(node, id, patch));
  }

  removeGraphicPattern(id: string): void {
    const node = this.selectedNode();
    const removed = removedGraphicPattern(node, id);
    if (!node || !removed) return;
    this.removedPattern.set({nodeId: node.id, ...removed});
    this.updateSelectedNode((selected) => withoutGraphicPattern(selected, id));
  }

  moveGraphicPattern(id: string, direction: -1 | 1): void {
    this.updateSelectedNode((node) => withMovedGraphicPattern(node, id, direction));
  }

  restoreRemovedPattern(): void {
    const removed = this.restorablePattern();
    if (!removed) return;
    this.updateSelectedNode((node) => withRestoredGraphicPattern(node, removed));
    this.removedPattern.set(null);
  }

  graphicPrimitive(graphic: FlowerNodeGraphic): GraphicPrimitive {
    return canonicalGraphicPrimitive(graphic.primitive ?? 'leaf-pointed');
  }

  isPaintableGraphic(graphic: FlowerNodeGraphic): boolean {
    return this.graphicPrimitives.find((entry) =>
      entry.value === this.graphicPrimitive(graphic))?.organic ?? false;
  }

  updateGraphicBend(key: 'bendMain' | 'bendCross', value: number): void {
    this.updateSelectedNode((node) => withGraphicPatch(node, {[key]: Number(value)}));
  }

  hasGraphicBendProfile(graphic: FlowerNodeGraphic, direction: 'main' | 'cross'): boolean {
    return hasGraphicBendProfile(graphic, direction);
  }

  setGraphicBendProfile(enabled: boolean, direction: 'main' | 'cross'): void {
    this.updateSelectedNode((node) => withGraphicBendProfile(node, enabled, direction));
  }

  updateGraphicBendProfile(
    direction: 'main' | 'cross',
    key: 'base' | 'tip',
    value: number,
  ): void {
    this.updateSelectedNode((node) => withGraphicBendProfileValue(node, direction, key, value));
  }

  graphicRotationRange(graphic: FlowerNodeGraphic): NumberRange {
    const {base, spread} = graphicRotationSettings(graphic);
    return {min: Math.round(base - spread), max: Math.round(base + spread)};
  }

  updateGraphicRotationRange(rotation: NumberRange): void {
    this.updateSelectedNode((node) => withGraphicRotationRange(node, rotation));
  }

  updateGraphicOrientation(orientation: NonNullable<FlowerNodeGraphic['orientation']>): void {
    this.updateSelectedNode((node) => withGraphicPatch(node, {orientation}));
  }

  updateIncomingRange(group: 'repeat' | 'length' | 'angle' | 'azimuth' | 'roll', value: NumberRange): void {
    this.updateIncoming((incoming) => ({...incoming, [group]: value}));
  }

  incomingRandomness(incoming: FlowerNodeIncomingConnection): number {
    return Math.round((incoming.randomness ?? 0.35) * 100);
  }

  updateIncomingRandomness(percentage: number): void {
    this.updateIncoming((incoming) => ({
      ...incoming,
      randomness: clamp(Number(percentage) / 100, 0, 1),
    }));
  }

  updateLoopRepeat(repeat: NumberRange): void {
    this.updateSelectedNode((node) => node.loop ? {...node, loop: {...node.loop, repeat}} : node);
  }

  loopOutputOptions(node: FlowerNodeDefinition): string[] {
    return node.loop?.memberNodeIds ? loopOutputNodeIds(this.definition(), node.loop.memberNodeIds) : [];
  }

  loopOutputEnabled(node: FlowerNodeDefinition, outputId: string): boolean {
    const options = this.loopOutputOptions(node);
    const enabled = node.loop?.continuationOutputNodeIds;
    return enabled?.length ? enabled.includes(outputId) : options.includes(outputId);
  }

  nodeName(nodeId: string): string {
    return this.definition().nodes.find((node) => node.id === nodeId)?.name ?? nodeId;
  }

  toggleLoopOutput(outputId: string, enabled: boolean): void {
    this.updateSelectedNode((node) => {
      if (!node.loop?.memberNodeIds) return node;
      const options = loopOutputNodeIds(this.definition(), node.loop.memberNodeIds);
      const current = new Set(node.loop.continuationOutputNodeIds?.length
        ? node.loop.continuationOutputNodeIds
        : options);
      if (enabled) current.add(outputId);
      else current.delete(outputId);
      return {...node, loop: {
        ...node.loop,
        continuationOutputNodeIds: [...current].filter((id) => options.includes(id)),
      }};
    });
  }

  componentOutputOptions(): string[] {
    return definitionOutputNodeIds(this.definition().nodes);
  }

  componentOutputEnabled(outputId: string): boolean {
    const outputNodeIds = this.definition().outputNodeIds;
    return outputNodeIds !== undefined
      ? outputNodeIds.includes(outputId)
      : this.componentOutputOptions().includes(outputId);
  }

  toggleComponentOutput(outputId: string, enabled: boolean): void {
    const options = this.componentOutputOptions();
    this.updateDefinition((definition) => {
      const current = new Set(definition.outputNodeIds !== undefined ? definition.outputNodeIds : options);
      if (enabled) current.add(outputId);
      else current.delete(outputId);
      return {...definition, outputNodeIds: [...current].filter((id) => options.includes(id))};
    });
  }

  incomingStemColor(incoming: FlowerNodeIncomingConnection): string {
    return incomingStemColor(this.definition(), incoming);
  }

  incomingStemStartWidth(incoming: FlowerNodeIncomingConnection): number {
    return incomingStemStartWidth(this.definition(), incoming);
  }

  incomingStemEndWidth(incoming: FlowerNodeIncomingConnection): number {
    return incomingStemEndWidth(this.definition(), incoming);
  }

  incomingStemBend(incoming: FlowerNodeIncomingConnection): number {
    return incomingStemBend(this.definition(), incoming);
  }

  incomingStemCurve(incoming: FlowerNodeIncomingConnection): number {
    return incomingStemCurve(this.definition(), incoming);
  }

  incomingStemBendRotation(incoming: FlowerNodeIncomingConnection): NumberRange {
    return incomingStemBendRotation(incoming);
  }

  updateIncomingStem(key: IncomingStemProperty, value: string | number): void {
    this.updateIncoming((incoming) => withIncomingStemProperty(this.definition(), incoming, key, value));
  }

  updateIncomingStemBendRotation(bendRotation: NumberRange): void {
    this.updateIncoming((incoming) =>
      withIncomingStemBendRotation(this.definition(), incoming, bendRotation));
  }

  removeIncomingConnection(): void {
    const incoming = this.selectedIncoming();
    if (!incoming) return;
    const positions = new Map(createGraphLayout(this.definition(), this.positions()).nodes
      .map((node) => [node.id, {x: node.x, y: node.y}]));
    const disconnected: FlowerDefinition = {
      ...this.definition(),
      nodes: this.definition().nodes.map((node) => node.id === incoming.sourceId
        ? {...node, connections: node.connections.filter((_, index) => index !== incoming.index)}
        : node),
    };
    const membership = pruneDisconnectedLoopMembers(disconnected);
    this.definitionChange.emit(membership.definition);
    if (membership.removedNodeIds.length) {
      this.positionsChange.emit({
        ...this.positions(),
        ...Object.fromEntries(membership.removedNodeIds
          .filter((id) => positions.has(id))
          .map((id) => [id, positions.get(id)!])),
      });
    }
  }

  private updateSelectedNode(update: (node: FlowerNodeDefinition) => FlowerNodeDefinition): void {
    const selectedId = this.selectedNodeId();
    this.updateDefinition((definition) => ({
      ...definition,
      nodes: definition.nodes.map((node) => node.id === selectedId ? update(node) : node),
    }));
  }

  private updateIncoming(
    update: (incoming: FlowerNodeIncomingConnection) => FlowerNodeIncomingConnection,
  ): void {
    this.updateSelectedNode((node) => ({...node, incoming: update(nodeIncomingOrDefault(node))}));
  }

  private updateDefinition(update: (definition: FlowerDefinition) => FlowerDefinition): void {
    this.definitionChange.emit(update(this.definition()));
  }
}
