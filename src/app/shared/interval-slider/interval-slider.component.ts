import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import {NumberRange} from '../../core/models/flower.models';
import {clamp, formatNumericInputValue, roundToStep} from '../../core/utils/numbers';
import {boundedRange, expandedRange, sortedRange} from './number-range';
import {SliderHandle, SliderTrackComponent} from '../slider-track/slider-track.component';
import {TranslocoPipe} from '@jsverse/transloco';
import {DragNumberInputDirective} from '../drag-number-input/drag-number-input.directive';

@Component({
  selector: 'app-interval-slider',
  imports: [SliderTrackComponent, TranslocoPipe, DragNumberInputDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {'class': '@container block w-full min-w-0'},
  templateUrl: './interval-slider.component.html',
})
export class IntervalSliderComponent {
  readonly formatInputValue = formatNumericInputValue;
  readonly label = input.required<string>();
  readonly value = input.required<NumberRange>();
  readonly minimum = input.required<number>();
  readonly maximum = input.required<number>();
  readonly step = input(0.1);
  readonly unit = input('');
  readonly modeSelectable = input(false);
  readonly valueChange = output<NumberRange>();

  readonly firstHandle = signal(0);
  readonly secondHandle = signal(0);
  readonly sortedValue = computed(() => sortedRange(this.firstHandle(), this.secondHandle()));
  readonly fixedMode = computed(() => this.sortedValue().min === this.sortedValue().max);

  private activeHandle: 'first' | 'second' | null = null;

  constructor() {
    effect(() => {
      const value = this.value();
      if (this.activeHandle) return;
      const bounded = boundedRange(value, this.minimum(), this.maximum());
      this.firstHandle.set(bounded.min);
      this.secondHandle.set(bounded.max);
    });
  }

  setFirst(value: number): void {
    if (!Number.isFinite(value)) return;
    const minimum = clamp(value, this.minimum(), this.secondHandle());
    this.firstHandle.set(minimum);
    this.valueChange.emit({min: minimum, max: this.secondHandle()});
  }

  setSecond(value: number): void {
    if (!Number.isFinite(value)) return;
    const maximum = clamp(value, this.firstHandle(), this.maximum());
    this.secondHandle.set(maximum);
    this.valueChange.emit({min: this.firstHandle(), max: maximum});
  }

  setFixed(value: number): void {
    if (!Number.isFinite(value)) return;
    const fixed = clamp(value, this.minimum(), this.maximum());
    this.firstHandle.set(fixed);
    this.secondHandle.set(fixed);
    this.valueChange.emit({min: fixed, max: fixed});
  }

  setMode(mode: 'fixed' | 'interval'): void {
    if (mode === 'fixed') {
      const current = this.sortedValue();
      this.setFixed(roundToStep((current.min + current.max) / 2, this.step()));
      return;
    }
    if (!this.fixedMode()) return;
    const expanded = expandedRange(
      this.sortedValue().min,
      this.minimum(),
      this.maximum(),
      this.step(),
    );
    this.firstHandle.set(expanded.min);
    this.secondHandle.set(expanded.max);
    this.valueChange.emit(expanded);
  }

  setMinimum(value: number): void {
    if (!Number.isFinite(value)) return;
    const current = this.sortedValue();
    this.firstHandle.set(clamp(value, this.minimum(), current.max));
    this.secondHandle.set(current.max);
    this.valueChange.emit(this.sortedValue());
  }

  setMaximum(value: number): void {
    if (!Number.isFinite(value)) return;
    const current = this.sortedValue();
    this.firstHandle.set(current.min);
    this.secondHandle.set(clamp(value, current.min, this.maximum()));
    this.valueChange.emit(this.sortedValue());
  }

  startDrag(handle: SliderHandle): void {
    this.activeHandle = handle;
  }

  stopDrag(): void {
    this.activeHandle = null;
  }
}
