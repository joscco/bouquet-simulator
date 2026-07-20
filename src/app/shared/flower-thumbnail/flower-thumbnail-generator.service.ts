import {
  ApplicationRef,
  EnvironmentInjector,
  Injectable,
  createComponent,
  inject,
} from '@angular/core';
import {BouquetState, FlowerDefinition} from '../../core/models/flower.models';
import {BouquetCanvasComponent} from '../bouquet-canvas/bouquet-canvas.component';
import {flowerDefinitionWithPreviewAnchor} from './flower-thumbnail-definition';
import {FLOWER_THUMBNAIL_SIZE} from './flower-thumbnail-settings';

const GENERATION_TIMEOUT_MS = 15_000;

@Injectable({providedIn: 'root'})
export class FlowerThumbnailGenerator {
  private readonly applicationRef = inject(ApplicationRef);
  private readonly environmentInjector = inject(EnvironmentInjector);
  private generationChain: Promise<unknown> = Promise.resolve();

  generate(definition: FlowerDefinition): Promise<Blob> {
    const generation = this.generationChain.then(() => this.render(definition));
    this.generationChain = generation.catch(() => undefined);
    return generation;
  }

  private render(definition: FlowerDefinition): Promise<Blob> {
    const previewDefinition = flowerDefinitionWithPreviewAnchor(definition);
    const host = document.createElement('div');
    host.style.cssText = [
      'position:fixed',
      'left:-10000px',
      'top:0',
      `width:${FLOWER_THUMBNAIL_SIZE}px`,
      `height:${FLOWER_THUMBNAIL_SIZE}px`,
      'pointer-events:none',
      'opacity:0',
    ].join(';');
    document.body.appendChild(host);

    const componentRef = createComponent(BouquetCanvasComponent, {
      environmentInjector: this.environmentInjector,
      hostElement: host,
    });
    const snapshotKey = `generated:${definition.id}:${performance.now()}`;
    const state: BouquetState = {
      schemaVersion: 2,
      rotation: -0.38,
      flowers: [{
        instanceId: `generated-thumbnail-${definition.id}`,
        definitionId: definition.id,
        x: 0,
        y: 0,
        z: 0,
        scale: 1,
        leanX: 0.08,
        leanZ: -0.06,
        seed: 0.417,
        nodeOffsets: {},
      }],
    };

    componentRef.setInput('state', state);
    componentRef.setInput('definitions', [previewDefinition]);
    componentRef.setInput('fitToContent', true);
    componentRef.setInput('thumbnailMode', true);
    componentRef.setInput('snapshotSize', FLOWER_THUMBNAIL_SIZE);
    componentRef.setInput('snapshotKey', snapshotKey);

    return new Promise<Blob>((resolve, reject) => {
      let timeout: ReturnType<typeof setTimeout> | null = null;
      const cleanup = () => {
        if (timeout !== null) clearTimeout(timeout);
        subscription.unsubscribe();
        this.applicationRef.detachView(componentRef.hostView);
        componentRef.destroy();
        host.remove();
      };
      const subscription = componentRef.instance.snapshotReady.subscribe((snapshot) => {
        if (snapshot.key !== snapshotKey || !snapshot.dataUrl.startsWith('data:image/png')) return;
        const blob = dataUrlToBlob(snapshot.dataUrl);
        cleanup();
        resolve(blob);
      });
      timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Das Vorschau-PNG konnte nicht rechtzeitig erzeugt werden.'));
      }, GENERATION_TIMEOUT_MS);
      this.applicationRef.attachView(componentRef.hostView);
      componentRef.changeDetectorRef.detectChanges();
    });
  }
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Bild konnte nicht gelesen werden.'));
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [metadata, encoded = ''] = dataUrl.split(',', 2);
  const mimeType = metadata.match(/^data:([^;]+)/)?.[1] ?? 'image/png';
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], {type: mimeType});
}
