import {ChangeDetectionStrategy, Component, input} from '@angular/core';
import {RouterLink} from '@angular/router';

@Component({
  selector: 'app-view-switcher',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav
      class="absolute right-4 top-3 z-50 flex max-w-[calc(100vw-2rem)] items-center rounded-xl border border-white/70 bg-white/85 p-1 shadow-md shadow-stone-900/10 backdrop-blur-md"
      aria-label="Editor wechseln"
    >
      <a
        class="rounded-lg px-3 py-2 text-xs font-bold transition hover:bg-stone-100 hover:text-stone-900"
        [class.bg-emerald-950]="activeView() === 'bouquet'"
        [class.text-white]="activeView() === 'bouquet'"
        [class.shadow-sm]="activeView() === 'bouquet'"
        [class.text-stone-600]="activeView() !== 'bouquet'"
        routerLink="/"
        [attr.aria-current]="activeView() === 'bouquet' ? 'page' : null"
      >
        Strauß
      </a>
      <a
        class="rounded-lg px-3 py-2 text-xs font-bold transition hover:bg-stone-100 hover:text-stone-900"
        [class.bg-emerald-950]="activeView() === 'components'"
        [class.text-white]="activeView() === 'components'"
        [class.shadow-sm]="activeView() === 'components'"
        [class.text-stone-600]="activeView() !== 'components'"
        routerLink="/editor"
        [attr.aria-current]="activeView() === 'components' ? 'page' : null"
      >
        Komponenten
      </a>
    </nav>
  `,
})
export class ViewSwitcherComponent {
  readonly activeView = input.required<'bouquet' | 'components'>();
}
