import {describe, expect, it} from 'vitest';
import {ArrowHelper, Vector3} from 'three';
import {FlowerDefinition} from '../../../core/models/flower.models';
import {createBouquetFlower} from './bouquet-flower-renderer';

describe('bouquet flower renderer editor helpers', () => {
  it('renders the selected connection main direction as an arrow', () => {
    const definition: FlowerDefinition = {
      schemaVersion: 2,
      id: 'direction-arrow',
      name: 'Direction arrow',
      rootNodeId: 'root',
      stem: {color: '#315c3a', highlightColor: '#ffffff', width: 4, taper: 0.8},
      nodes: [
        {
          id: 'root', name: 'Root', draggable: false, graphic: null,
          connections: [{
            childId: 'branch',
            repeat: {min: 1, max: 1},
            length: {min: 40, max: 40},
            direction: {x: 90, y: 0, z: 0},
            spread: {
              deviation: {min: 0, max: 0},
              revolution: {min: 0, max: 0},
              roll: {min: 0, max: 0},
              randomness: 0,
              orientation: 'spread',
            },
          }],
        },
        {id: 'branch', name: 'Branch', draggable: false, graphic: null, connections: []},
      ],
    };

    const group = createBouquetFlower(definition, {
      instanceId: 'preview', definitionId: definition.id, x: 0, y: 0, z: 0, scale: 1, seed: 0.42,
    }, {
      vaseEnabled: false,
      vaseId: null,
      selected: false,
      overlapping: false,
      highlightedNodeIds: new Set(),
      highlightedConnection: {sourceId: 'root', index: 0},
      requestRender: () => undefined,
    });
    const arrow = group.children.find((child) => child.userData['editorMainDirection']);
    const baseArrow = group.children.find((child) => child.userData['editorBaseDirection']);

    expect(arrow).toBeInstanceOf(ArrowHelper);
    expect(baseArrow).toBeInstanceOf(ArrowHelper);
    const direction = new Vector3(0, 1, 0).applyQuaternion(arrow!.quaternion);
    const baseDirection = new Vector3(0, 1, 0).applyQuaternion(baseArrow!.quaternion);
    expect(direction.x).toBeCloseTo(1);
    expect(direction.y).toBeCloseTo(0);
    expect(direction.z).toBeCloseTo(0);
    expect(baseDirection.x).toBeCloseTo(0);
    expect(baseDirection.y).toBeCloseTo(1);
    expect(baseDirection.z).toBeCloseTo(0);
  });

});
