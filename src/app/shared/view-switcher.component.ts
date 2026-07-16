import {ChangeDetectionStrategy, Component, input} from '@angular/core';
import {RouterLink} from '@angular/router';

@Component({
  selector: 'app-view-switcher',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './view-switcher.component.html',
})
export class ViewSwitcherComponent {
  readonly activeView = input.required<'bouquet' | 'components'>();
}
