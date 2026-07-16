import {ChangeDetectionStrategy, Component, computed, input} from '@angular/core';

export type AppButtonVariant = 'icon' | 'icon-text' | 'text';
export type AppButtonTone = 'neutral' | 'primary' | 'danger';

@Component({
  selector: 'button[app-button]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    type: 'button',
    '[class]': 'classes()',
  },
  templateUrl: './app-button.component.html',
})
export class AppButtonComponent {
  readonly variant = input<AppButtonVariant>('text');
  readonly tone = input<AppButtonTone>('neutral');

  readonly classes = computed(() => [
    'select-none cursor-pointer border text-[11px]! leading-none! transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-emerald-600 disabled:pointer-events-none disabled:opacity-40 [&_.mat-icon]:m-0! [&_.mat-icon]:size-5! [&_.mat-icon]:shrink-0 [&_.mat-icon]:text-[20px]! [&_.mat-icon]:leading-5!',
    this.variant() === 'icon'
      ? 'grid size-[34px]! shrink-0 place-items-center rounded-[7px] p-0!'
      : 'inline-flex h-9! items-center justify-center rounded-lg px-3! font-semibold',
    this.variant() === 'icon-text' ? 'gap-[7px]' : '',
    this.toneClasses(),
  ].filter(Boolean).join(' '));

  private toneClasses(): string {
    switch (this.tone()) {
      case 'primary':
        return 'border-emerald-950 bg-emerald-950 text-white hover:bg-emerald-800';
      case 'danger':
        return 'border-transparent bg-transparent text-rose-700 hover:bg-rose-50 hover:text-rose-800';
      default:
        return this.variant() === 'icon'
          ? 'border-transparent bg-transparent text-stone-600 hover:bg-stone-100 hover:text-stone-900'
          : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50';
    }
  }
}
