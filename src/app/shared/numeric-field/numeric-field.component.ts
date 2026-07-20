import {ChangeDetectionStrategy, Component, input, output} from '@angular/core';
import {clamp, formatNumericInputValue} from '../../core/utils/numbers';
import {DragNumberInputDirective} from '../drag-number-input/drag-number-input.directive';

@Component({
  selector: 'app-numeric-field',
  imports: [DragNumberInputDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {'class': 'block min-w-0'},
  templateUrl: './numeric-field.component.html',
})
export class NumericFieldComponent {
  readonly formatInputValue = formatNumericInputValue;
  readonly label = input.required<string>();
  readonly value = input.required<number>();
  readonly minimum = input<number | undefined>(undefined);
  readonly maximum = input<number | undefined>(undefined);
  readonly step = input(0.1);
  readonly unit = input('');
  readonly valueChange = output<number>();

  setValue(value: number): void {
    if (!Number.isFinite(value)) return;
    const minimum = this.minimum() ?? Number.NEGATIVE_INFINITY;
    const maximum = this.maximum() ?? Number.POSITIVE_INFINITY;
    this.valueChange.emit(clamp(value, minimum, maximum));
  }
}
