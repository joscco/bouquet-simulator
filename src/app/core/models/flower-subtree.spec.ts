import {describe, expect, it} from 'vitest';
import {FlowerDefinition} from './flower.models';
import {
  createFlowerDefinitionComponent,
  createFlowerSubtree,
  extractFlowerSubtreeComponent,
  insertFlowerDefinitionReference,
  insertFlowerSubtree,
  resolveFlowerSubtreeSelection,
} from './flower-subtree';
import {materializeDefinitionComponents} from './flower-components';

const definition: FlowerDefinition = {
  schemaVersion: 2,
  id: 'rose',
  name: 'Rose',
  rootNodeId: 'root',
  stem: {color: '#000000', highlightColor: '#ffffff', width: 5, taper: 0.8},
  nodes: [
    {
      id: 'root',
      name: 'Root',
      draggable: false,
      graphic: null,
      connections: [connection('branch')],
    },
    {
      id: 'branch',
      name: 'Branch',
      draggable: false,
      graphic: null,
      incoming: incoming(),
      connections: [connection('left'), connection('right')],
    },
    {
      id: 'left',
      name: 'Left flower',
      draggable: false,
      graphic: null,
      incoming: incoming(),
      connections: [],
    },
    {
      id: 'right',
      name: 'Right flower',
      draggable: false,
      graphic: null,
      incoming: incoming(),
      connections: [],
    },
  ],
};

const positions = {
  root: {x: 500, y: 800},
  branch: {x: 500, y: 600},
  left: {x: 400, y: 400},
  right: {x: 600, y: 400},
};

describe('flower subtrees', () => {
  it('includes the connecting branch between marked nodes', () => {
    const selection = resolveFlowerSubtreeSelection(definition, ['left', 'right']);

    expect(selection?.rootNodeId).toBe('branch');
    expect([...selection!.nodeIds].sort()).toEqual(['branch', 'left', 'right']);
  });

  it('exports only internal connections and relative positions', () => {
    const selection = resolveFlowerSubtreeSelection(definition, ['left', 'right'])!;
    const tree = createFlowerSubtree(definition, positions, selection, {
      id: 'flowers',
      name: 'Flowers',
      createdAt: '2026-07-11T00:00:00.000Z',
    });

    expect(tree.nodes.map((node) => node.id).sort()).toEqual(['branch', 'left', 'right']);
    expect(tree.editor?.nodePositions.branch).toEqual({x: 0, y: 0});
    expect(tree.editor?.nodePositions.left).toEqual({x: -100, y: -200});
    expect(tree.nodes.find((node) => node.id === 'branch')?.connections.map((entry) => entry.childId))
      .toEqual(['left', 'right']);
  });

  it('keeps internal leaves and external exit nodes as component outputs', () => {
    const selection = resolveFlowerSubtreeSelection(definition, ['branch', 'left'])!;
    const tree = createFlowerSubtree(definition, positions, selection, {
      id: 'branch-and-left',
      name: 'Branch and left',
    });

    expect(tree.outputNodeIds?.sort()).toEqual(['branch', 'left']);
  });

  it('treats a complete flower definition as a reusable component', () => {
    const component = createFlowerDefinitionComponent({
      ...definition,
      editor: {nodePositions: positions},
    });

    expect(component.id).toBe(definition.id);
    expect(component.rootNodeId).toBe(definition.rootNodeId);
    expect(component.nodes.map((node) => node.id).sort()).toEqual(['branch', 'left', 'right', 'root']);
    expect(component.editor?.nodePositions.root).toEqual({x: 0, y: 0});
  });

  it('inserts a saved tree as a single component node below the selected parent', () => {
    const selection = resolveFlowerSubtreeSelection(definition, ['left', 'right'])!;
    const tree = createFlowerSubtree(definition, positions, selection, {
      id: 'flowers',
      name: 'Flowers',
    });
    const inserted = insertFlowerSubtree(definition, positions, tree, 'root');

    expect(inserted.definition.nodes).toHaveLength(definition.nodes.length + 1);
    expect(new Set(inserted.definition.nodes.map((node) => node.id)).size)
      .toBe(inserted.definition.nodes.length);
    expect(inserted.definition.nodes.find((node) => node.id === inserted.insertedNodeId)?.component?.nodes)
      .toHaveLength(3);
    expect(inserted.definition.nodes.find((node) => node.id === 'root')?.connections)
      .toContainEqual(expect.objectContaining({childId: inserted.insertedNodeId}));
    expect(inserted.nodePositions[inserted.insertedNodeId].y).toBeLessThan(positions.root.y);
  });

  it('materializes component references from the current source definition', () => {
    const updatedSource: FlowerDefinition = {
      ...definition,
      nodes: definition.nodes.map((node) => node.id === 'left'
        ? {...node, name: 'Updated left flower'}
        : node),
    };
    const staleComponent = createFlowerDefinitionComponent(definition);
    const consumer: FlowerDefinition = {
      ...definition,
      id: 'consumer',
      nodes: [
        {
          id: 'root',
          name: 'Root',
          draggable: false,
          graphic: null,
          connections: [connection('component')],
        },
        {
          id: 'component',
          name: 'Component',
          draggable: false,
          graphic: null,
          incoming: incoming(),
          connections: [],
          component: staleComponent,
        },
      ],
    };

    const resolved = materializeDefinitionComponents([consumer, updatedSource])[0]!;
    const resolvedComponent = resolved.nodes.find((node) => node.id === 'component')?.component;

    expect(resolvedComponent?.nodes?.find((node) => node.id === 'left')?.name)
      .toBe('Updated left flower');
  });

  it('materializes reference-only component nodes for rendering', () => {
    const consumer: FlowerDefinition = {
      ...definition,
      id: 'consumer',
      nodes: [
        {
          id: 'root',
          name: 'Root',
          draggable: false,
          graphic: null,
          connections: [connection('component')],
        },
        {
          id: 'component',
          name: 'Component',
          draggable: false,
          graphic: null,
          incoming: incoming(),
          connections: [],
          component: {
            schemaVersion: 1,
            id: definition.id,
            name: definition.name,
            sourceDefinitionId: definition.id,
          },
        },
      ],
    };

    const resolved = materializeDefinitionComponents([consumer, definition])[0]!;
    const resolvedComponent = resolved.nodes.find((node) => node.id === 'component')?.component;

    expect(resolvedComponent?.nodes?.map((node) => node.id).sort())
      .toEqual(['branch', 'left', 'right', 'root']);
  });

  it('inserts catalog definitions as references without embedding their nodes', () => {
    const inserted = insertFlowerDefinitionReference(definition, positions, definition, 'root');
    const component = inserted.definition.nodes.find((node) => node.id === inserted.insertedNodeId)?.component;

    expect(component).toEqual({
      schemaVersion: 1,
      id: definition.id,
      name: definition.name,
      sourceDefinitionId: definition.id,
    });
  });

  it('keeps an explicit empty component output list', () => {
    const component = createFlowerDefinitionComponent({
      ...definition,
      outputNodeIds: [],
    });

    expect(component.outputNodeIds).toEqual([]);
  });

  it('extracts selected nodes into one component node and preserves external children', () => {
    const selection = resolveFlowerSubtreeSelection(definition, ['branch', 'left'])!;
    const extracted = extractFlowerSubtreeComponent(definition, positions, selection, {
      id: 'branch-component',
      name: 'Branch component',
    });

    const component = extracted.definition.nodes.find((node) => node.id === extracted.insertedNodeId)!;
    expect(component.component?.nodes?.map((node) => node.id).sort()).toEqual(['branch', 'left']);
    expect(component.component?.outputNodeIds?.sort()).toEqual(['branch', 'left']);
    expect(extracted.definition.nodes.some((node) => node.id === 'branch')).toBe(false);
    expect(component.connections).toContainEqual(expect.objectContaining({childId: 'right'}));
    expect(extracted.definition.nodes.find((node) => node.id === 'root')?.connections)
      .toContainEqual(expect.objectContaining({childId: extracted.insertedNodeId}));
  });
});

function incoming() {
  return {
    repeat: {min: 1, max: 1},
    length: {min: 20, max: 30},
    angle: {min: 0, max: 20},
    azimuth: {min: 0, max: 360},
    randomness: 0.2,
  };
}

function connection(childId: string) {
  return {childId, ...incoming()};
}
