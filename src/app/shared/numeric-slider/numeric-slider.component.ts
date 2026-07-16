import {ChangeDetectionStrategy, Component, input, output} from '@angular/core';
import {clamp} from '../../core/utils/numbers';

@Component({
  selector: 'app-numeric-slider',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {'class': '@container block w-full min-w-0'},
  templateUrl: './numeric-slider.component.html',
})
export class NumericSliderComponent {
  private static nextId = 0;

  readonly label = input.required<string>();
  readonly value = input.required<number>();
  readonly minimum = input.required<number>();
  readonly maximum = input.required<number>();
  readonly step = input(1);
  readonly unit = input('');
  readonly valueChange = output<number>();
  readonly inputId = input(`numeric-slider-${NumericSliderComponent.nextId++}`);

  setValue(value: number): void {
    if (!Number.isFinite(value)) return;
    this.valueChange.emit(clamp(value, this.minimum(), this.maximum()));
  }
}
