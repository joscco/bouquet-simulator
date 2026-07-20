import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  input,
  output,
  signal,
} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {MatTooltipModule} from '@angular/material/tooltip';
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
import {SettingsDrawerComponent} from '../../shared/settings-drawer/settings-drawer.component';

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
    SettingsDrawerComponent,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bouquet-side-panel.component.html',
})
export class BouquetSidePanelComponent implements OnDestroy {
  readonly backgroundOptions = BOUQUET_BACKGROUND_OPTIONS;
  readonly sceneEffectOptions = BOUQUET_SCENE_EFFECT_OPTIONS;
  readonly videoFormatOptions = BOUQUET_VIDEO_FORMAT_OPTIONS;
  readonly menuOpen = input.required<boolean>();
  readonly activeBouquetName = input.required<string>();
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
  readonly modelExporting = input.required<boolean>();
  readonly backgroundMode = input.required<BouquetBackgroundMode>();
  readonly sceneEffects = input.required<BouquetSceneEffects>();
  readonly videoFormat = input.required<BouquetVideoFormat>();
  readonly settingsExtentRatio = input(0.5);

  readonly expandedDisclosure = signal<DisclosureSection | null>(null);
  readonly resetConfirmationPending = signal(false);

  readonly pickerOpen = output<void>();
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
  readonly bouquetNameChange = output<string>();
  readonly videoExport = output<void>();
  readonly modelExport = output<void>();
  readonly backgroundModeChange = output<BouquetBackgroundMode>();
  readonly sceneEffectChange = output<{effectId: BouquetSceneEffectId; enabled: boolean}>();
  readonly videoFormatChange = output<BouquetVideoFormatId>();
  readonly settingsExtentRatioChange = output<number>();

  private resetConfirmationTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnDestroy(): void {
    if (this.resetConfirmationTimer !== null) clearTimeout(this.resetConfirmationTimer);
  }

  requestReset(): void {
    if (!this.resetConfirmationPending()) {
      if (this.resetConfirmationTimer !== null) clearTimeout(this.resetConfirmationTimer);
      this.resetConfirmationPending.set(true);
      this.resetConfirmationTimer = setTimeout(() => {
        this.resetConfirmationPending.set(false);
        this.resetConfirmationTimer = null;
      }, 3000);
      return;
    }
    if (this.resetConfirmationTimer !== null) clearTimeout(this.resetConfirmationTimer);
    this.resetConfirmationTimer = null;
    this.resetConfirmationPending.set(false);
    this.bouquetReset.emit();
  }

  setDisclosureExpanded(section: DisclosureSection, expanded: boolean): void {
    if (expanded) {
      this.expandedDisclosure.set(section);
      return;
    }
    if (this.expandedDisclosure() === section) this.expandedDisclosure.set(null);
  }
}
