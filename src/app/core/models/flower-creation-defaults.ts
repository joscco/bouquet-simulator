import {
  FlowerDefinition,
  FlowerNodeGraphic,
  FlowerNodeIncomingConnection,
  GraphicPatternLayer,
  GraphicPatternType,
  NumberRange,
} from './flower.models';

interface FlowerCreationDefaults {
  definition: {
    name: string;
    rootNodeId: string;
    rootNodeName: string;
    stem: FlowerDefinition['stem'];
  };
  node: {
    namePrefix: string;
    draggable: boolean;
  };
  incoming: FlowerNodeIncomingConnection;
  graphic: FlowerNodeGraphic;
  patterns: Record<GraphicPatternType, Omit<GraphicPatternLayer, 'id' | 'type'>>;
  loop: {
    namePrefix: string;
    repeat: NumberRange;
  };
}

/**
 * Zentrale Startwerte für alles, was im Blumen-Editor neu angelegt wird.
 * Bestehende Blumen werden durch Änderungen hier nicht nachträglich verändert.
 */
export const FLOWER_CREATION_DEFAULTS: FlowerCreationDefaults = {
  definition: {
    name: 'Neue Blume',
    rootNodeId: 'base',
    rootNodeName: 'Basis',
    stem: {
      color: '#426f50',
      highlightColor: '#82a878',
      width: 8,
      taper: 1,
      bend: 0,
      curve: 14,
    },
  },
  node: {
    namePrefix: 'Knoten',
    draggable: false,
  },
  incoming: {
    repeat: {min: 1, max: 1},
    length: {min: 50, max: 50},
    direction: {x: 0, y: 0, z: 0},
    spread: {
      deviation: {min: 0, max: 0},
      revolution: {min: -180, max: 180},
      roll: {min: 0, max: 0},
      randomness: 0,
      orientation: 'spread',
    },
    stem: {
      color: '#426f50',
      width: 3,
      startWidth: 3,
      endWidth: 3,
      bend: 0,
      curve: 0,
      bendRotation: {min: 0, max: 0},
    },
  },
  graphic: {
    primitive: 'leaf-pointed',
    color: '#5b8d53',
    width: 50,
    height: 50,
    depth: 2,
    twist: 0,
    ribCount: 0,
    ribDepth: 0,
    leafEdge: {
      serrationCount: 7,
      serrationDepth: 0,
      serrationSharpness: 70,
      edgeCurvature: 0,
    },
    offset: {x: 0, y: 0, z: 0},
    orientation: 'toward-parent',
    rotationBase: 0,
    rotationSpread: 0,
    rotation: {min: 0, max: 0},
    start: {x: 0.5, y: 0.9},
    end: {x: 0.5, y: 0.1},
  },
  patterns: {
    gradient: {color: '#fef3c7', opacity: 0.55, direction: 'base-to-tip'},
    veins: {color: '#315c3a', opacity: 0.72, density: 7, size: 0.012, angle: 22},
    spots: {color: '#7c3aed', opacity: 0.62, density: 18, size: 0.035, seed: 0.42},
    edge: {color: '#14532d', opacity: 0.58, width: 0.055},
  },
  loop: {
    namePrefix: 'Wiederholung',
    repeat: {min: 2, max: 4},
  },
};
