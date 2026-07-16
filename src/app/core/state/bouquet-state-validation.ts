import {
  isBouquetBackgroundMode,
} from '../data/bouquet-scene';
import {isVaseId, isVaseMaterialId} from '../data/vases';
import {normalizeFlowerCatalogCapabilities} from '../models/flower-catalog';
import {normalizeConnectionReferences} from '../models/flower-connections';
import {
  BouquetProject,
  BouquetState,
  FlowerDefinition,
  ProjectExport,
} from '../models/flower.models';

export function normalizeDefinitions(definitions: FlowerDefinition[]): FlowerDefinition[] {
  return definitions.map(normalizeDefinition);
}

export function normalizeDefinition(definition: FlowerDefinition): FlowerDefinition {
  return normalizeFlowerCatalogCapabilities(normalizeConnectionReferences(definition));
}

export function isBouquetState(value: unknown): value is BouquetState {
  if (!isRecord(value) || value['schemaVersion'] !== 2 || !isFiniteNumber(value['rotation'])) return false;
  if (value['vaseId'] !== undefined && !isVaseId(value['vaseId'])) return false;
  if (value['vaseMaterialId'] !== undefined && !isVaseMaterialId(value['vaseMaterialId'])) return false;
  if (value['backgroundMode'] !== undefined && !isBouquetBackgroundMode(value['backgroundMode'])) return false;
  if (value['sceneEffects'] !== undefined && !isBouquetSceneEffects(value['sceneEffects'])) return false;
  if (!Array.isArray(value['flowers'])) return false;

  return value['flowers'].every((flower) =>
    isRecord(flower)
    && typeof flower['instanceId'] === 'string'
    && typeof flower['definitionId'] === 'string'
    && isFiniteNumber(flower['x'])
    && isFiniteNumber(flower['y'])
    && isFiniteNumber(flower['z'])
    && isFiniteNumber(flower['scale'])
    && isFiniteNumber(flower['seed'])
    && (flower['leanX'] === undefined || isFiniteNumber(flower['leanX']))
    && (flower['leanZ'] === undefined || isFiniteNumber(flower['leanZ']))
    && (flower['rotationY'] === undefined || isFiniteNumber(flower['rotationY']))
    && (flower['cutRatio'] === undefined || isFiniteNumber(flower['cutRatio']))
    && (flower['nodeOffsets'] === undefined || isRecord(flower['nodeOffsets'])));
}

export function isFlowerDefinition(value: unknown): value is FlowerDefinition {
  return isRecord(value)
    && value['schemaVersion'] === 2
    && typeof value['id'] === 'string'
    && value['id'].length > 0
    && typeof value['name'] === 'string'
    && typeof value['rootNodeId'] === 'string'
    && isRecord(value['stem'])
    && Array.isArray(value['nodes']);
}

export function isBouquetProject(value: unknown): value is BouquetProject {
  return isRecord(value)
    && typeof value['id'] === 'string'
    && typeof value['name'] === 'string'
    && isBouquetState(value['state']);
}

export function isProjectExport(value: unknown): value is ProjectExport {
  return isRecord(value)
    && value['schemaVersion'] === 2
    && Array.isArray(value['definitions'])
    && isBouquetState(value['bouquet'])
    && (value['bouquets'] === undefined || Array.isArray(value['bouquets']))
    && (value['activeBouquetId'] === undefined || typeof value['activeBouquetId'] === 'string');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isBouquetSceneEffects(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return ['sparkles', 'glowPoints', 'uplight', 'fireflies', 'glitter'].every((effect) =>
    value[effect] === undefined || typeof value[effect] === 'boolean');
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
