import {ChangeDetectionStrategy, Component, HostListener, computed, inject, signal} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatSliderModule} from '@angular/material/slider';
import {MatSnackBar, MatSnackBarModule} from '@angular/material/snack-bar';
import {MatTooltipModule} from '@angular/material/tooltip';
import {RouterLink} from '@angular/router';
import {BouquetStore} from '../../core/state/bouquet.store';
import {BouquetCanvasComponent} from '../../shared/bouquet-canvas/bouquet-canvas.component';
import {downloadJson, readJsonFile} from '../../shared/download-json';
import {BouquetFlower, FlowerDefinition, ProjectExport} from '../../core/models/flower.models';

@Component({
  selector: 'app-bouquet-simulator',
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatSliderModule,
    MatSnackBarModule,
    MatTooltipModule,
    BouquetCanvasComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bouquet-simulator.component.html',
})
export class BouquetSimulatorComponent {
  readonly store = inject(BouquetStore);
  private readonly snackBar = inject(MatSnackBar);
  readonly pickerOpen = signal(false);
  readonly menuOpen = signal(false);
  readonly selectedId = signal<string | null>(null);
  readonly bouquetPitch = signal(0);
  readonly zoom = signal(1);
  readonly viewOffset = signal({x: 0, y: 0});
  readonly viewportWidth = signal(typeof window === 'undefined' ? 1280 : window.innerWidth);
  readonly previewInsets = computed(() => ({
    left: this.menuOpen()
      ? Math.min(424, this.viewportWidth())
      : Math.min(64, this.viewportWidth()),
    right: 0,
    top: 0,
    bottom: 0,
  }));
  readonly bouquetDefinitions = computed(() =>
    this.store.definitions().filter((definition) => (definition.catalogRole ?? 'flower') === 'flower'));
  readonly rotationDegrees = computed(() => {
    const normalized = this.store.state().rotation * 180 / Math.PI % 360;
    return Math.round(normalized < 0 ? normalized + 360 : normalized);
  });

  @HostListener('window:resize')
  updateViewportWidth(): void {
    this.viewportWidth.set(window.innerWidth);
  }

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
    this.viewOffset.set({x: 0, y: 0});
  }

  addFlower(definitionId: string): void {
    this.store.addFlower(definitionId);
    this.pickerOpen.set(false);
  }

  moveFlower(event: {instanceId: string; dx: number; dy: number; dz: number}): void {
    this.store.moveFlower(event.instanceId, event.dx, event.dy, event.dz);
  }

  copyFlower(instanceId: string): void {
    this.store.copyFlower(instanceId);
  }

  setFlowerCut(instanceId: string, value: string | number): void {
    this.store.setFlowerCut(instanceId, Number(value) / 100);
  }

  orbitBouquet(delta: {yaw: number; pitch: number}): void {
    this.store.rotateBy(delta.yaw);
    this.bouquetPitch.update((pitch) =>
      Math.max(-Math.PI * 0.46, Math.min(Math.PI * 0.46, pitch + delta.pitch)));
  }

  panView(delta: {dx: number; dy: number}): void {
    this.viewOffset.update((offset) => ({
      x: offset.x + delta.dx,
      y: offset.y + delta.dy,
    }));
  }

  resetView(): void {
    this.viewOffset.set({x: 0, y: 0});
    this.bouquetPitch.set(0);
    this.zoom.set(1);
    this.store.setRotation(0);
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
    this.zoom.set(1);
    this.viewOffset.set({x: 0, y: 0});
  }

  setRotationFromDegrees(value: string | number): void {
    this.store.setRotation(Number(value) * Math.PI / 180);
  }

  previewColor(definition: FlowerDefinition): string {
    return definition.catalogIcon?.color ?? '#5b8d53';
  }

  previewSymbol(definition: FlowerDefinition): string {
    return definition.catalogIcon?.symbol ?? '✿';
  }

  flowerDefinition(flower: BouquetFlower): FlowerDefinition | null {
    return this.store.definitions().find((definition) => definition.id === flower.definitionId) ?? null;
  }

  flowerName(flower: BouquetFlower): string {
    return this.flowerDefinition(flower)?.name ?? 'Unbekannte Blume';
  }

  flowerSymbol(flower: BouquetFlower): string {
    return this.flowerDefinition(flower)?.catalogIcon?.symbol ?? '✿';
  }

  flowerColor(flower: BouquetFlower): string {
    return this.flowerDefinition(flower)?.catalogIcon?.color ?? '#5b8d53';
  }

  flowerCutPercent(flower: BouquetFlower): number {
    return Math.round((flower.cutRatio ?? 0) * 100);
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
      this.zoom.set(1);
      this.viewOffset.set({x: 0, y: 0});
    } catch (error: unknown) {
      this.snackBar.open(error instanceof Error ? error.message : 'Die Datei konnte nicht gelesen werden.');
    } finally {
      input.value = '';
    }
  }
}
