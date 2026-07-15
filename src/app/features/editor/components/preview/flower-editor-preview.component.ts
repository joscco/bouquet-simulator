import {ChangeDetectionStrategy, Component, computed, input, signal} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {MatTooltipModule} from '@angular/material/tooltip';
import {BouquetState, FlowerDefinition} from '../../../../core/models/flower.models';
import {materializeDefinitionComponents} from '../../../../core/models/flower-components';
import {BouquetCanvasComponent} from '../../../../shared/bouquet-canvas/bouquet-canvas.component';
import {Point} from '../../graph/flower-editor-graph';

@Component({
  selector: 'app-flower-editor-preview',
  imports: [BouquetCanvasComponent, MatIconModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './flower-editor-preview.component.html',
  host: {'class': 'contents'},
})
export class FlowerEditorPreviewComponent {
  readonly definition = input.required<FlowerDefinition>();
  readonly catalogDefinitions = input.required<FlowerDefinition[]>();
  readonly highlightedNodeId = input<string | null>(null);
  readonly highlightedConnection = input<{sourceId: string; index: number} | null>(null);

  readonly zoom = signal(1);
  readonly viewOffset = signal<Point>({x: 0, y: 0});
  readonly seed = signal(0.42);
  readonly rotation = signal(0);
  readonly pitch = signal(0);
  readonly definitions = computed(() => materializeDefinitionComponents([
    this.definition(),
    ...this.catalogDefinitions().filter((definition) => definition.id !== this.definition().id),
  ]));
  readonly state = computed<BouquetState>(() => ({
    schemaVersion: 2,
    rotation: this.rotation(),
    flowers: [{
      instanceId: 'editor-preview',
      definitionId: this.definition().id,
      x: 0,
      y: 0,
      z: 0,
      scale: 1,
      seed: this.seed(),
      nodeOffsets: {},
    }],
  }));

  regenerate(): void {
    this.seed.set(Math.random());
  }

  orbit(delta: {yaw: number; pitch: number}): void {
    this.rotation.update((rotation) => rotation + delta.yaw);
    this.pitch.update((pitch) =>
      Math.max(-Math.PI * 0.48, Math.min(Math.PI * 0.48, pitch + delta.pitch)));
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
