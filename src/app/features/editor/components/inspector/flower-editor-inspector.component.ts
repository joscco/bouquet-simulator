import {ChangeDetectionStrategy, Component, computed, input, output, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MatIconModule} from '@angular/material/icon';
import {MatTooltipModule} from '@angular/material/tooltip';
import {
  FlowerDefinition,
  FlowerNodeGrowthOrientation,
  FlowerNodeDefinition,
  FlowerNodeGraphic,
  FlowerNodeIncomingConnection,
  GraphicLeafEdgeSettings,
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
import {
  BUILT_IN_GRAPHICS,
  canonicalGraphicPrimitive,
} from '../../../../core/rendering/graphic-geometries';
import {graphicRotationSettings} from '../../../../core/rendering/graphic-orientation';
import {clamp} from '../../../../core/utils/numbers';
import {IntervalSliderComponent} from '../../../../shared/interval-slider/interval-slider.component';
import {NumericFieldComponent} from '../../../../shared/numeric-field/numeric-field.component';
import {NumericSliderComponent} from '../../../../shared/numeric-slider/numeric-slider.component';
import {EditorDisclosureComponent} from '../../../../shared/editor-disclosure/editor-disclosure.component';
import {TranslocoPipe} from '@jsverse/transloco';
import {AppButtonComponent} from '../../../../shared/app-button/app-button.component';
import {loopOutputNodeIds} from '../../domain/flower-editor-loops';
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
import {GraphicLeafEdgeEditorComponent} from './graphic-leaf-edge-editor.component';

@Component({
  selector: 'app-flower-editor-inspector',
  imports: [
    AppButtonComponent,
    FormsModule,
    MatIconModule,
    MatTooltipModule,
    IntervalSliderComponent,
    NumericFieldComponent,
    NumericSliderComponent,
    EditorDisclosureComponent,
    GraphicLeafEdgeEditorComponent,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './flower-editor-inspector.component.html',
  host: {
    'class': 'block h-auto min-h-0 min-w-0 overflow-x-hidden overflow-y-visible bg-white',
  },
})
export class FlowerEditorInspectorComponent {
  readonly maximumGraphicBend = MAX_GRAPHIC_BEND;
  readonly definition = input.required<FlowerDefinition>();
  readonly selectedNodeId = input.required<string>();
  readonly selectedNodeIds = input<ReadonlySet<string>>(new Set());

  readonly definitionChange = output<FlowerDefinition>();

  readonly connectionSectionExpanded = signal(true);
  readonly loopSectionExpanded = signal(true);
  readonly graphicBasicsExpanded = signal(true);
  readonly graphicShapeExpanded = signal(true);
  readonly graphicPositionExpanded = signal(false);
  readonly graphicBendExpanded = signal(false);
  readonly graphicPatternsExpanded = signal(false);

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
  readonly editedNodeIds = computed<ReadonlySet<string>>(() => {
    const selected = this.selectedNodeIds();
    return selected.size ? selected : new Set([this.selectedNodeId()]);
  });
  readonly selectedNodes = computed(() => {
    const ids = this.editedNodeIds();
    return this.definition().nodes.filter((node) => ids.has(node.id));
  });
  readonly multiSelection = computed(() => this.selectedNodes().length > 1);
  readonly allSelectedSupportIncoming = computed(() => this.selectedNodes().length > 0
    && this.selectedNodes().every((node) => !node.loop && node.id !== this.definition().rootNodeId));
  readonly allSelectedComponents = computed(() => this.selectedNodes().length > 0
    && this.selectedNodes().every((node) => !!node.component));
  readonly allSelectedLoops = computed(() => this.selectedNodes().length > 0
    && this.selectedNodes().every((node) => !!node.loop));
  readonly allSelectedBasicNodes = computed(() => this.selectedNodes().length > 0
    && this.selectedNodes().every((node) => !node.component && !node.loop));
  readonly allSelectedHaveGraphic = computed(() => this.selectedNodes().length > 0
    && this.selectedNodes().every((node) => !!node.graphic));
  readonly allSelectedLeafGraphics = computed(() => this.allSelectedHaveGraphic()
    && this.selectedNodes().every((node) =>
      canonicalGraphicPrimitive(node.graphic!.primitive ?? 'leaf-pointed') === 'leaf-pointed'));
  readonly allSelectedSphereGraphics = computed(() => this.allSelectedHaveGraphic()
    && this.selectedNodes().every((node) =>
      canonicalGraphicPrimitive(node.graphic!.primitive ?? 'leaf-pointed') === 'sphere'));
  readonly allSelectedShareGraphicPatterns = computed(() => {
    if (!this.allSelectedHaveGraphic()) return false;
    const signatures = this.selectedNodes().map((node) =>
      (node.graphic!.patterns ?? []).map((pattern) => `${pattern.id}:${pattern.type}`).join('|'));
    return new Set(signatures).size === 1;
  });
  readonly selectedIncoming = computed(() =>
    incomingConnectionReference(this.definition(), this.selectedNodeId()));
  readonly incomingSettings = computed(() => {
    const node = this.selectedNode();
    return node ? nodeIncomingOrDefault(node) : structuredClone(DEFAULT_INCOMING_CONNECTION);
  });

  setHasGraphic(value: boolean): void {
    this.updateSelectedNode((node) => withGraphicEnabled(node, value));
  }

  updateGraphic(
    key: 'width' | 'height' | 'depth' | 'twist' | 'ribCount' | 'ribDepth',
    value: number,
  ): void {
    const normalized = key === 'ribCount' ? Math.round(Number(value)) : Number(value);
    this.updateSelectedNode((node) => withGraphicPatch(node, {[key]: normalized}));
  }

  updateGraphicOffset(key: 'x' | 'y' | 'z', value: number): void {
    this.updateSelectedNode((node) => withGraphicOffset(node, key, value));
  }

  updateGraphicPrimitive(primitive: GraphicPrimitive): void {
    this.updateSelectedNode((node) => withGraphicPatch(node, {primitive}));
  }

  updateGraphicLeafEdge(value: GraphicLeafEdgeSettings): void {
    this.updateSelectedNode((node) => withGraphicPatch(node, {leafEdge: value}));
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

  updateGraphicBend(key: 'bendMain' | 'bendCross', value: number): void {
    const profileKey = key === 'bendMain' ? 'bendMainProfile' : 'bendCrossProfile';
    this.updateSelectedNode((node) => withGraphicPatch(node, {
      [key]: Number(value),
      [profileKey]: undefined,
    }));
  }

  allSelectedHaveGraphicBendProfile(direction: 'main' | 'cross'): boolean {
    return this.selectedNodes().length > 0 && this.selectedNodes().every((node) =>
      !!node.graphic && hasGraphicBendProfile(node.graphic, direction));
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

  updateIncomingRange(group: 'repeat' | 'length', value: NumberRange): void {
    this.updateIncoming((incoming) => ({...incoming, [group]: value}));
  }

  updateIncomingDirection(
    key: 'x' | 'y' | 'z',
    value: number,
  ): void {
    this.updateIncoming((incoming) => ({
      ...incoming,
      direction: {...incoming.direction!, [key]: Number(value)},
    }));
  }

  updateIncomingSpreadRange(
    key: 'deviation' | 'revolution' | 'roll',
    value: NumberRange,
  ): void {
    this.updateIncoming((incoming) => ({
      ...incoming,
      spread: {...incoming.spread!, [key]: value},
    }));
  }

  updateIncomingGrowthOrientation(orientation: FlowerNodeGrowthOrientation): void {
    this.updateIncoming((incoming) => ({
      ...incoming,
      spread: {...incoming.spread!, orientation},
    }));
  }

  incomingRandomness(incoming: FlowerNodeIncomingConnection): number {
    return Math.round(incoming.spread!.randomness * 100);
  }

  updateIncomingRandomness(percentage: number): void {
    this.updateIncoming((incoming) => ({
      ...incoming,
      spread: {
        ...incoming.spread!,
        randomness: clamp(Number(percentage) / 100, 0, 1),
      },
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

  private updateSelectedNode(update: (node: FlowerNodeDefinition) => FlowerNodeDefinition): void {
    const selectedIds = this.editedNodeIds();
    this.updateDefinition((definition) => ({
      ...definition,
      nodes: definition.nodes.map((node) => selectedIds.has(node.id) ? update(node) : node),
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
