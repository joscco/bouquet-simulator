import {ChangeDetectionStrategy, Component, input, output} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {TranslocoPipe} from '@jsverse/transloco';

@Component({
  selector: 'app-preview-toolbar',
  imports: [MatIconModule, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './preview-toolbar.component.html',
  host: {'class': 'contents'},
})
export class PreviewToolbarComponent {
  readonly disabled = input(false);
  readonly centerView = output<void>();
  readonly regeneratePreview = output<void>();
}
