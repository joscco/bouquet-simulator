import {ChangeDetectionStrategy, Component, computed, input, output} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MatIconModule} from '@angular/material/icon';
import {MatTooltipModule} from '@angular/material/tooltip';
import {
  FlowerDefinition,
  FlowerNodeDefinition,
  FlowerNodeGraphic,
  FlowerNodeIncomingConnection,
  GraphicPrimitive,
  NumberRange,
} from '../../../../core/models/flower.models';
import {
  DEFAULT_INCOMING_CONNECTION,
  incomingConnectionReference,
  nodeIncomingOrDefault,
} from '../../../../core/models/flower-connections';
import {BUILT_IN_GRAPHICS, canonicalGraphicPrimitive} from '../../../../core/rendering/graphic-geometries';
import {graphicRotationSettings} from '../../../../core/rendering/graphic-orientation';
import {IntervalSliderComponent} from '../../../../shared/interval-slider/interval-slider.component';
import {NumericFieldComponent} from '../../../../shared/numeric-field/numeric-field.component';
import {NumericSliderComponent} from '../../../../shared/numeric-slider/numeric-slider.component';
import {definitionOutputNodeIds} from '../../domain/flower-editor-definition';
import {Point, createGraphLayout} from '../../graph/flower-editor-graph';
import {loopOutputNodeIds, pruneDisconnectedLoopMembers} from '../../domain/flower-editor-loops';

@Component({
  selector: 'app-flower-editor-inspector',
  imports: [
    FormsModule,
    MatIconModule,
    MatTooltipModule,
    IntervalSliderComponent,
    NumericFieldComponent,
    NumericSliderComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './flower-editor-inspector.component.html',
  host: {
    'class': 'min-w-0 overflow-x-hidden bg-white lg:col-start-1 lg:row-start-1 lg:min-h-0 lg:overflow-y-scroll lg:border-r lg:border-stone-200 lg:p-3 [scrollbar-gutter:stable]',
  },
})
export class FlowerEditorInspectorComponent {
  readonly definition = input.required<FlowerDefinition>();
  readonly positions = input.required<Record<string, Point>>();
  readonly selectedNodeId = input.required<string>();

  readonly definitionChange = output<FlowerDefinition>();
  readonly positionsChange = output<Record<string, Point>>();
  readonly nodeSelection = output<string>();
  readonly message = output<string>();

  readonly graphicPrimitives = BUILT_IN_GRAPHICS;
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
    const source = this.selectedNode();
    if (!source) return;
    const existing = new Set(this.definition().nodes.map((node) => node.id));
    let suffix = 2;
    let id = `${source.id}-copy`;
    while (existing.has(id)) id = `${source.id}-copy-${suffix++}`;
    const node: FlowerNodeDefinition = {
      ...structuredClone(source),
      id,
      name: `${source.name} Kopie`,
      connections: [],
    };
    const sourcePosition = this.positions()[source.id] ?? {x: 500, y: 300};
    this.positionsChange.emit({
      ...this.positions(),
      [id]: {
        x: clamp(sourcePosition.x + 44, 90, 910),
        y: clamp(sourcePosition.y - 54, 55, 625),
      },
    });
    this.updateDefinition((definition) => ({...definition, nodes: [...definition.nodes, node]}));
    this.nodeSelection.emit(id);
  }

  removeSelectedNode(): void {
    const id = this.selectedNodeId();
    if (id === this.definition().rootNodeId) {
      this.message.emit('Der Basisknoten bleibt erhalten.');
      return;
    }
    this.updateDefinition((definition) => pruneDisconnectedLoopMembers({
      ...definition,
      nodes: definition.nodes
        .filter((node) => node.id !== id)
        .map((node) => ({
          ...node,
          connections: node.connections.filter((connection) => connection.childId !== id),
          loop: node.loop ? {
            ...node.loop,
            startNodeId: node.loop.startNodeId === id ? null : node.loop.startNodeId,
            endNodeId: node.loop.endNodeId === id ? null : node.loop.endNodeId,
            memberNodeIds: node.loop.memberNodeIds?.filter((memberId) => memberId !== id),
            continuationOutputNodeIds: node.loop.continuationOutputNodeIds?.filter((outputId) => outputId !== id),
          } : undefined,
        })),
    }).definition);
    const positions = {...this.positions()};
    delete positions[id];
    this.positionsChange.emit(positions);
    this.nodeSelection.emit(this.definition().rootNodeId);
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
    this.updateSelectedNode((node) => node.graphic ? {
      ...node,
      graphic: {
        ...node.graphic,
        offset: {...(node.graphic.offset ?? {x: 0, y: 0, z: 0}), [key]: Number(value)},
      },
    } : node);
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

  updateGraphicBend(key: 'bendMain' | 'bendCross', value: number): void {
    this.updateSelectedNode((node) => node.graphic
      ? {...node, graphic: {...node.graphic, [key]: Number(value)}}
      : node);
  }

  graphicRotationRange(graphic: FlowerNodeGraphic): NumberRange {
    const {base, spread} = graphicRotationSettings(graphic);
    return {min: Math.round(base - spread), max: Math.round(base + spread)};
  }

  updateGraphicRotationRange(rotation: NumberRange): void {
    const minimum = Math.min(rotation.min, rotation.max);
    const maximum = Math.max(rotation.min, rotation.max);
    this.updateGraphicRotationSettings(
      (minimum + maximum) / 2,
      Math.min(180, (maximum - minimum) / 2),
    );
  }

  updateGraphicOrientation(orientation: NonNullable<FlowerNodeGraphic['orientation']>): void {
    this.updateSelectedNode((node) => node.graphic
      ? {...node, graphic: {...node.graphic, orientation}}
      : node);
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
      randomness: Math.max(0, Math.min(1, Number(percentage) / 100)),
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
    return incoming.stem?.color ?? this.definition().stem.color;
  }

  incomingStemStartWidth(incoming: FlowerNodeIncomingConnection): number {
    return incoming.stem?.startWidth ?? incoming.stem?.width ?? this.definition().stem.width;
  }

  incomingStemEndWidth(incoming: FlowerNodeIncomingConnection): number {
    return incoming.stem?.endWidth
      ?? (incoming.stem?.startWidth !== undefined
        ? incoming.stem.startWidth
        : (incoming.stem?.width ?? this.definition().stem.width) * this.definition().stem.taper);
  }

  incomingStemBend(incoming: FlowerNodeIncomingConnection): number {
    return incoming.stem?.bend ?? this.definition().stem.bend ?? 0;
  }

  incomingStemCurve(incoming: FlowerNodeIncomingConnection): number {
    return incoming.stem?.curve ?? this.definition().stem.curve ?? 14;
  }

  incomingStemBendRotation(incoming: FlowerNodeIncomingConnection): NumberRange {
    return incoming.stem?.bendRotation ?? {min: 0, max: 0};
  }

  updateIncomingStem(key: 'color' | 'startWidth' | 'endWidth' | 'bend' | 'curve', value: string | number): void {
    this.updateIncoming((incoming) => ({
      ...incoming,
      stem: {
        color: key === 'color' ? String(value) : this.incomingStemColor(incoming),
        width: incoming.stem?.width ?? this.definition().stem.width,
        startWidth: key === 'startWidth' ? Number(value) : this.incomingStemStartWidth(incoming),
        endWidth: key === 'endWidth' ? Number(value) : this.incomingStemEndWidth(incoming),
        bend: key === 'bend' ? Number(value) : this.incomingStemBend(incoming),
        curve: key === 'curve' ? Number(value) : this.incomingStemCurve(incoming),
        bendRotation: this.incomingStemBendRotation(incoming),
      },
    }));
  }

  updateIncomingStemBendRotation(bendRotation: NumberRange): void {
    this.updateIncoming((incoming) => ({
      ...incoming,
      stem: {
        color: this.incomingStemColor(incoming),
        width: incoming.stem?.width ?? this.definition().stem.width,
        startWidth: this.incomingStemStartWidth(incoming),
        endWidth: this.incomingStemEndWidth(incoming),
        bend: this.incomingStemBend(incoming),
        curve: this.incomingStemCurve(incoming),
        bendRotation,
      },
    }));
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

  private updateGraphicRotationSettings(base: number, spread: number): void {
    const normalizedBase = Math.max(-180, Math.min(180, base));
    const normalizedSpread = Math.max(0, Math.min(180, spread));
    this.updateSelectedNode((node) => node.graphic ? {
      ...node,
      graphic: {
        ...node.graphic,
        rotationBase: normalizedBase,
        rotationSpread: normalizedSpread,
        rotation: {min: normalizedBase - normalizedSpread, max: normalizedBase + normalizedSpread},
      },
    } : node);
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

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
