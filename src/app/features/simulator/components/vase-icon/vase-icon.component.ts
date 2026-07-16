import {ChangeDetectionStrategy, Component, input} from '@angular/core';
import {VaseId} from '../../../../core/data/vases';

@Component({
  selector: 'app-vase-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './vase-icon.component.html',
  host: {'class': 'block'},
})
export class VaseIconComponent {
  readonly vaseId = input.required<VaseId>();
}
