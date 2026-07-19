import {ChangeDetectionStrategy, Component, input, output} from '@angular/core';

@Component({
  selector: 'app-settings-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings-drawer.component.html',
  host: {'class': 'contents'},
})
export class SettingsDrawerComponent {
  readonly open = input.required<boolean>();
  readonly panelId = input('settings-drawer-panel');
  readonly toggleLabel = input.required<string>();
  readonly busy = input(false);
  readonly disabled = input(false);
  readonly toggle = output<void>();
}
