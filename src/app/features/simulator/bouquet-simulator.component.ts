import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import {MatSnackBar, MatSnackBarModule} from '@angular/material/snack-bar';
import {gsap} from 'gsap';
import {BouquetStore} from '../../core/state/bouquet.store';
import {BouquetCanvasComponent} from '../../shared/bouquet-canvas/bouquet-canvas.component';
import {downloadJson, readJsonFile} from '../../shared/download-json';
import {ProjectExport} from '../../core/models/flower.models';
import {
  DEFAULT_VASE_ID,
  DEFAULT_VASE_MATERIAL_ID,
  VASE_MATERIAL_OPTIONS,
  VASE_OPTIONS,
  VaseMaterialId,
} from '../../core/data/vases';
import {isAvailableInBouquet} from '../../core/models/flower-catalog';
import {ViewSwitcherComponent} from '../../shared/view-switcher.component';
import {
  BouquetFlowerListItem,
  BouquetSidePanelComponent,
} from './bouquet-side-panel.component';
import {BouquetFlowerPickerComponent} from './bouquet-flower-picker.component';
import {BouquetProjectStorage} from './bouquet-project-storage.service';
import {FlowerDefinitionStorage} from '../../core/state/flower-definition-storage.service';
import {detectBouquetFlowerOverlaps} from '../../core/rendering/bouquet-flower-overlaps';

@Component({
  selector: 'app-bouquet-simulator',
  imports: [
    MatSnackBarModule,
    BouquetCanvasComponent,
    ViewSwitcherComponent,
    BouquetSidePanelComponent,
    BouquetFlowerPickerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bouquet-simulator.component.html',
})
export class BouquetSimulatorComponent implements OnDestroy {
  private static readonly MENU_ANIMATION_SECONDS = 0.32;

  readonly store = inject(BouquetStore);
  private readonly snackBar = inject(MatSnackBar);
  private readonly projectStorage = inject(BouquetProjectStorage);
  private readonly definitionStorage = inject(FlowerDefinitionStorage);
  private readonly flowerNameCollator = new Intl.Collator('de', {numeric: true, sensitivity: 'base'});
  readonly vaseOptions = VASE_OPTIONS;
  readonly vaseMaterialOptions = VASE_MATERIAL_OPTIONS;
  readonly pickerOpen = signal(false);
  readonly menuOpen = signal(false);
  readonly selectedId = signal<string | null>(null);
  readonly bouquetPitch = signal(0);
  readonly zoom = signal(1);
  readonly viewOffset = signal({x: 0, y: 0});
  readonly viewportWidth = signal(typeof window === 'undefined' ? 1280 : window.innerWidth);
  readonly previewInsetLeft = signal(Math.min(64, this.viewportWidth()));
  readonly previewInsets = computed(() => ({
    left: this.previewInsetLeft(),
    right: 0,
    top: 0,
    bottom: 0,
  }));
  readonly bouquetDefinitions = computed(() =>
    this.store.materializedDefinitions().filter(isAvailableInBouquet));
  readonly flowerOverlaps = computed(() => detectBouquetFlowerOverlaps(
    this.store.state(),
    this.store.materializedDefinitions(),
  ));
  readonly overlappingFlowerIds = computed(() => this.flowerOverlaps().flowerIds);
  readonly usedFlowers = computed<BouquetFlowerListItem[]>(() => {
    const definitions = new Map(this.store.definitions().map((definition) => [definition.id, definition]));
    const overlappingIds = this.overlappingFlowerIds();
    return this.store.state().flowers
      .map((flower) => {
        const definition = definitions.get(flower.definitionId);
        return {
          instanceId: flower.instanceId,
          name: definition?.name ?? 'Unbekannte Blume',
          symbol: definition?.catalogIcon?.symbol ?? '✿',
          color: definition?.catalogIcon?.color ?? '#5b8d53',
          lengthPercent: Math.round((1 - (flower.cutRatio ?? 0)) * 100),
          rotationDegrees: normalizedDegrees(flower.rotationY ?? 0),
          overlapping: overlappingIds.has(flower.instanceId),
        };
      })
      .sort((left, right) =>
        this.flowerNameCollator.compare(left.name, right.name)
        || left.instanceId.localeCompare(right.instanceId));
  });
  readonly rotationDegrees = computed(() => {
    const normalized = this.store.state().rotation * 180 / Math.PI % 360;
    return Math.round(normalized < 0 ? normalized + 360 : normalized);
  });
  readonly activeVaseId = computed(() => this.store.state().vaseId ?? DEFAULT_VASE_ID);
  readonly activeVaseMaterialId = computed(() =>
    this.store.state().vaseMaterialId as VaseMaterialId | undefined ?? DEFAULT_VASE_MATERIAL_ID);

  private menuLayoutTween: {kill: () => void} | null = null;

  constructor() {
    this.projectStorage.restoreProject(this.definitionStorage.restoredFromStorage);
    effect(() => this.definitionStorage.trySaveDefinitions(this.store.definitions()));
    effect(() => this.projectStorage.persistProject(this.store.exportProject()));
  }

  @HostListener('window:resize')
  updateViewportWidth(): void {
    this.viewportWidth.set(window.innerWidth);
    this.cancelMenuLayoutTween();
    this.previewInsetLeft.set(this.targetPreviewInset(this.menuOpen()));
  }

  toggleMenu(): void {
    const open = !this.menuOpen();
    this.menuOpen.set(open);
    this.animateMenuLayout(open);
  }

  ngOnDestroy(): void {
    this.cancelMenuLayoutTween();
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

  shuffleBouquet(): void {
    this.store.shuffleBouquet();
    this.selectedId.set(null);
  }

  addBouquet(): void {
    this.store.addBouquet();
    this.resetTransientView();
  }

  selectBouquet(bouquetId: string): void {
    this.store.selectBouquet(bouquetId);
    this.resetTransientView();
  }

  deleteBouquet(bouquetId: string): void {
    this.store.removeBouquet(bouquetId);
    this.resetTransientView();
  }

  setFlowerLength(instanceId: string, lengthPercent: number): void {
    this.store.setFlowerCut(instanceId, (100 - lengthPercent) / 100);
  }

  setFlowerRotation(instanceId: string, rotationDegrees: number): void {
    this.store.setFlowerRotation(instanceId, rotationDegrees * Math.PI / 180);
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
    this.resetTransientView();
    this.store.setRotation(0);
  }

  removeFlower(instanceId: string): void {
    this.store.removeFlower(instanceId);
    if (this.selectedId() === instanceId) this.selectedId.set(null);
  }

  resetBouquet(): void {
    this.store.resetBouquet();
    this.resetTransientView();
  }

  setRotationFromDegrees(value: string | number): void {
    this.store.setRotation(Number(value) * Math.PI / 180);
  }

  setVase(vaseId: string): void {
    this.store.setVase(vaseId);
  }

  setVaseMaterial(vaseMaterialId: VaseMaterialId): void {
    this.store.setVaseMaterial(vaseMaterialId);
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
      this.resetTransientView();
    } catch (error: unknown) {
      this.snackBar.open(error instanceof Error ? error.message : 'Die Datei konnte nicht gelesen werden.');
    } finally {
      input.value = '';
    }
  }

  private animateMenuLayout(open: boolean): void {
    this.cancelMenuLayoutTween();

    const layout = {
      inset: this.previewInsetLeft(),
      x: this.viewOffset().x,
      y: this.viewOffset().y,
    };
    const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    if (reducedMotion) {
      this.previewInsetLeft.set(this.targetPreviewInset(open));
      this.viewOffset.set({x: 0, y: 0});
      return;
    }

    this.menuLayoutTween = gsap.to(layout, {
      inset: this.targetPreviewInset(open),
      x: 0,
      y: 0,
      duration: BouquetSimulatorComponent.MENU_ANIMATION_SECONDS,
      ease: 'power3.out',
      onUpdate: () => {
        this.previewInsetLeft.set(layout.inset);
        this.viewOffset.set({x: layout.x, y: layout.y});
      },
      onComplete: () => {
        this.menuLayoutTween = null;
        this.previewInsetLeft.set(this.targetPreviewInset(open));
        this.viewOffset.set({x: 0, y: 0});
      },
    });
  }

  private cancelMenuLayoutTween(): void {
    this.menuLayoutTween?.kill();
    this.menuLayoutTween = null;
  }

  private targetPreviewInset(open: boolean): number {
    return Math.min(open ? 424 : 64, this.viewportWidth());
  }

  private resetTransientView(): void {
    this.selectedId.set(null);
    this.bouquetPitch.set(0);
    this.zoom.set(1);
    this.viewOffset.set({x: 0, y: 0});
  }
}

function normalizedDegrees(radians: number): number {
  const degrees = Math.round(radians * 180 / Math.PI) % 360;
  return degrees < 0 ? degrees + 360 : degrees;
}
