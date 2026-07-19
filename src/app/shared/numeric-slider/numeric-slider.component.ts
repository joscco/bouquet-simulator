import {ChangeDetectionStrategy, Component, input, output} from '@angular/core';
import {clamp} from '../../core/utils/numbers';
import {SliderTrackComponent} from '../slider-track/slider-track.component';
import {DragNumberInputDirective} from '../drag-number-input/drag-number-input.directive';

@Component({
  selector: 'app-numeric-slider',
  imports: [SliderTrackComponent, DragNumberInputDirective],
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
  readonly step = input(0.1);
  readonly unit = input('');
  readonly valueChange = output<number>();
  readonly inputId = input(`numeric-slider-${NumericSliderComponent.nextId++}`);

  setValue(value: number): void {
    if (!Number.isFinite(value)) return;
    this.valueChange.emit(clamp(value, this.minimum(), this.maximum()));
  }
}
