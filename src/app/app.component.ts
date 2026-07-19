import {
  ChangeDetectionStrategy,
  Component,
  EnvironmentInjector,
  effect,
  inject,
  isDevMode,
  signal,
} from '@angular/core';
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
  private readonly environmentInjector = inject(EnvironmentInjector);

  constructor() {
    effect(() => {
      if (this.viewState.activeView() === 'bouquet') this.bouquetLoaded.set(true);
      else this.componentsLoaded.set(true);
    });
    if (isDevMode()) {
      (globalThis as typeof globalThis & {
        __generateDefaultFlowerPreviews?: () => Promise<number>;
      }).__generateDefaultFlowerPreviews = () => this.generateDefaultFlowerPreviews();
      (globalThis as typeof globalThis & {
        __renderDefaultFlowerPreviews?: () => Promise<Array<{
          id: string;
          key: string;
          dataUrl: string;
        }>>;
      }).__renderDefaultFlowerPreviews = () => this.renderDefaultFlowerPreviews();
    }
  }

  private async generateDefaultFlowerPreviews(): Promise<number> {
    const previews = await this.renderDefaultFlowerPreviews();
    const writerModule = await import('./shared/flower-thumbnail/default-flower-preview-writer');
    const generatorModule = await import('./shared/flower-thumbnail/flower-thumbnail-generator.service');
    const defaultsModule = await import('./core/data/default-flowers');
    const definitions = new Map(defaultsModule.DEFAULT_FLOWERS.map((definition) => [definition.id, definition]));
    for (const preview of previews) {
      const definition = definitions.get(preview.id);
      if (!definition) continue;
      await writerModule.writeDefaultFlowerPreview(
        definition,
        dataUrlToBlob(preview.dataUrl),
        preview.key,
      );
    }
    return previews.length;
  }

  private async renderDefaultFlowerPreviews(): Promise<Array<{
    id: string;
    key: string;
    dataUrl: string;
  }>> {
    const [defaultsModule, componentsModule, generatorModule, writerModule] = await Promise.all([
      import('./core/data/default-flowers'),
      import('./core/models/flower-components'),
      import('./shared/flower-thumbnail/flower-thumbnail-generator.service'),
      import('./shared/flower-thumbnail/flower-thumbnail-key'),
    ]);
    const definitions = componentsModule.materializeDefinitionComponents(defaultsModule.DEFAULT_FLOWERS);
    const thumbnailGenerator = this.environmentInjector.get(generatorModule.FlowerThumbnailGenerator);
    const previews = [];
    for (const definition of definitions) {
      const blob = await thumbnailGenerator.generate(definition);
      previews.push({
        id: definition.id,
        key: writerModule.flowerThumbnailKey(definition),
        dataUrl: await generatorModule.blobToDataUrl(blob),
      });
    }
    return previews;
  }
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [metadata, encoded = ''] = dataUrl.split(',', 2);
  const mimeType = metadata.match(/^data:([^;]+)/)?.[1] ?? 'image/png';
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], {type: mimeType});
}
