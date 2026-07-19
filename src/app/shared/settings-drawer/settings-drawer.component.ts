import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  input,
  output,
  signal,
} from '@angular/core';

@Component({
  selector: 'app-settings-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings-drawer.component.html',
  host: {'class': 'contents'},
})
export class SettingsDrawerComponent implements AfterViewInit, OnDestroy {
  readonly open = input.required<boolean>();
  readonly panelId = input('settings-drawer-panel');
  readonly toggleLabel = input.required<string>();
  readonly busy = input(false);
  readonly disabled = input(false);
  readonly toggle = output<void>();
  readonly transitionsReady = signal(false);
  private transitionFrame: number | null = null;

  ngAfterViewInit(): void {
    this.transitionFrame = requestAnimationFrame(() => {
      this.transitionFrame = null;
      this.transitionsReady.set(true);
    });
  }

  ngOnDestroy(): void {
    if (this.transitionFrame !== null) cancelAnimationFrame(this.transitionFrame);
  }
}
