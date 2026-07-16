import {ChangeDetectionStrategy, Component, computed, input, output, signal} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {FlowerDefinition} from '../../core/models/flower.models';
import {FlowerThumbnailComponent} from './components/flower-thumbnail/flower-thumbnail.component';
import {AppButtonComponent} from '../../shared/app-button/app-button.component';
import {TranslocoPipe} from '@jsverse/transloco';

@Component({
  selector: 'app-bouquet-flower-picker',
  imports: [MatIconModule, FlowerThumbnailComponent, AppButtonComponent, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bouquet-flower-picker.component.html',
})
export class BouquetFlowerPickerComponent {
  readonly flowers = input.required<FlowerDefinition[]>();
  readonly search = signal('');
  readonly filteredFlowers = computed(() => {
    const query = this.search().trim().toLocaleLowerCase('de');
    if (!query) return this.flowers();
    return this.flowers().filter((flower) => flower.name.toLocaleLowerCase('de').includes(query));
  });
  readonly flowerSelect = output<string>();
  readonly close = output<void>();
}
