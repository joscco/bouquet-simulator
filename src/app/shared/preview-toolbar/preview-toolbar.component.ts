import {ChangeDetectionStrategy, Component, input, output} from '@angular/core';
import {TranslocoPipe} from '@jsverse/transloco';

@Component({
  selector: 'app-preview-toolbar',
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './preview-toolbar.component.html',
  host: {'class': 'contents'},
})
export class PreviewToolbarComponent {
  readonly disabled = input(false);
  readonly centerView = output<void>();
  readonly regeneratePreview = output<void>();
}
