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

@Component({
  selector: 'app-interval-slider',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {'class': 'block'},
  template: `
    <div class="mb-[5px] flex min-h-6 items-center justify-between gap-2">
      <span class="range-slider__label mb-0!">{{ label() }}</span>
      @if (modeSelectable()) {
        <span class="inline-flex shrink-0 rounded-md bg-stone-100 p-0.5" role="group" [attr.aria-label]="label() + ' Eingabemodus'">
          <button
            class="rounded px-1.5 py-1 text-[8px] font-bold transition"
            type="button"
            [class.bg-white]="fixedMode()"
            [class.text-emerald-900]="fixedMode()"
            [class.shadow-sm]="fixedMode()"
            [class.text-stone-500]="!fixedMode()"
            [attr.aria-pressed]="fixedMode()"
            (click)="setMode('fixed')"
          >Festwert</button>
          <button
            class="rounded px-1.5 py-1 text-[8px] font-bold transition"
            type="button"
            [class.bg-white]="!fixedMode()"
            [class.text-emerald-900]="!fixedMode()"
            [class.shadow-sm]="!fixedMode()"
            [class.text-stone-500]="fixedMode()"
            [attr.aria-pressed]="!fixedMode()"
            (click)="setMode('interval')"
          >Intervall</button>
        </span>
      }
    </div>
    <div class="range-slider__row">
      <div
        class="range-slider"
        [style.--range-start]="fixedMode() && modeSelectable() ? '0%' : startPercentage() + '%'"
        [style.--range-end]="endPercentage() + '%'"
      >
        <div class="range-slider__track"></div>
        <div class="range-slider__selection"></div>
        <input
          class="range-slider__input"
          type="range"
          [attr.aria-label]="label() + ' erster Wert'"
          [min]="minimum()"
          [max]="maximum()"
          [step]="step()"
          [value]="firstHandle()"
          (input)="fixedMode() && modeSelectable() ? setFixed(+$any($event.target).value) : setFirst(+$any($event.target).value)"
          (pointerdown)="startDrag('first')"
          (pointerup)="stopDrag()"
          (pointercancel)="stopDrag()"
          (keydown)="startDrag('first')"
          (keyup)="stopDrag()"
        >
        @if (!fixedMode() || !modeSelectable()) {
          <input
            class="range-slider__input"
            type="range"
            [attr.aria-label]="label() + ' zweiter Wert'"
            [min]="minimum()"
            [max]="maximum()"
            [step]="step()"
            [value]="secondHandle()"
            (input)="setSecond(+$any($event.target).value)"
            (pointerdown)="startDrag('second')"
            (pointerup)="stopDrag()"
            (pointercancel)="stopDrag()"
            (keydown)="startDrag('second')"
            (keyup)="stopDrag()"
          >
        }
      </div>
      <div class="range-slider__values">
        <input
          #minimumInput
          class="range-slider__number"
          type="number"
          [attr.aria-label]="label() + (fixedMode() && modeSelectable() ? ' Wert' : ' Minimum')"
          [min]="minimum()"
          [max]="maximum()"
          [step]="step()"
          [value]="sortedValue().min"
          (input)="fixedMode() && modeSelectable() ? setFixed(minimumInput.valueAsNumber) : setMinimum(minimumInput.valueAsNumber)"
        >
        @if (!fixedMode() || !modeSelectable()) {
          <span class="range-slider__separator">–</span>
          <input
            #maximumInput
            class="range-slider__number"
            type="number"
            [attr.aria-label]="label() + ' Maximum'"
            [min]="minimum()"
            [max]="maximum()"
            [step]="step()"
            [value]="sortedValue().max"
            (input)="setMaximum(maximumInput.valueAsNumber)"
          >
        }
        @if (unit().trim()) {
          <span class="range-slider__unit">{{ unit().trim() }}</span>
        }
      </div>
    </div>
  `,
  styles: `
    :host {
      width: 100%;
      min-width: 0;
      container-type: inline-size;
    }

    .range-slider__row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 10px;
    }

    .range-slider__label {
      display: block;
      margin-bottom: 5px;
      color: #57534e;
      font-size: 10px;
      font-weight: 600;
      line-height: 1.25;
    }

    .range-slider__values {
      display: flex;
      align-items: center;
      min-width: 0;
      gap: 4px;
    }

    .range-slider__number {
      appearance: textfield;
      width: 48px;
      min-width: 0;
      height: 36px;
      box-sizing: border-box;
      border: 1px solid #d6d3d1;
      border-radius: 8px;
      padding: 0 7px;
      background: #fff;
      color: #292524;
      font: 500 11px/1 sans-serif;
      outline: none;
    }

    .range-slider__number::-webkit-inner-spin-button,
    .range-slider__number::-webkit-outer-spin-button { appearance: none; margin: 0; }

    .range-slider__number:focus-visible {
      border-color: #047857;
      box-shadow: 0 0 0 3px rgb(4 120 87 / 12%);
    }
    .range-slider__separator, .range-slider__unit { flex: none; color: #78716c; font-size: 9px; }

    .range-slider {
      --thumb-size: 18px;
      position: relative;
      height: 36px;
      width: calc(100% - var(--thumb-size));
      margin-inline: calc(var(--thumb-size) / 2);
    }

    .range-slider__track,
    .range-slider__selection {
      position: absolute;
      top: 16px;
      height: 4px;
      border-radius: 999px;
      pointer-events: none;
    }

    .range-slider__track {
      inset-inline: 0;
      background: #d6d3d1;
    }

    .range-slider__selection {
      left: var(--range-start);
      width: calc(var(--range-end) - var(--range-start));
      background: #065f46;
    }

    .range-slider__input {
      appearance: none;
      -webkit-appearance: none;
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      height: 36px;
      margin: 0;
      padding: 0;
      background: transparent;
      pointer-events: none;
    }

    .range-slider__input::-webkit-slider-runnable-track {
      height: 4px;
      background: transparent;
    }

    .range-slider__input::-webkit-slider-thumb {
      appearance: none;
      -webkit-appearance: none;
      width: var(--thumb-size);
      height: var(--thumb-size);
      margin-top: -7px;
      border: 2px solid #065f46;
      border-radius: 50%;
      background: white;
      box-shadow: 0 1px 3px rgb(0 0 0 / 0.22);
      cursor: grab;
      pointer-events: auto;
    }

    .range-slider__input::-moz-range-track {
      height: 4px;
      background: transparent;
    }

    .range-slider__input::-moz-range-thumb {
      width: calc(var(--thumb-size) - 4px);
      height: calc(var(--thumb-size) - 4px);
      border: 2px solid #065f46;
      border-radius: 50%;
      background: white;
      box-shadow: 0 1px 3px rgb(0 0 0 / 0.22);
      cursor: grab;
      pointer-events: auto;
    }

    .range-slider__input:focus-visible::-webkit-slider-thumb {
      outline: 3px solid rgb(16 185 129 / 0.28);
      outline-offset: 2px;
    }

    .range-slider__input:focus-visible::-moz-range-thumb {
      outline: 3px solid rgb(16 185 129 / 0.28);
      outline-offset: 2px;
    }

    @container (max-width: 230px) {
      .range-slider__row { grid-template-columns: minmax(0, 1fr); gap: 5px; }
      .range-slider__values { width: 100%; }
      .range-slider__number { flex: 1 1 0; width: 100%; }
    }
  `,
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
  readonly startPercentage = computed(() =>
    rangePercentage(this.sortedValue().min, this.minimum(), this.maximum()));
  readonly endPercentage = computed(() =>
    rangePercentage(this.sortedValue().max, this.minimum(), this.maximum()));

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
    const fixed = clampValue(value, this.minimum(), this.maximum());
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
    this.firstHandle.set(clampValue(value, this.minimum(), current.max));
    this.secondHandle.set(current.max);
    this.valueChange.emit(this.sortedValue());
  }

  setMaximum(value: number): void {
    if (!Number.isFinite(value)) return;
    const current = this.sortedValue();
    this.firstHandle.set(current.min);
    this.secondHandle.set(clampValue(value, current.min, this.maximum()));
    this.valueChange.emit(this.sortedValue());
  }

  startDrag(handle: 'first' | 'second'): void {
    this.activeHandle = handle;
  }

  stopDrag(): void {
    this.activeHandle = null;
  }
}

export function sortedRange(first: number, second: number): NumberRange {
  return {min: Math.min(first, second), max: Math.max(first, second)};
}

export function rangePercentage(value: number, minimum: number, maximum: number): number {
  const span = maximum - minimum;
  if (span <= 0) return 0;
  return Math.max(0, Math.min(100, (value - minimum) / span * 100));
}

function clampValue(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

export function expandedRange(
  value: number,
  minimum: number,
  maximum: number,
  step: number,
): NumberRange {
  const expansion = Math.max(step, (maximum - minimum) * 0.1);
  let min = clampValue(roundToStep(value - expansion / 2, step), minimum, maximum);
  let max = clampValue(roundToStep(value + expansion / 2, step), minimum, maximum);
  if (min === max) {
    if (max < maximum) max = clampValue(max + step, minimum, maximum);
    else min = clampValue(min - step, minimum, maximum);
  }
  return sortedRange(min, max);
}

function roundToStep(value: number, step: number): number {
  if (step <= 0) return value;
  return Math.round(value / step) * step;
}
