import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {MatSnackBar, MatSnackBarModule} from '@angular/material/snack-bar';
import {TranslocoPipe, TranslocoService} from '@jsverse/transloco';
import {BouquetStore} from '../../core/state/bouquet.store';
import {BouquetCanvasComponent} from '../../shared/bouquet-canvas/bouquet-canvas.component';
import {downloadBlob, downloadJson, readJsonFile} from '../../shared/download-json';
import {
  BouquetSceneEffectId,
  ProjectExport,
} from '../../core/models/flower.models';
import {
  DEFAULT_VASE_ID,
  DEFAULT_VASE_MATERIAL_ID,
  VASE_MATERIAL_OPTIONS,
  VASE_OPTIONS,
  VaseMaterialId,
} from '../../core/data/vases';
import {isAvailableInBouquet} from '../../core/models/flower-catalog';
import {
  BouquetSidePanelComponent,
} from './bouquet-side-panel.component';
import {BouquetFlowerListItem} from './components/bouquet-flower-list-item/bouquet-flower-list-item.component';
import {BouquetProjectStorage} from './bouquet-project-storage.service';
import {FlowerDefinitionStorage} from '../../core/state/flower-definition-storage.service';
import {detectBouquetFlowerOverlaps} from '../../core/rendering/bouquet-flower-overlaps';
import {canRecordCanvasVideo} from '../../shared/media/canvas-video-recorder';
import {clamp} from '../../core/utils/numbers';
import {
  DEFAULT_BOUQUET_LIGHT_LEVEL,
  DEFAULT_BOUQUET_SCENE_EFFECTS,
  bouquetBackgroundColor,
  normalizedBouquetLightLevel,
  normalizedBouquetSceneEffects,
} from '../../core/data/bouquet-scene';
import {
  DEFAULT_BOUQUET_VIDEO_FORMAT_ID,
  BouquetVideoFormatId,
  bouquetVideoFormat,
} from './domain/bouquet-video-format';
import {
  exportBouquetModelGlb,
  glbFilename,
} from '../../shared/bouquet-canvas/exporting/bouquet-model-exporter';
import {PreviewLayoutAnimator} from '../../shared/bouquet-canvas/preview-layout-animator';
import {PreviewToolbarComponent} from '../../shared/preview-toolbar/preview-toolbar.component';
import {
  FlowerSearchDialogComponent,
  FlowerSearchEntry,
} from '../../shared/flower-search-dialog/flower-search-dialog.component';

@Component({
  selector: 'app-bouquet-simulator',
  imports: [
    MatSnackBarModule,
    BouquetCanvasComponent,
    BouquetSidePanelComponent,
    PreviewToolbarComponent,
    FlowerSearchDialogComponent,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bouquet-simulator.component.html',
})
export class BouquetSimulatorComponent implements OnDestroy {
  private static readonly MENU_ANIMATION_SECONDS = 0.32;

  readonly store = inject(BouquetStore);
  readonly bouquetCanvas = viewChild.required(BouquetCanvasComponent);
  private readonly snackBar = inject(MatSnackBar);
  private readonly transloco = inject(TranslocoService);
  private readonly projectStorage = inject(BouquetProjectStorage);
  private readonly definitionStorage = inject(FlowerDefinitionStorage);
  private readonly flowerNameCollator = new Intl.Collator('de', {numeric: true, sensitivity: 'base'});
  readonly vaseOptions = VASE_OPTIONS;
  readonly vaseMaterialOptions = VASE_MATERIAL_OPTIONS;
  readonly pickerOpen = signal(false);
  readonly menuOpen = signal(false);
  readonly landscapeSettingsExtentRatio = signal(0.5);
  readonly portraitSettingsExtentRatio = signal(0.5);
  readonly selectedId = signal<string | null>(null);
  readonly bouquetPitch = signal(0);
  readonly zoom = signal(1);
  readonly recenterKey = signal(0);
  readonly viewOffset = signal({x: 0, y: 0});
  readonly videoExporting = signal(false);
  readonly videoExportProgress = signal(0);
  readonly modelExporting = signal(false);
  readonly videoFormatId = signal<BouquetVideoFormatId>(DEFAULT_BOUQUET_VIDEO_FORMAT_ID);
  readonly videoFormat = computed(() => bouquetVideoFormat(this.videoFormatId()));
  readonly videoExportSupported = canRecordCanvasVideo();
  readonly viewportSize = signal({
    width: typeof window === 'undefined' ? 1280 : window.innerWidth,
    height: typeof window === 'undefined' ? 720 : window.innerHeight,
  });
  readonly portraitLayout = computed(() => {
    const viewport = this.viewportSize();
    return viewport.height >= viewport.width;
  });
  readonly settingsPanelExtent = computed(() => {
    const viewport = this.viewportSize();
    return this.portraitLayout()
      ? viewport.height * this.portraitSettingsExtentRatio()
      : viewport.width * this.landscapeSettingsExtentRatio();
  });
  readonly settingsExtentRatio = computed(() => this.portraitLayout()
    ? this.portraitSettingsExtentRatio()
    : this.landscapeSettingsExtentRatio());
  readonly targetPreviewInsets = computed(() => {
    if (!this.menuOpen()) return {left: 0, right: 0, top: 0, bottom: 0};
    return this.portraitLayout()
      ? {left: 0, right: 0, top: 0, bottom: this.settingsPanelExtent()}
      : {left: this.settingsPanelExtent(), right: 0, top: 0, bottom: 0};
  });
  readonly previewInsets = signal({left: 0, right: 0, top: 0, bottom: 0});
  readonly bouquetDefinitions = computed(() =>
    this.store.materializedDefinitions().filter(isAvailableInBouquet));
  readonly bouquetSearchEntries = computed<FlowerSearchEntry[]>(() =>
    this.bouquetDefinitions().map((definition) => ({
      id: definition.id,
      name: definition.name,
      definition,
    })));
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
          lengthPercent: Math.round((1 - (flower.cutRatio ?? 0)) * 100),
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
  readonly lightLevel = computed(() => normalizedBouquetLightLevel(
    this.store.state().lightLevel ?? DEFAULT_BOUQUET_LIGHT_LEVEL,
    this.store.state().backgroundMode,
  ));
  readonly backgroundColor = computed(() => bouquetBackgroundColor(this.lightLevel()));
  readonly sceneEffects = computed(() =>
    normalizedBouquetSceneEffects(this.store.state().sceneEffects ?? DEFAULT_BOUQUET_SCENE_EFFECTS));

  private readonly previewLayoutAnimator = new PreviewLayoutAnimator();

  constructor() {
    this.projectStorage.restoreProject(this.definitionStorage.restoredFromStorage);
    effect(() => this.definitionStorage.trySaveDefinitions(this.store.definitions()));
    effect(() => this.projectStorage.persistProject(this.store.exportProject()));
  }

  @HostListener('window:resize')
  updateViewportSize(): void {
    this.viewportSize.set({width: window.innerWidth, height: window.innerHeight});
    this.previewLayoutAnimator.cancel();
    this.previewInsets.set(this.targetPreviewInsets());
  }

  toggleMenu(): void {
    const open = !this.menuOpen();
    this.menuOpen.set(open);
    this.animateMenuLayout();
  }

  setSettingsExtentRatio(ratio: number): void {
    if (this.portraitLayout()) this.portraitSettingsExtentRatio.set(ratio);
    else this.landscapeSettingsExtentRatio.set(ratio);
    this.previewInsets.set(this.targetPreviewInsets());
  }

  ngOnDestroy(): void {
    this.previewLayoutAnimator.cancel();
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

  orbitBouquet(delta: {yaw: number; pitch: number}): void {
    this.store.rotateBy(delta.yaw);
    this.bouquetPitch.update((pitch) => clamp(
      pitch + delta.pitch,
      -Math.PI * 0.46,
      Math.PI * 0.46,
    ));
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
    this.recenterKey.update((key) => key + 1);
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

  setSceneEffect(event: {effectId: BouquetSceneEffectId; enabled: boolean}): void {
    this.store.setSceneEffect(event.effectId, event.enabled);
  }

  exportProject(): void {
    downloadJson(this.store.exportProject(), 'mein-blumenstrauss.json');
  }

  async exportBouquetModel(): Promise<void> {
    if (this.modelExporting() || this.videoExporting() || !this.store.state().flowers.length) return;
    this.modelExporting.set(true);
    try {
      const blob = await exportBouquetModelGlb(
        this.store.state(),
        this.store.materializedDefinitions(),
        {includeVase: true, name: this.store.activeBouquetName()},
      );
      downloadBlob(blob, glbFilename(this.store.activeBouquetName(), 'mein-blumenstrauss'));
      this.snackBar.open(this.transloco.translate('files.modelExported'), 'OK', {duration: 4000});
    } catch {
      this.snackBar.open(this.transloco.translate('files.modelExportFailed'), 'OK', {duration: 6000});
    } finally {
      this.modelExporting.set(false);
    }
  }

  async exportTurntableVideo(): Promise<void> {
    if (this.videoExporting() || !this.videoExportSupported || !this.store.state().flowers.length) return;
    this.videoExporting.set(true);
    this.videoExportProgress.set(0);
    try {
      const format = this.videoFormat();
      const recording = await this.bouquetCanvas().recordTurntable({
        durationSeconds: 30,
        turns: 5,
        fps: 30,
        width: format.width,
        height: format.height,
        onProgress: (progress) => this.videoExportProgress.set(progress),
      });
      downloadBlob(
        recording.blob,
        `mein-blumenstrauss-loop-${format.width}x${format.height}.${recording.extension}`,
      );
      this.snackBar.open('Das Loop-Video wurde exportiert.', 'OK', {duration: 4000});
    } catch (error: unknown) {
      this.snackBar.open(
        error instanceof Error ? error.message : 'Das Loop-Video konnte nicht exportiert werden.',
        'OK',
        {duration: 6000},
      );
    } finally {
      this.videoExporting.set(false);
      this.videoExportProgress.set(0);
    }
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

  private animateMenuLayout(): void {
    const currentInsets = untracked(this.previewInsets);
    const targetInsets = untracked(this.targetPreviewInsets);
    const current = {
      ...currentInsets,
      x: this.viewOffset().x,
      y: this.viewOffset().y,
    };
    const target = {
      ...targetInsets,
      x: 0,
      y: 0,
    };
    this.previewLayoutAnimator.animate(current, target, (frame) => {
      this.previewInsets.set({
        left: frame.left,
        right: frame.right,
        top: frame.top,
        bottom: frame.bottom,
      });
      this.viewOffset.set({x: frame.x, y: frame.y});
    }, BouquetSimulatorComponent.MENU_ANIMATION_SECONDS);
  }

  private resetTransientView(): void {
    this.selectedId.set(null);
    this.bouquetPitch.set(0);
    this.zoom.set(1);
    this.viewOffset.set({x: 0, y: 0});
  }
}
