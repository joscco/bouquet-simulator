import {Mesh, Object3D} from 'three';
import {describe, expect, it} from 'vitest';
import {FlowerDefinition} from '../../../core/models/flower.models';
import {
  createBouquetExportModel,
  exportBouquetModelGlb,
  flowerModelState,
  glbFilename,
} from './bouquet-model-exporter';

const DEFINITION: FlowerDefinition = {
  schemaVersion: 2,
  id: 'test-flower',
  name: 'Test Flower',
  rootNodeId: 'root',
  stem: {color: '#315b35', highlightColor: '#ffffff', width: 4, taper: 0.8},
  nodes: [{
    id: 'root',
    name: 'Root',
    draggable: false,
    graphic: {
      primitive: 'sphere',
      color: '#d97706',
      width: 10,
      height: 10,
      depth: 10,
      rotation: {min: 0, max: 0},
      start: {x: 0.5, y: 1},
      end: {x: 0.5, y: 0},
    },
    connections: [],
  }],
};

describe('bouquet GLB model export', () => {
  it('builds a clean, meter-scaled flower model', () => {
    const model = createBouquetExportModel(
      flowerModelState(DEFINITION, 0.42),
      [DEFINITION],
      {includeVase: false, name: DEFINITION.name},
    );

    expect(model.name).toBe('Test Flower');
    expect(model.scale.toArray()).toEqual([0.001, 0.001, 0.001]);
    expect(model.children).toHaveLength(1);
    expect(descendants(model).filter((object) => object instanceof Mesh)).toHaveLength(1);
  });

  it('creates a valid binary glTF 2.0 container', async () => {
    const blob = await exportBouquetModelGlb(
      flowerModelState(DEFINITION, 0.42),
      [DEFINITION],
      {includeVase: false, name: DEFINITION.name},
    );
    const buffer = await blob.arrayBuffer();
    const header = new DataView(buffer, 0, 12);

    expect(blob.type).toBe('model/gltf-binary');
    expect(header.getUint32(0, true)).toBe(0x46546c67);
    expect(header.getUint32(4, true)).toBe(2);
    expect(header.getUint32(8, true)).toBe(buffer.byteLength);
  });

  it('creates filesystem-safe GLB names', () => {
    expect(glbFilename('Mein Blumenstrauß!', 'strauss')).toBe('mein-blumenstrauss.glb');
    expect(glbFilename('   ', 'blume')).toBe('blume.glb');
  });
});

function descendants(root: Object3D): Object3D[] {
  const result: Object3D[] = [];
  root.traverse((object) => result.push(object));
  return result;
}
