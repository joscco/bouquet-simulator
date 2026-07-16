import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {MatTooltipModule} from '@angular/material/tooltip';
import {BouquetSummary} from '../../core/state/bouquet.store';
import {VaseMaterialId, VaseMaterialOption, VaseOption} from '../../core/data/vases';
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
import {EditorDisclosureComponent} from '../../shared/editor-disclosure/editor-disclosure.component';
import {SliderTrackComponent} from '../../shared/slider-track/slider-track.component';
import {AppButtonComponent} from '../../shared/app-button/app-button.component';
import {TranslocoPipe} from '@jsverse/transloco';
import {
  BouquetFlowerListItem,
  BouquetFlowerListItemComponent,
} from './components/bouquet-flower-list-item/bouquet-flower-list-item.component';
import {VaseIconComponent} from './components/vase-icon/vase-icon.component';

type QuickAction = 'shuffle' | 'viewReset' | 'bouquetReset';
type DisclosureSection = 'vase' | 'scene' | 'files';

@Component({
  selector: 'app-bouquet-side-panel',
  imports: [
    MatIconModule,
    MatTooltipModule,
    EditorDisclosureComponent,
    SliderTrackComponent,
    AppButtonComponent,
    BouquetFlowerListItemComponent,
    VaseIconComponent,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bouquet-side-panel.component.html',
})
export class BouquetSidePanelComponent implements OnDestroy {
  readonly backgroundOptions = BOUQUET_BACKGROUND_OPTIONS;
  readonly sceneEffectOptions = BOUQUET_SCENE_EFFECT_OPTIONS;
  readonly videoFormatOptions = BOUQUET_VIDEO_FORMAT_OPTIONS;
  readonly quickActions: ReadonlyArray<{
    action: QuickAction;
    icon: string;
    labelKey: string;
    tooltipKey: string;
    danger?: boolean;
  }> = [
    {action: 'shuffle', icon: 'shuffle', labelKey: 'bouquet.shuffle', tooltipKey: 'bouquet.shuffleHint'},
    {action: 'viewReset', icon: 'center_focus_strong', labelKey: 'bouquet.view', tooltipKey: 'bouquet.viewHint'},
    {
      action: 'bouquetReset',
      icon: 'delete_sweep',
      labelKey: 'bouquet.reset',
      tooltipKey: 'bouquet.resetHint',
      danger: true,
    },
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

  readonly expandedDisclosure = signal<DisclosureSection | null>(null);
  private readonly resetConfirmationBouquetId = signal<string | null>(null);
  readonly resetConfirmationPending = computed(() =>
    this.resetConfirmationBouquetId() === this.activeBouquetId());

  readonly pickerOpen = output<void>();
  readonly shuffle = output<void>();
  readonly viewReset = output<void>();
  readonly bouquetReset = output<void>();
  readonly selectionChange = output<string>();
  readonly lengthChange = output<{instanceId: string; lengthPercent: number}>();
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
  private bouquetDeletionTimer: ReturnType<typeof setTimeout> | null = null;
  private resetConfirmationTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnDestroy(): void {
    if (this.bouquetDeletionTimer !== null) clearTimeout(this.bouquetDeletionTimer);
    if (this.resetConfirmationTimer !== null) clearTimeout(this.resetConfirmationTimer);
  }

  deleteActiveBouquet(): void {
    if (this.bouquets().length <= 1 || this.deletingBouquetId()) return;
    const bouquetId = this.activeBouquetId();
    this.deletingBouquetId.set(bouquetId);
    this.bouquetDeletionTimer = setTimeout(() => {
      this.bouquetDelete.emit(bouquetId);
      this.deletingBouquetId.set(null);
      this.bouquetDeletionTimer = null;
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
        if (this.resetConfirmationBouquetId() !== this.activeBouquetId()) {
          if (this.resetConfirmationTimer !== null) clearTimeout(this.resetConfirmationTimer);
          this.resetConfirmationBouquetId.set(this.activeBouquetId());
          this.resetConfirmationTimer = setTimeout(() => {
            this.resetConfirmationBouquetId.set(null);
            this.resetConfirmationTimer = null;
          }, 3000);
          return;
        }
        if (this.resetConfirmationTimer !== null) clearTimeout(this.resetConfirmationTimer);
        this.resetConfirmationTimer = null;
        this.resetConfirmationBouquetId.set(null);
        this.bouquetReset.emit();
        return;
    }
  }

  setDisclosureExpanded(section: DisclosureSection, expanded: boolean): void {
    if (expanded) {
      this.expandedDisclosure.set(section);
      return;
    }
    if (this.expandedDisclosure() === section) this.expandedDisclosure.set(null);
  }
}
