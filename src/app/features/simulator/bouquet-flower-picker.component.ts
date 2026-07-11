import {ChangeDetectionStrategy, Component, input, output} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {FlowerDefinition} from '../../core/models/flower.models';

@Component({
  selector: 'app-bouquet-flower-picker',
  imports: [MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bouquet-flower-picker.component.html',
})
export class BouquetFlowerPickerComponent {
  readonly flowers = input.required<FlowerDefinition[]>();
  readonly flowerSelect = output<string>();
  readonly close = output<void>();

  previewColor(definition: FlowerDefinition): string {
    return definition.catalogIcon?.color ?? '#5b8d53';
  }

  previewSymbol(definition: FlowerDefinition): string {
    return definition.catalogIcon?.symbol ?? '✿';
  }
}
