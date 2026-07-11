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
    <div class="flex items-center gap-2">
      <span class="mr-auto text-[10px] font-semibold text-stone-600">{{ label() }}</span>
      <span class="rounded-md bg-stone-100 px-1.5 py-1 text-[9px] tabular-nums text-stone-500">
        {{ sortedValue().min }}–{{ sortedValue().max }}{{ unit() }}
      </span>
    </div>
    <div
      class="range-slider"
      [style.--range-start]="startPercentage() + '%'"
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
        (input)="setFirst(+$any($event.target).value)"
        (pointerdown)="startDrag('first')"
        (pointerup)="stopDrag()"
        (pointercancel)="stopDrag()"
        (keydown)="startDrag('first')"
        (keyup)="stopDrag()"
      >
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
    </div>
  `,
  styles: `
    .range-slider {
      --thumb-size: 18px;
      position: relative;
      height: 38px;
      margin-inline: calc(var(--thumb-size) / 2);
    }

    .range-slider__track,
    .range-slider__selection {
      position: absolute;
      top: 17px;
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
      height: 38px;
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
  `,
})
export class IntervalSliderComponent {
  readonly label = input.required<string>();
  readonly value = input.required<NumberRange>();
  readonly minimum = input.required<number>();
  readonly maximum = input.required<number>();
  readonly step = input(1);
  readonly unit = input('');
  readonly valueChange = output<NumberRange>();

  readonly firstHandle = signal(0);
  readonly secondHandle = signal(0);
  readonly sortedValue = computed(() => sortedRange(this.firstHandle(), this.secondHandle()));
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
