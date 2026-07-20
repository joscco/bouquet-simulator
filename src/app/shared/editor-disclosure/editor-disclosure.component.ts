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
  readonly glass = input(false);
  readonly expanded = model(false);

  toggle(): void {
    this.expanded.update((expanded) => !expanded);
  }
}
