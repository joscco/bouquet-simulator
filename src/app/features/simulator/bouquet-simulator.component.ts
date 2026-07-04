import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {BouquetStore} from '../../core/state/bouquet.store';
import {BouquetCanvasComponent} from '../../shared/bouquet-canvas/bouquet-canvas.component';
import {downloadJson, readJsonFile} from '../../shared/download-json';
import {FlowerDefinition, ProjectExport} from '../../core/models/flower.models';

@Component({
  selector: 'app-bouquet-simulator',
  imports: [BouquetCanvasComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bouquet-simulator.component.html',
})
export class BouquetSimulatorComponent {
  readonly store = inject(BouquetStore);
  readonly pickerOpen = signal(false);
  readonly selectedId = signal<string | null>(null);
  readonly importError = signal('');
  readonly rotationDegrees = computed(() => {
    const normalized = this.store.state().rotation * 180 / Math.PI % 360;
    return Math.round(normalized < 0 ? normalized + 360 : normalized);
  });

  addFlower(definitionId: string): void {
    this.store.addFlower(definitionId);
    this.pickerOpen.set(false);
  }

  moveNode(event: {instanceId: string; nodeId: string; dx: number; dy: number}): void {
    this.store.moveNode(event.instanceId, event.nodeId, event.dx, event.dy);
  }

  deleteSelected(): void {
    const selectedId = this.selectedId();
    if (!selectedId) return;
    this.store.removeFlower(selectedId);
    this.selectedId.set(null);
  }

  resetSelectedNodes(): void {
    const selectedId = this.selectedId();
    if (selectedId) this.store.resetNodeOffsets(selectedId);
  }

  setRotationFromDegrees(value: string): void {
    this.store.setRotation(Number(value) * Math.PI / 180);
  }

  previewGraphic(definition: FlowerDefinition): string {
    const source = [...definition.nodes].reverse().find((node) => node.graphic)?.graphic?.svg;
    if (!source) return '';
    return source.startsWith('data:')
      ? source
      : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source.trim())}`;
  }

  exportProject(): void {
    downloadJson(this.store.exportProject(), 'mein-blumenstrauss.json');
  }

  async importProject(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      this.store.importProject(await readJsonFile<ProjectExport>(file));
      this.importError.set('');
      this.selectedId.set(null);
    } catch (error: unknown) {
      this.importError.set(error instanceof Error ? error.message : 'Die Datei konnte nicht gelesen werden.');
    } finally {
      input.value = '';
    }
  }
}
