import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import {MatSliderModule} from '@angular/material/slider';
import {NumberRange} from '../../core/models/flower.models';
import {clamp, roundToStep} from '../../core/utils/numbers';
import {expandedRange, sortedRange} from './number-range';

@Component({
  selector: 'app-interval-slider',
  imports: [MatSliderModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {'class': '@container block w-full min-w-0'},
  templateUrl: './interval-slider.component.html',
})
export class IntervalSliderComponent {
  readonly label = input.required<string>();
  readonly value = input.required<NumberRange>();
  readonly minimum = input.required<number>();
  readonly maximum = input.required<number>();
  readonly step = input(1);
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
      this.firstHandle.set(value.min);
      this.secondHandle.set(value.max);
    });
  }

  setFirst(value: number): void {
    this.firstHandle.set(value);
    this.valueChange.emit(this.sortedValue());
  }

  setSecond(value: number): void {
    this.secondHandle.set(value);
    this.valueChange.emit(this.sortedValue());
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

  startDrag(handle: 'first' | 'second'): void {
    this.activeHandle = handle;
  }

  stopDrag(): void {
    this.activeHandle = null;
  }
}
