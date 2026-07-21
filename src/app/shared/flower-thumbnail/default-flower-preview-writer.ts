import {FlowerDefinition} from '../../core/models/flower.models';
import {blobToDataUrl} from './flower-thumbnail-generator.service';
import {flowerThumbnailKey} from './flower-thumbnail-key';

export async function writeDefaultFlowerPreview(
  definition: FlowerDefinition,
  blob: Blob,
  key = flowerThumbnailKey(definition),
): Promise<void> {
  const filename = `${safeFilename(definition.id)}.png`;
  const entry = {
    key,
    url: `previews/${filename}`,
  };
  const response = await fetch('/api/default-preview', {
    method: 'PUT',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({
      id: definition.id,
      filename,
      dataUrl: await blobToDataUrl(blob),
      preview: entry,
    }),
  });
  if (response.ok) return;
  const body = await response.json().catch(() => null) as {error?: string} | null;
  throw new Error(body?.error ?? `Preview-Server antwortet mit ${response.status}.`);
}

function safeFilename(id: string): string {
  return id.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-') || 'preview';
}
