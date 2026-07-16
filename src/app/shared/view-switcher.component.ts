import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {TranslocoPipe, TranslocoService} from '@jsverse/transloco';
import {AppView, AppViewState} from '../core/state/app-view.service';

type AppLanguage = 'de' | 'en';

@Component({
  selector: 'app-view-switcher',
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './view-switcher.component.html',
})
export class ViewSwitcherComponent {
  private readonly transloco = inject(TranslocoService);
  private readonly viewState = inject(AppViewState);
  readonly activeView = this.viewState.activeView;
  readonly viewSwitchAnimated = signal(false);
  readonly activeLanguage = signal<AppLanguage>(this.initialLanguage());
  readonly languageSwitchAnimated = signal(false);

  constructor() {
    this.setLanguage(this.activeLanguage());
  }

  selectView(view: AppView): void {
    if (view === this.activeView()) return;
    this.viewSwitchAnimated.set(true);
    this.viewState.setView(view);
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

  selectLanguage(language: AppLanguage): void {
    if (language === this.activeLanguage()) return;
    this.languageSwitchAnimated.set(true);
    this.setLanguage(language);
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
