import {ChangeDetectionStrategy, Component, inject, input, signal} from '@angular/core';
import {RouterLink} from '@angular/router';
import {TranslocoPipe, TranslocoService} from '@jsverse/transloco';

type AppLanguage = 'de' | 'en';

@Component({
  selector: 'app-view-switcher',
  imports: [RouterLink, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './view-switcher.component.html',
})
export class ViewSwitcherComponent {
  private readonly transloco = inject(TranslocoService);
  readonly activeView = input.required<'bouquet' | 'components'>();
  readonly activeLanguage = signal<AppLanguage>(this.initialLanguage());

  constructor() {
    this.setLanguage(this.activeLanguage());
  }

  setLanguage(language: AppLanguage): void {
    this.activeLanguage.set(language);
    this.transloco.setActiveLang(language);
    document.documentElement.lang = language;
    try {
      localStorage.setItem('bouquet-language', language);
    } catch {
      // Storage can be unavailable in privacy mode; runtime switching still works.
    }
  }

  private initialLanguage(): AppLanguage {
    try {
      const stored = localStorage.getItem('bouquet-language');
      if (stored === 'de' || stored === 'en') return stored;
    } catch {
      // Fall back to the browser preference.
    }
    return navigator.language.toLowerCase().startsWith('de') ? 'de' : 'en';
  }
}
