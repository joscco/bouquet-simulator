import {ChangeDetectionStrategy, Component, effect, inject, signal} from '@angular/core';
import {AppViewState} from './core/state/app-view.service';
import {BouquetSimulatorComponent} from './features/simulator/bouquet-simulator.component';
import {FlowerEditorComponent} from './features/editor/flower-editor.component';
import {ViewSwitcherComponent} from './shared/view-switcher.component';

@Component({
  selector: 'app-root',
  imports: [BouquetSimulatorComponent, FlowerEditorComponent, ViewSwitcherComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.component.html',
})
export class AppComponent {
  readonly viewState = inject(AppViewState);
  readonly bouquetLoaded = signal(this.viewState.activeView() === 'bouquet');
  readonly componentsLoaded = signal(this.viewState.activeView() === 'components');

  constructor() {
    effect(() => {
      if (this.viewState.activeView() === 'bouquet') this.bouquetLoaded.set(true);
      else this.componentsLoaded.set(true);
    });
  }
}
