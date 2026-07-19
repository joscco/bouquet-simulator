import {ChangeDetectionStrategy, Component, computed, input, signal} from '@angular/core';
import {BouquetState, FlowerDefinition} from '../../../../core/models/flower.models';
import {materializeDefinitionComponents} from '../../../../core/models/flower-components';
import {BouquetCanvasComponent} from '../../../../shared/bouquet-canvas/bouquet-canvas.component';
import {Point} from '../../graph/flower-editor-graph';
import {clamp} from '../../../../core/utils/numbers';
import {TranslocoPipe} from '@jsverse/transloco';
import {PreviewToolbarComponent} from '../../../../shared/preview-toolbar/preview-toolbar.component';

@Component({
  selector: 'app-flower-editor-preview',
  imports: [BouquetCanvasComponent, PreviewToolbarComponent, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './flower-editor-preview.component.html',
  host: {'class': 'contents'},
})
export class FlowerEditorPreviewComponent {
  readonly definition = input.required<FlowerDefinition>();
  readonly catalogDefinitions = input.required<FlowerDefinition[]>();
  readonly highlightedNodeIds = input<ReadonlySet<string>>(new Set<string>());
  readonly highlightedConnection = input<{sourceId: string; index: number} | null>(null);
  readonly viewportInsets = input({left: 0, right: 0, top: 0, bottom: 0});
  readonly zoom = signal(1);
  readonly viewOffset = signal<Point>({x: 0, y: 0});
  readonly seed = signal(0.42);
  readonly rotation = signal(0);
  readonly pitch = signal(0);
  readonly definitions = computed(() => materializeDefinitionComponents([
    this.definition(),
    ...this.catalogDefinitions().filter((definition) => definition.id !== this.definition().id),
  ]));
  readonly hasRenderableRoot = computed(() =>
    this.definition().nodes.some((node) => node.id === this.definition().rootNodeId));
  readonly state = computed<BouquetState>(() => ({
    schemaVersion: 2,
    rotation: this.rotation(),
    flowers: this.hasRenderableRoot() ? [{
      instanceId: 'editor-preview',
      definitionId: this.definition().id,
      x: 0,
      y: 0,
      z: 0,
      scale: 1,
      seed: this.seed(),
      nodeOffsets: {},
    }] : [],
  }));

  regenerate(): void {
    this.seed.set(Math.random());
  }

  orbit(delta: {yaw: number; pitch: number}): void {
    this.rotation.update((rotation) => rotation + delta.yaw);
    this.pitch.update((pitch) => clamp(pitch + delta.pitch, -Math.PI * 0.48, Math.PI * 0.48));
  }

  pan(delta: {dx: number; dy: number}): void {
    this.viewOffset.update((offset) => ({x: offset.x + delta.dx, y: offset.y + delta.dy}));
  }

  resetView(): void {
    this.viewOffset.set({x: 0, y: 0});
    this.pitch.set(0);
    this.rotation.set(0);
    this.zoom.set(1);
  }
}
