import {ChangeDetectionStrategy, Component, computed, input, output} from '@angular/core';
import {TranslocoPipe} from '@jsverse/transloco';
import {GraphicLeafEdgeSettings} from '../../../../core/models/flower.models';
import {DEFAULT_LEAF_EDGE} from '../../../../core/rendering/graphic-geometries';
import {NumericSliderComponent} from '../../../../shared/numeric-slider/numeric-slider.component';

@Component({
  selector: 'app-graphic-leaf-edge-editor',
  imports: [NumericSliderComponent, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './graphic-leaf-edge-editor.component.html',
  host: {class: 'block'},
})
export class GraphicLeafEdgeEditorComponent {
  readonly value = input<GraphicLeafEdgeSettings>();
  readonly valueChange = output<GraphicLeafEdgeSettings>();
  readonly settings = computed(() => ({...DEFAULT_LEAF_EDGE, ...this.value()}));

  update(key: keyof GraphicLeafEdgeSettings, value: number): void {
    this.valueChange.emit({
      ...this.settings(),
      [key]: key === 'serrationCount' ? Math.round(Number(value)) : Number(value),
    });
  }
}
