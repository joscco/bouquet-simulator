import {ChangeDetectionStrategy, Component, input, output} from '@angular/core';
import {clamp} from '../../core/utils/numbers';

@Component({
  selector: 'app-numeric-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {'class': 'block min-w-0'},
  templateUrl: './numeric-field.component.html',
})
export class NumericFieldComponent {
  readonly label = input.required<string>();
  readonly value = input.required<number>();
  readonly minimum = input<number | undefined>(undefined);
  readonly maximum = input<number | undefined>(undefined);
  readonly step = input(1);
  readonly unit = input('');
  readonly valueChange = output<number>();

  setValue(value: number): void {
    if (!Number.isFinite(value)) return;
    const minimum = this.minimum() ?? Number.NEGATIVE_INFINITY;
    const maximum = this.maximum() ?? Number.POSITIVE_INFINITY;
    this.valueChange.emit(clamp(value, minimum, maximum));
  }
}
