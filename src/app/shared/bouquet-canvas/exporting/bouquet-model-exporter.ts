import {Group} from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {DEFAULT_VASE_ID, normalizedVaseMaterialId} from '../../../core/data/vases';
import {
  BouquetFlower,
  BouquetState,
  FlowerDefinition,
} from '../../../core/models/flower.models';
import {createBouquetFlower} from '../rendering/bouquet-flower-renderer';
import {createBouquetVase} from '../rendering/bouquet-vase-renderer';
import {disposeGroupChildren} from '../rendering/dispose-three-object';

const GLB_MIME_TYPE = 'model/gltf-binary';
const MODEL_UNIT_SCALE = 0.001;

export interface BouquetModelExportOptions {
  includeVase: boolean;
  name: string;
}

export async function exportBouquetModelGlb(
  state: BouquetState,
  definitions: readonly FlowerDefinition[],
  options: BouquetModelExportOptions,
): Promise<Blob> {
  const model = createBouquetExportModel(state, definitions, options);
  try {
    const result = await new GLTFExporter().parseAsync(model, {
      binary: true,
      onlyVisible: true,
      maxTextureSize: 2048,
    });
    if (!(result instanceof ArrayBuffer)) throw new Error('Der GLB-Exporter hat keine Binärdatei erzeugt.');
    return new Blob([result], {type: GLB_MIME_TYPE});
  } catch (error: unknown) {
    throw new Error('Das 3D-Modell konnte nicht als GLB exportiert werden.', {cause: error});
  } finally {
    disposeGroupChildren(model);
  }
}

export function createBouquetExportModel(
  state: BouquetState,
  definitions: readonly FlowerDefinition[],
  options: BouquetModelExportOptions,
): Group {
  const model = new Group();
  model.name = options.name.trim() || 'Bouquet';
  model.scale.setScalar(MODEL_UNIT_SCALE);
  model.rotation.y = state.rotation;
  const definitionsById = new Map(definitions.map((definition) => [definition.id, definition]));
  const vaseId = state.vaseId ?? DEFAULT_VASE_ID;

  if (options.includeVase) {
    const vase = createBouquetVase(vaseId, normalizedVaseMaterialId(state.vaseMaterialId));
    vase.name = 'Vase';
    model.add(vase);
  }

  state.flowers.forEach((flower, index) => {
    const definition = definitionsById.get(flower.definitionId);
    if (!definition) return;
    const flowerModel = createExportFlower(definition, flower, options.includeVase ? vaseId : null);
    flowerModel.name = `${definition.name || 'Flower'} ${index + 1}`;
    model.add(flowerModel);
  });

  model.updateMatrixWorld(true);
  return model;
}

export function flowerModelState(definition: FlowerDefinition, seed: number): BouquetState {
  return {
    schemaVersion: 2,
    rotation: 0,
    flowers: [{
      instanceId: 'flower-model-export',
      definitionId: definition.id,
      x: 0,
      y: 0,
      z: 0,
      scale: 1,
      seed,
      nodeOffsets: {},
    }],
  };
}

export function glbFilename(name: string, fallback: string): string {
  const normalized = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('de')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${normalized || fallback}.glb`;
}

function createExportFlower(
  definition: FlowerDefinition,
  flower: BouquetFlower,
  vaseId: string | null,
): Group {
  return createBouquetFlower(definition, flower, {
    vaseEnabled: vaseId !== null,
    vaseId,
    selected: false,
    overlapping: false,
    highlightedNodeIds: new Set<string>(),
    highlightedConnection: null,
    requestRender: () => undefined,
  });
}
