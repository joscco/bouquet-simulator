import {ChangeDetectionStrategy, Component, input, output} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {MatTooltipModule} from '@angular/material/tooltip';
import {AppButtonComponent} from '../../../../shared/app-button/app-button.component';
import {SliderTrackComponent} from '../../../../shared/slider-track/slider-track.component';
import {TranslocoPipe} from '@jsverse/transloco';

export interface BouquetFlowerListItem {
  instanceId: string;
  name: string;
  lengthPercent: number;
  overlapping: boolean;
}

type FlowerAction = 'copy' | 'remove';

@Component({
  selector: 'app-bouquet-flower-list-item',
  imports: [MatIconModule, MatTooltipModule, AppButtonComponent, SliderTrackComponent, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {'class': 'block'},
  templateUrl: './bouquet-flower-list-item.component.html',
})
export class BouquetFlowerListItemComponent {
  readonly flower = input.required<BouquetFlowerListItem>();
  readonly selected = input(false);
  readonly selectionChange = output<string>();
  readonly lengthChange = output<{instanceId: string; lengthPercent: number}>();
  readonly flowerCopy = output<string>();
  readonly flowerRemove = output<string>();

  readonly actions: ReadonlyArray<{
    action: FlowerAction;
    icon: string;
    tooltipKey: string;
    ariaVerbKey: string;
    danger?: boolean;
  }> = [
    {action: 'copy', icon: 'content_copy', tooltipKey: 'flowerItem.copy', ariaVerbKey: 'flowerItem.copyVerb'},
    {action: 'remove', icon: 'delete', tooltipKey: 'flowerItem.remove', ariaVerbKey: 'flowerItem.removeVerb', danger: true},
  ];

  emitAction(action: FlowerAction): void {
    const instanceId = this.flower().instanceId;
    if (action === 'copy') this.flowerCopy.emit(instanceId);
    else this.flowerRemove.emit(instanceId);
  }
}
