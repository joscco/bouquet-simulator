import {ChangeDetectionStrategy, Component, input, output} from '@angular/core';

@Component({
  selector: 'app-numeric-slider',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {'class': 'block min-w-0'},
  template: `
    <div class="numeric-slider__header">
      <label class="numeric-slider__label" [for]="inputId()">{{ label() }}</label>
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
  `,
  styles: `
    :host { width: 100%; }

    .numeric-slider__header {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(64px, auto);
      align-items: center;
      gap: 8px;
      margin-bottom: 3px;
    }

    .numeric-slider__label {
      min-width: 0;
      color: #57534e;
      font-size: 9px;
      font-weight: 600;
      line-height: 1.25;
    }

    .numeric-slider__value {
      display: flex;
      align-items: center;
      justify-self: end;
      min-width: 0;
      height: 28px;
      overflow: hidden;
      border: 1px solid #d6d3d1;
      border-radius: 6px;
      background: white;
    }

    .numeric-slider__number {
      appearance: textfield;
      width: 58px;
      min-width: 0;
      height: 100%;
      box-sizing: border-box;
      border: 0;
      padding: 0 5px;
      background: transparent;
      color: #292524;
      font: 600 11px/1 sans-serif;
      text-align: right;
      outline: none;
    }

    .numeric-slider__number::-webkit-inner-spin-button,
    .numeric-slider__number::-webkit-outer-spin-button { appearance: none; margin: 0; }

    .numeric-slider__number:focus-visible { box-shadow: inset 0 0 0 2px #059669; }

    .numeric-slider__unit {
      flex: none;
      padding-right: 6px;
      color: #78716c;
      font-size: 9px;
    }

    .numeric-slider__range {
      display: block;
      width: 100%;
      height: 24px;
      box-sizing: border-box;
      margin: 0;
      accent-color: #065f46;
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
