import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatSliderModule} from '@angular/material/slider';
import {MatSnackBar, MatSnackBarModule} from '@angular/material/snack-bar';
import {BouquetStore} from '../../core/state/bouquet.store';
import {BouquetCanvasComponent} from '../../shared/bouquet-canvas/bouquet-canvas.component';
import {downloadJson, readJsonFile} from '../../shared/download-json';
import {FlowerDefinition, ProjectExport} from '../../core/models/flower.models';

@Component({
  selector: 'app-bouquet-simulator',
  imports: [MatButtonModule, MatIconModule, MatSliderModule, MatSnackBarModule, BouquetCanvasComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bouquet-simulator.component.html',
})
export class BouquetSimulatorComponent {
  readonly store = inject(BouquetStore);
  private readonly snackBar = inject(MatSnackBar);
  readonly pickerOpen = signal(false);
  readonly selectedId = signal<string | null>(null);
  readonly bouquetPitch = signal(0);
  readonly rotationDegrees = computed(() => {
    const normalized = this.store.state().rotation * 180 / Math.PI % 360;
    return Math.round(normalized < 0 ? normalized + 360 : normalized);
  });

  addFlower(definitionId: string): void {
    this.store.addFlower(definitionId);
    this.pickerOpen.set(false);
  }

  moveFlower(event: {instanceId: string; dx: number; dy: number; dz: number}): void {
    this.store.moveFlower(event.instanceId, event.dx, event.dy, event.dz);
  }

  orbitBouquet(delta: {yaw: number; pitch: number}): void {
    this.store.rotateBy(delta.yaw);
    this.bouquetPitch.update((pitch) =>
      Math.max(-0.42, Math.min(0.48, pitch + delta.pitch)));
  }

  deleteSelected(): void {
    const selectedId = this.selectedId();
    if (!selectedId) return;
    this.store.removeFlower(selectedId);
    this.selectedId.set(null);
  }

  resetBouquet(): void {
    this.store.resetBouquet();
    this.selectedId.set(null);
    this.bouquetPitch.set(0);
  }

  setRotationFromDegrees(value: string | number): void {
    this.store.setRotation(Number(value) * Math.PI / 180);
  }

  previewGraphic(definition: FlowerDefinition): string {
    return [...definition.nodes].reverse().find((node) => node.graphic)?.graphic?.png ?? '';
  }

  previewColor(definition: FlowerDefinition): string {
    return [...definition.nodes].reverse().find((node) => node.graphic)?.graphic?.color ?? '#5b8d53';
  }

  previewSymbol(definition: FlowerDefinition): string {
    const primitive = [...definition.nodes].reverse().find((node) => node.graphic)?.graphic?.primitive;
    return primitive === 'sphere' ? '●' : primitive === 'rod' ? '┃' : '◆';
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
      this.selectedId.set(null);
      this.bouquetPitch.set(0);
    } catch (error: unknown) {
      this.snackBar.open(error instanceof Error ? error.message : 'Die Datei konnte nicht gelesen werden.');
    } finally {
      input.value = '';
    }
  }
}
