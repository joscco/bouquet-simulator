import {ChangeDetectionStrategy, Component, input, output, signal} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {MatSliderModule} from '@angular/material/slider';
import {MatTooltipModule} from '@angular/material/tooltip';
import {BouquetSummary} from '../../core/state/bouquet.store';
import {VaseMaterialId, VaseMaterialOption, VaseOption} from '../../core/data/vases';
import {NumericSliderComponent} from '../../shared/numeric-slider/numeric-slider.component';
import {
  BouquetBackgroundMode,
  BouquetSceneEffectId,
  BouquetSceneEffects,
} from '../../core/models/flower.models';
import {
  BOUQUET_BACKGROUND_OPTIONS,
  BOUQUET_SCENE_EFFECT_OPTIONS,
} from '../../core/data/bouquet-scene';
import {
  BOUQUET_VIDEO_FORMAT_OPTIONS,
  BouquetVideoFormat,
  BouquetVideoFormatId,
} from './domain/bouquet-video-format';

type QuickAction = 'shuffle' | 'viewReset' | 'bouquetReset';
type FlowerAction = 'copy' | 'remove';

export interface BouquetFlowerListItem {
  instanceId: string;
  name: string;
  symbol: string;
  color: string;
  lengthPercent: number;
  rotationDegrees: number;
  overlapping: boolean;
}

@Component({
  selector: 'app-bouquet-side-panel',
  imports: [MatIconModule, MatSliderModule, MatTooltipModule, NumericSliderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bouquet-side-panel.component.html',
})
export class BouquetSidePanelComponent {
  readonly backgroundOptions = BOUQUET_BACKGROUND_OPTIONS;
  readonly sceneEffectOptions = BOUQUET_SCENE_EFFECT_OPTIONS;
  readonly videoFormatOptions = BOUQUET_VIDEO_FORMAT_OPTIONS;
  readonly quickActions: ReadonlyArray<{
    action: QuickAction;
    icon: string;
    label: string;
    danger?: boolean;
  }> = [
    {action: 'shuffle', icon: 'shuffle', label: 'Mix'},
    {action: 'viewReset', icon: 'center_focus_strong', label: 'Fokus'},
    {action: 'bouquetReset', icon: 'delete_sweep', label: 'Leeren', danger: true},
  ];

  readonly flowerActions: ReadonlyArray<{
    action: FlowerAction;
    icon: string;
    tooltip: string;
    ariaVerb: string;
    danger?: boolean;
  }> = [
    {action: 'copy', icon: 'add_circle', tooltip: 'Blume kopieren', ariaVerb: 'kopieren'},
    {action: 'remove', icon: 'delete', tooltip: 'Blume löschen', ariaVerb: 'löschen', danger: true},
  ];

  readonly menuOpen = input.required<boolean>();
  readonly bouquets = input.required<BouquetSummary[]>();
  readonly activeBouquetId = input.required<string>();
  readonly activeBouquetName = input.required<string>();
  readonly canAddBouquet = input.required<boolean>();
  readonly flowers = input.required<BouquetFlowerListItem[]>();
  readonly overlapCount = input.required<number>();
  readonly selectedId = input.required<string | null>();
  readonly rotationDegrees = input.required<number>();
  readonly vaseOptions = input.required<readonly VaseOption[]>();
  readonly activeVaseId = input.required<string>();
  readonly vaseMaterialOptions = input.required<readonly VaseMaterialOption[]>();
  readonly activeVaseMaterialId = input.required<VaseMaterialId>();
  readonly videoExportSupported = input.required<boolean>();
  readonly videoExporting = input.required<boolean>();
  readonly videoExportProgress = input.required<number>();
  readonly backgroundMode = input.required<BouquetBackgroundMode>();
  readonly sceneEffects = input.required<BouquetSceneEffects>();
  readonly videoFormat = input.required<BouquetVideoFormat>();

  readonly pickerOpen = output<void>();
  readonly shuffle = output<void>();
  readonly viewReset = output<void>();
  readonly bouquetReset = output<void>();
  readonly selectionChange = output<string>();
  readonly lengthChange = output<{instanceId: string; lengthPercent: number}>();
  readonly flowerRotationChange = output<{instanceId: string; rotationDegrees: number}>();
  readonly overlapCorrection = output<void>();
  readonly flowerCopy = output<string>();
  readonly flowerRemove = output<string>();
  readonly rotationChange = output<number>();
  readonly vaseChange = output<string>();
  readonly vaseMaterialChange = output<VaseMaterialId>();
  readonly projectImport = output<Event>();
  readonly projectExport = output<void>();
  readonly menuToggle = output<void>();
  readonly bouquetAdd = output<void>();
  readonly bouquetSelect = output<string>();
  readonly bouquetDelete = output<string>();
  readonly bouquetNameChange = output<string>();
  readonly videoExport = output<void>();
  readonly backgroundModeChange = output<BouquetBackgroundMode>();
  readonly sceneEffectChange = output<{effectId: BouquetSceneEffectId; enabled: boolean}>();
  readonly videoFormatChange = output<BouquetVideoFormatId>();

  readonly deletingBouquetId = signal<string | null>(null);

  deleteActiveBouquet(): void {
    if (this.bouquets().length <= 1 || this.deletingBouquetId()) return;
    const bouquetId = this.activeBouquetId();
    this.deletingBouquetId.set(bouquetId);
    setTimeout(() => {
      this.bouquetDelete.emit(bouquetId);
      this.deletingBouquetId.set(null);
    }, 180);
  }

  emitQuickAction(action: QuickAction): void {
    switch (action) {
      case 'shuffle':
        this.shuffle.emit();
        return;
      case 'viewReset':
        this.viewReset.emit();
        return;
      case 'bouquetReset':
        this.bouquetReset.emit();
        return;
    }
  }

  emitFlowerAction(action: FlowerAction, instanceId: string): void {
    switch (action) {
      case 'copy':
        this.flowerCopy.emit(instanceId);
        return;
      case 'remove':
        this.flowerRemove.emit(instanceId);
        return;
    }
  }
}
