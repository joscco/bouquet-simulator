import {ChangeDetectionStrategy, Component, input, output, signal} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {MatSliderModule} from '@angular/material/slider';
import {MatTooltipModule} from '@angular/material/tooltip';
import {BouquetSummary} from '../../core/state/bouquet.store';
import {VaseOption} from '../../core/data/vases';

type QuickAction = 'shuffle' | 'viewReset' | 'bouquetReset';
type FlowerAction = 'copy' | 'remove';

export interface BouquetFlowerListItem {
  instanceId: string;
  name: string;
  symbol: string;
  color: string;
  lengthPercent: number;
}

@Component({
  selector: 'app-bouquet-side-panel',
  imports: [MatIconModule, MatSliderModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bouquet-side-panel.component.html',
  styles: `
    .panel-button {
      display: flex;
      min-width: 0;
      height: 2.5rem;
      align-items: center;
      justify-content: center;
      gap: .5rem;
      border: 1px solid rgb(231 229 228);
      border-radius: .5rem;
      background: rgb(255 255 255);
      padding: 0 .75rem;
      color: rgb(68 64 60);
      font-size: .75rem;
      font-weight: 600;
      line-height: 1rem;
      box-shadow: 0 1px 2px 0 rgb(0 0 0 / .05);
      transition: color 150ms ease, background-color 150ms ease, border-color 150ms ease;
    }

    .panel-button:hover {
      border-color: rgb(214 211 209);
      background: rgb(250 250 249);
    }

    .panel-button--compact {
      gap: .375rem;
      padding: 0 .5rem;
    }

    .panel-button--danger {
      border-color: rgb(254 205 211);
      color: rgb(190 18 60);
    }

    .panel-button--danger:hover {
      border-color: rgb(253 164 175);
      background: rgb(255 241 242);
    }

    .panel-button__icon {
      flex: 0 0 auto;
    }

    .panel-button__label {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .icon-button {
      display: grid;
      flex: 0 0 auto;
      place-items: center;
      width: 2rem;
      height: 2rem;
      border-radius: .5rem;
      color: rgb(120 113 108);
      transition: color 150ms ease, background-color 150ms ease;
    }

    .icon-button:hover {
      background: rgb(245 245 244);
      color: rgb(28 25 23);
    }

    .icon-button:disabled {
      pointer-events: none;
      opacity: .3;
    }

    .icon-button--sm {
      width: 1.75rem;
      height: 1.75rem;
      border-radius: .375rem;
    }

    .icon-button--lg {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: .75rem;
    }

    .icon-button--danger:hover {
      background: rgb(255 241 242);
      color: rgb(190 18 60);
    }

    .icon-button--primary {
      background: rgb(2 44 34);
      color: rgb(255 255 255);
    }

    .icon-button--primary:hover {
      background: rgb(6 78 59);
      color: rgb(255 255 255);
    }

    .bouquet-rail-item {
      animation: bouquetRailIn 180ms cubic-bezier(.2, .8, .2, 1);
      transform-origin: center;
    }

    .bouquet-rail-item--removing {
      animation: bouquetRailOut 180ms cubic-bezier(.4, 0, 1, 1) forwards;
      pointer-events: none;
    }

    @keyframes bouquetRailIn {
      from {
        opacity: 0;
        transform: translateY(-6px) scale(.82);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes bouquetRailOut {
      to {
        opacity: 0;
        transform: translateY(8px) scale(.72);
      }
    }
  `,
})
export class BouquetSidePanelComponent {
  readonly quickActions: ReadonlyArray<{
    action: QuickAction;
    icon: string;
    label: string;
    danger?: boolean;
  }> = [
    {action: 'shuffle', icon: 'shuffle', label: 'Mischen'},
    {action: 'viewReset', icon: 'center_focus_strong', label: 'Focus'},
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
  readonly selectedId = input.required<string | null>();
  readonly rotationDegrees = input.required<number>();
  readonly vaseOptions = input.required<readonly VaseOption[]>();
  readonly activeVaseId = input.required<string>();

  readonly pickerOpen = output<void>();
  readonly shuffle = output<void>();
  readonly viewReset = output<void>();
  readonly bouquetReset = output<void>();
  readonly selectionChange = output<string>();
  readonly lengthChange = output<{instanceId: string; lengthPercent: number}>();
  readonly flowerCopy = output<string>();
  readonly flowerRemove = output<string>();
  readonly rotationChange = output<number>();
  readonly vaseChange = output<string>();
  readonly projectImport = output<Event>();
  readonly projectExport = output<void>();
  readonly menuToggle = output<void>();
  readonly bouquetAdd = output<void>();
  readonly bouquetSelect = output<string>();
  readonly bouquetDelete = output<string>();
  readonly bouquetNameChange = output<string>();

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
