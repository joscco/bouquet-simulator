import {ChangeDetectionStrategy, Component, input, output} from '@angular/core';

@Component({
  selector: 'app-numeric-slider',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {'class': 'block min-w-0'},
  template: `
    <label class="numeric-slider__label" [for]="inputId()">{{ label() }}</label>
    <div class="numeric-slider__row">
      <input
        #rangeInput
        class="numeric-slider__range"
        type="range"
        [attr.aria-label]="label()"
        [min]="minimum()"
        [max]="maximum()"
        [step]="step()"
        [value]="value()"
        (input)="setValue(rangeInput.valueAsNumber)"
      >
      <div class="numeric-slider__value">
        <input
          #numberInput
          class="numeric-slider__number"
          type="number"
          [id]="inputId()"
          [min]="minimum()"
          [max]="maximum()"
          [step]="step()"
          [value]="value()"
          (input)="setValue(numberInput.valueAsNumber)"
        >
        @if (unit()) {
          <span class="numeric-slider__unit">{{ unit() }}</span>
        }
      </div>
    </div>
  `,
  styles: `
    :host {
      width: 100%;
      container-type: inline-size;
    }

    .numeric-slider__row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 10px;
    }

    .numeric-slider__label {
      display: block;
      margin-bottom: 5px;
      color: #57534e;
      font-size: 10px;
      font-weight: 600;
      line-height: 1.25;
    }

    .numeric-slider__value {
      display: flex;
      align-items: center;
      width: 76px;
      height: 36px;
      overflow: hidden;
      box-sizing: border-box;
      border: 1px solid #d6d3d1;
      border-radius: 8px;
      background: white;
      transition: border-color 120ms ease, box-shadow 120ms ease;
    }

    .numeric-slider__value:focus-within {
      border-color: #047857;
      box-shadow: 0 0 0 3px rgb(4 120 87 / 12%);
    }

    .numeric-slider__number {
      appearance: textfield;
      width: 100%;
      min-width: 0;
      height: 100%;
      box-sizing: border-box;
      border: 0;
      padding: 0 6px 0 9px;
      background: transparent;
      color: #292524;
      font: 500 12px/1 sans-serif;
      outline: none;
    }

    .numeric-slider__number::-webkit-inner-spin-button,
    .numeric-slider__number::-webkit-outer-spin-button { appearance: none; margin: 0; }

    .numeric-slider__unit {
      flex: none;
      padding-right: 9px;
      color: #78716c;
      font-size: 9px;
    }

    .numeric-slider__range {
      appearance: none;
      -webkit-appearance: none;
      width: 100%;
      height: 20px;
      box-sizing: border-box;
      margin: 0;
      background: transparent;
    }

    .numeric-slider__range::-webkit-slider-runnable-track {
      height: 4px;
      border-radius: 999px;
      background: #d6d3d1;
    }

    .numeric-slider__range::-webkit-slider-thumb {
      appearance: none;
      -webkit-appearance: none;
      width: 16px;
      height: 16px;
      margin-top: -6px;
      border: 2px solid #065f46;
      border-radius: 50%;
      background: #fff;
      box-shadow: 0 1px 2px rgb(0 0 0 / 18%);
    }

    .numeric-slider__range::-moz-range-track {
      height: 4px;
      border-radius: 999px;
      background: #d6d3d1;
    }

    .numeric-slider__range::-moz-range-thumb {
      width: 12px;
      height: 12px;
      border: 2px solid #065f46;
      border-radius: 50%;
      background: #fff;
    }

    @container (max-width: 150px) {
      .numeric-slider__row { grid-template-columns: minmax(0, 1fr); gap: 5px; }
      .numeric-slider__value { width: 100%; }
    }
  `,
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
    this.valueChange.emit(Math.max(this.minimum(), Math.min(this.maximum(), value)));
  }
}
