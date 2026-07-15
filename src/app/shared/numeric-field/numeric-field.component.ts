import {ChangeDetectionStrategy, Component, input, output} from '@angular/core';

@Component({
  selector: 'app-numeric-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {'class': 'block min-w-0'},
  template: `
    <label class="numeric-field">
      <span class="numeric-field__label">{{ label() }}</span>
      <span class="numeric-field__control">
        <input
          #numberInput
          class="numeric-field__input"
          type="number"
          [attr.aria-label]="label()"
          [min]="minimum()"
          [max]="maximum()"
          [step]="step()"
          [value]="value()"
          (input)="setValue(numberInput.valueAsNumber)"
        >
        @if (unit()) {
          <span class="numeric-field__unit">{{ unit() }}</span>
        }
      </span>
    </label>
  `,
  styles: `
    .numeric-field { display: block; min-width: 0; }
    .numeric-field__label {
      display: block;
      margin-bottom: 5px;
      color: #57534e;
      font-size: 10px;
      font-weight: 600;
      line-height: 1.25;
    }
    .numeric-field__control {
      display: flex;
      width: 100%;
      height: 36px;
      align-items: center;
      overflow: hidden;
      box-sizing: border-box;
      border: 1px solid #d6d3d1;
      border-radius: 8px;
      background: #fff;
      transition: border-color 120ms ease, box-shadow 120ms ease;
    }
    .numeric-field__control:focus-within {
      border-color: #047857;
      box-shadow: 0 0 0 3px rgb(4 120 87 / 12%);
    }
    .numeric-field__input {
      appearance: textfield;
      width: 100%;
      min-width: 0;
      height: 100%;
      box-sizing: border-box;
      border: 0;
      padding: 0 10px;
      background: transparent;
      color: #292524;
      font: 500 12px/1 sans-serif;
      outline: none;
    }
    .numeric-field__input::-webkit-inner-spin-button,
    .numeric-field__input::-webkit-outer-spin-button { appearance: none; margin: 0; }
    .numeric-field__unit {
      flex: none;
      padding-right: 10px;
      color: #78716c;
      font-size: 10px;
    }
  `,
})
export class NumericFieldComponent {
  readonly label = input.required<string>();
  readonly value = input.required<number>();
  readonly minimum = input<number | undefined>(undefined);
  readonly maximum = input<number | undefined>(undefined);
  readonly step = input(1);
  readonly unit = input('');
  readonly valueChange = output<number>();

  setValue(value: number): void {
    if (!Number.isFinite(value)) return;
    const minimum = this.minimum() ?? Number.NEGATIVE_INFINITY;
    const maximum = this.maximum() ?? Number.POSITIVE_INFINITY;
    this.valueChange.emit(Math.max(minimum, Math.min(maximum, value)));
  }
}
