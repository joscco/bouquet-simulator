import {
  ChangeDetectionStrategy,
  Component,
  input,
  model,
} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';

@Component({
  selector: 'app-editor-disclosure',
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {'class': 'block min-w-0'},
  templateUrl: './editor-disclosure.component.html',
})
export class EditorDisclosureComponent {
  readonly title = input.required<string>();
  readonly description = input('');
  readonly icon = input('');
  readonly badge = input('');
  readonly expanded = model(false);

  syncExpandedState(event: Event): void {
    const expanded = (event.currentTarget as HTMLDetailsElement).open;
    if (expanded !== this.expanded()) this.expanded.set(expanded);
  }
}
