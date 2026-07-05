import {ChangeDetectionStrategy, Component, input, output} from '@angular/core';
import {MatSliderModule} from '@angular/material/slider';
import {NumberRange} from '../../core/models/flower.models';

@Component({
  selector: 'app-interval-slider',
  imports: [MatSliderModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center gap-2">
      <span class="mr-auto text-[10px] font-semibold text-stone-600">{{ label() }}</span>
      <span class="rounded-md bg-stone-100 px-1.5 py-1 text-[9px] tabular-nums text-stone-500">
        {{ value().min }}–{{ value().max }}{{ unit() }}
      </span>
    </div>
    <mat-slider class="w-full" [min]="minimum()" [max]="maximum()" [step]="step()" discrete>
      <input
        matSliderStartThumb
        [attr.aria-label]="label() + ' Minimum'"
        [value]="value().min"
        (valueChange)="setLower($event)"
      >
      <input
        matSliderEndThumb
        [attr.aria-label]="label() + ' Maximum'"
        [value]="value().max"
        (valueChange)="setUpper($event)"
      >
    </mat-slider>
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

  setLower(lower: number): void {
    this.valueChange.emit({min: Math.min(lower, this.value().max), max: this.value().max});
  }

  setUpper(upper: number): void {
    this.valueChange.emit({min: this.value().min, max: Math.max(upper, this.value().min)});
  }
}
