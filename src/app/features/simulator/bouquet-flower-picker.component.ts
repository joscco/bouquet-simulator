import {ChangeDetectionStrategy, Component, input, output} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {FlowerDefinition} from '../../core/models/flower.models';
import {FlowerThumbnailComponent} from './components/flower-thumbnail/flower-thumbnail.component';

@Component({
  selector: 'app-bouquet-flower-picker',
  imports: [MatButtonModule, MatIconModule, FlowerThumbnailComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bouquet-flower-picker.component.html',
})
export class BouquetFlowerPickerComponent {
  readonly flowers = input.required<FlowerDefinition[]>();
  readonly flowerSelect = output<string>();
  readonly close = output<void>();
}
