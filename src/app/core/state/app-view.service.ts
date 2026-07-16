import {DestroyRef, Injectable, inject, signal} from '@angular/core';

export type AppView = 'bouquet' | 'components';

/**
 * Hält den Ansichtswechsel außerhalb des Angular Routers. Der Query-Parameter
 * bleibt teilbar und Browser-Zurück/Vorwärts funktioniert über popstate.
 */
@Injectable({providedIn: 'root'})
export class AppViewState {
  private readonly destroyRef = inject(DestroyRef);
  readonly activeView = signal<AppView>('bouquet');
  private readonly handlePopState = () => {
    const view = this.readView();
    this.activeView.set(view);
    this.updateTitle(view);
  };

  constructor() {
    const initialView = this.readView();
    this.activeView.set(initialView);
    this.writeUrl(initialView, true);
    this.updateTitle(initialView);
    window.addEventListener('popstate', this.handlePopState);
    this.destroyRef.onDestroy(() => window.removeEventListener('popstate', this.handlePopState));
  }

  setView(view: AppView): void {
    if (view === this.activeView() && this.readViewFromQuery() === view) return;
    this.writeUrl(view, view === this.activeView());
    this.activeView.set(view);
    this.updateTitle(view);
  }

  private readView(): AppView {
    return this.readViewFromQuery()
      ?? (window.location.pathname.endsWith('/editor') ? 'components' : 'bouquet');
  }

  private readViewFromQuery(): AppView | null {
    const view = new URL(window.location.href).searchParams.get('view');
    return view === 'components' || view === 'bouquet' ? view : null;
  }

  private writeUrl(view: AppView, replace: boolean): void {
    const url = new URL(window.location.href);
    const baseHref = document.querySelector('base')?.getAttribute('href') ?? '/';
    url.pathname = new URL(baseHref, window.location.origin).pathname;
    url.searchParams.set('view', view);
    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    if (replace) window.history.replaceState(window.history.state, '', nextUrl);
    else window.history.pushState(window.history.state, '', nextUrl);
  }

  private updateTitle(view: AppView): void {
    document.title = view === 'components' ? 'Blumen-Editor' : 'Bouquet Studio';
  }
}
