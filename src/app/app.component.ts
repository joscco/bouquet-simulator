import {ChangeDetectionStrategy, Component} from '@angular/core';
import {RouterLink, RouterLinkActive, RouterOutlet} from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="flex h-14 items-center justify-between border-b border-stone-200 bg-white/80 px-4 backdrop-blur sm:px-6 lg:px-8">
      <a class="flex items-center gap-2 text-sm font-semibold tracking-tight text-stone-900 no-underline" routerLink="/" aria-label="Bouquet Studio Startseite">
        <span class="text-lg text-emerald-900">✽</span>
        <span class="hidden sm:inline">Bouquet</span>
      </a>
      <nav class="flex rounded-xl bg-stone-100 p-1 text-xs font-semibold" aria-label="Hauptnavigation">
        <a class="rounded-lg px-3 py-1.5 text-stone-500 no-underline" routerLink="/" [routerLinkActiveOptions]="{exact: true}" routerLinkActive="!bg-white !text-stone-900 shadow-sm">Strauß</a>
        <a class="rounded-lg px-3 py-1.5 text-stone-500 no-underline" routerLink="/editor" routerLinkActive="!bg-white !text-stone-900 shadow-sm">Blume</a>
      </nav>
    </header>
    <main><router-outlet /></main>
  `,
})
export class AppComponent {}
