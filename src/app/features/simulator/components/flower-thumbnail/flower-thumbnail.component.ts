import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';
import {BouquetState, FlowerDefinition} from '../../../../core/models/flower.models';
import {BouquetCanvasComponent} from '../../../../shared/bouquet-canvas/bouquet-canvas.component';
import {FlowerThumbnailCache} from '../../services/flower-thumbnail-cache.service';

@Component({
  selector: 'app-flower-thumbnail',
  imports: [BouquetCanvasComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {'class': 'block h-full w-full'},
  templateUrl: './flower-thumbnail.component.html',
})
export class FlowerThumbnailComponent {
  readonly definition = input.required<FlowerDefinition>();
  readonly cache = inject(FlowerThumbnailCache);
  readonly snapshotKey = computed(() => this.cache.keyFor(this.definition()));
  readonly snapshot = computed(() => this.cache.snapshot(this.snapshotKey()));
  readonly previewDefinitions = computed(() => [this.definition()]);
  readonly previewState = computed<BouquetState>(() => ({
    schemaVersion: 2,
    rotation: -0.38,
    flowers: [{
      instanceId: `thumbnail-${this.definition().id}`,
      definitionId: this.definition().id,
      x: 0,
      y: 0,
      z: 0,
      scale: 1,
      leanX: 0.08,
      leanZ: -0.06,
      seed: 0.417,
      nodeOffsets: {},
    }],
  }));
}
