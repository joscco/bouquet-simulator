import {ChangeDetectionStrategy, Component, computed, input, output} from '@angular/core';
import {NumberRange} from '../../core/models/flower.models';

@Component({
  selector: 'app-interval-slider',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-1.5 flex items-center gap-2">
      <span class="mr-auto text-[10px] font-semibold text-stone-600">{{ label() }}</span>
      <span class="rounded-md bg-stone-100 px-1.5 py-1 text-[9px] tabular-nums text-stone-500">
        Min {{ value().min }}{{ unit() }}
      </span>
      <span class="rounded-md bg-stone-100 px-1.5 py-1 text-[9px] tabular-nums text-stone-500">
        Max {{ value().max }}{{ unit() }}
      </span>
    </div>
    <div class="relative h-7">
      <div class="absolute inset-x-2 top-3 h-1 rounded-full bg-stone-200">
        <div
          class="absolute inset-y-0 rounded-full bg-emerald-700"
          [style.left.%]="lowerPercent()"
          [style.right.%]="100 - upperPercent()"
        ></div>
      </div>
      <input
        class="interval-thumb"
        type="range"
        [attr.aria-label]="label() + ' Minimum'"
        [min]="minimum()"
        [max]="maximum()"
        [step]="step()"
        [value]="value().min"
        (input)="setLower($event)"
      >
      <input
        class="interval-thumb"
        type="range"
        [attr.aria-label]="label() + ' Maximum'"
        [min]="minimum()"
        [max]="maximum()"
        [step]="step()"
        [value]="value().max"
        (input)="setUpper($event)"
      >
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .interval-thumb {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 28px;
      margin: 0;
      appearance: none;
      background: transparent;
      pointer-events: none;
    }

    .interval-thumb::-webkit-slider-runnable-track {
      height: 4px;
      background: transparent;
    }

    .interval-thumb::-webkit-slider-thumb {
      width: 18px;
      height: 18px;
      margin-top: -7px;
      appearance: none;
      border: 3px solid #047857;
      border-radius: 999px;
      background: white;
      box-shadow: 0 1px 3px rgb(0 0 0 / 18%);
      cursor: grab;
      pointer-events: auto;
    }

    .interval-thumb::-moz-range-track {
      height: 4px;
      background: transparent;
    }

    .interval-thumb::-moz-range-thumb {
      width: 12px;
      height: 12px;
      border: 3px solid #047857;
      border-radius: 999px;
      background: white;
      box-shadow: 0 1px 3px rgb(0 0 0 / 18%);
      cursor: grab;
      pointer-events: auto;
    }

    .interval-thumb:focus-visible {
      outline: 2px solid #6ee7b7;
      outline-offset: 1px;
      border-radius: 999px;
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

  readonly lowerPercent = computed(() => this.percent(this.value().min));
  readonly upperPercent = computed(() => this.percent(this.value().max));

  setLower(event: Event): void {
    const lower = Math.min(Number((event.target as HTMLInputElement).value), this.value().max);
    this.valueChange.emit({min: lower, max: this.value().max});
  }

  setUpper(event: Event): void {
    const upper = Math.max(Number((event.target as HTMLInputElement).value), this.value().min);
    this.valueChange.emit({min: this.value().min, max: upper});
  }

  private percent(value: number): number {
    const bounded = Math.max(this.minimum(), Math.min(this.maximum(), value));
    return (bounded - this.minimum()) / (this.maximum() - this.minimum()) * 100;
  }
}
