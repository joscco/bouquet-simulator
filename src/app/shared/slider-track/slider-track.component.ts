import {ChangeDetectionStrategy, Component, input, output} from '@angular/core';
import {MatSliderModule} from '@angular/material/slider';

export type SliderHandle = 'first' | 'second';

@Component({
  selector: 'app-slider-track',
  imports: [MatSliderModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {'class': 'block w-full min-w-0'},
  templateUrl: './slider-track.component.html',
})
export class SliderTrackComponent {
  readonly minimum = input.required<number>();
  readonly maximum = input.required<number>();
  readonly step = input(1);
  readonly value = input.required<number>();
  readonly endValue = input<number | null>(null);
  readonly ariaLabel = input.required<string>();
  readonly inputId = input<string | null>(null);
  readonly valueChange = output<number>();
  readonly endValueChange = output<number>();
  readonly dragStart = output<SliderHandle>();
  readonly dragEnd = output<void>();

  emitValue(event: Event, output: 'value' | 'end'): void {
    const value = +(event.target as HTMLInputElement).value;
    if (!Number.isFinite(value)) return;
    if (output === 'end') this.endValueChange.emit(value);
    else this.valueChange.emit(value);
  }
}
