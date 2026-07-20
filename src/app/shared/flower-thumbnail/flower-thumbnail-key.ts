import {FlowerDefinition} from '../../core/models/flower.models';

const KEY_VERSION = 'png-v2';

export function flowerThumbnailKey(definition: FlowerDefinition): string {
  return `${KEY_VERSION}:${hashString(JSON.stringify(definition))}:${encodeURIComponent(definition.id)}`;
}

export function flowerThumbnailDefinitionId(key: string): string | null {
  const encodedId = key.split(':', 3)[2];
  if (!encodedId) return null;
  try {
    return decodeURIComponent(encodedId);
  } catch {
    return null;
  }
}

function hashString(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}
