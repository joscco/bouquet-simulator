import {
  FlowerDefinition,
  FlowerNodeGraphic,
  FlowerNodeIncomingConnection,
  FlowerNodePlacementSettings,
  GraphicPrimitive,
  NumberRange,
} from '../models/flower.models';

const range = (min: number, max = min): NumberRange => ({min, max});

interface IncomingOptions {
  count?: NumberRange;
  length: NumberRange;
  angle?: NumberRange;
  azimuth?: NumberRange;
  roll?: NumberRange;
  randomness?: number;
  placement?: FlowerNodePlacementSettings;
  stem?: {
    color: string;
    startWidth: number;
    endWidth: number;
    bend?: number;
    curve?: number;
    bendDirection?: NumberRange;
  };
}

function incoming(options: IncomingOptions): FlowerNodeIncomingConnection {
  return {
    repeat: options.count ?? range(1),
    length: options.length,
    angle: options.angle ?? range(0),
    azimuth: options.azimuth ?? range(0, 360),
    roll: options.roll ?? range(0),
    randomness: options.randomness ?? 0.22,
    placement: options.placement,
    stem: options.stem ? {
      color: options.stem.color,
      width: options.stem.startWidth,
      startWidth: options.stem.startWidth,
      endWidth: options.stem.endWidth,
      bend: options.stem.bend ?? 0,
      curve: options.stem.curve ?? 20,
      bendRotation: options.stem.bendDirection ?? range(0),
    } : undefined,
  };
}

function graphic(
  primitive: GraphicPrimitive,
  color: string,
  width: number,
  height: number,
  depth: number,
  patch: Partial<FlowerNodeGraphic> = {},
): FlowerNodeGraphic {
  return {
    primitive,
    color,
    width,
    height,
    depth,
    scale: 1,
    orientation: 'toward-parent',
    rotationBase: 0,
    rotationSpread: 0,
    rotation: range(0),
    start: {x: 0.5, y: 0.92},
    end: {x: 0.5, y: 0.08},
    ...patch,
  };
}

const GREEN = '#50754a';
const STEM = (startWidth: number, endWidth: number, bend = 0, curve = 24) => ({
  color: GREEN,
  startWidth,
  endWidth,
  bend,
  curve,
  bendDirection: range(-25, 25),
});

export const ADDITIONAL_DEFAULT_FLOWERS: FlowerDefinition[] = [
  {
    schemaVersion: 2,
    id: 'sunflower',
    name: 'Sonnenblume',
    rootNodeId: 'base',
    availableInBouquet: true,
    availableAsComponent: true,
    catalogIcon: {symbol: '☀', color: '#d59b18'},
    outputNodeIds: [],
    stem: {color: GREEN, highlightColor: '#83a86b', width: 9, taper: 0.68, bend: 0, curve: 24},
    nodes: [
      {
        id: 'base', name: 'Basis', draggable: false, graphic: null,
        connections: [{childId: 'head'}, {childId: 'leaf'}],
      },
      {
        id: 'head', name: 'Blütenkopf', draggable: false,
        graphic: graphic('disc', '#604020', 46, 8, 46, {orientation: 'connection'}),
        incoming: incoming({length: range(155, 185), angle: range(0, 5), stem: STEM(9, 5, 8, 38)}),
        connections: [{childId: 'petal'}, {childId: 'seed-crown'}],
      },
      {
        id: 'petal', name: 'Strahlenblüten', draggable: false,
        graphic: graphic('petal-rounded', '#e3ae22', 15, 43, 2.5, {
          bendMain: -34, bendCross: 18, rotationSpread: 10,
        }),
        incoming: incoming({
          count: range(20, 24), length: range(20), angle: range(70, 84),
          azimuth: range(0, 360), roll: range(-12, 12), randomness: 0.12,
          placement: {mode: 'ring', orientation: 'radial'},
          stem: {color: '#d5a01d', startWidth: 1.4, endWidth: 0.7, bend: 12, curve: 24},
        }),
        connections: [],
      },
      {
        id: 'seed-crown', name: 'Samenkranz', draggable: false,
        graphic: graphic('cone', '#8a5b24', 5, 8, 5, {orientation: 'connection'}),
        incoming: incoming({
          count: range(24, 30), length: range(0, 20), angle: range(25, 72),
          azimuth: range(0, 360), randomness: 0.18,
          placement: {mode: 'disc', orientation: 'parent'},
          stem: {color: '#71502a', startWidth: 1.2, endWidth: 0.6, bend: 8, curve: 18},
        }),
        connections: [],
      },
      {
        id: 'leaf', name: 'Stängelblätter', draggable: false,
        graphic: graphic('leaf-serrated', '#4d7b42', 34, 78, 3, {
          bendMain: 32,
          bendCross: 22,
          rotationSpread: 14,
          leafEdge: {serrationCount: 9, serrationDepth: 23, serrationSharpness: 76, edgeCurvature: -42},
          patterns: [{id: 'leaf-veins', type: 'veins', color: '#315b35', opacity: 0.5, density: 7, size: 0.025, angle: 28}],
        }),
        incoming: incoming({
          count: range(2, 4), length: range(72, 125), angle: range(22, 48),
          azimuth: range(0, 360), randomness: 0.42, stem: STEM(4, 2.2, 20, 44),
        }),
        connections: [],
      },
    ],
    editor: {nodePositions: {
      base: {x: 500, y: 720}, head: {x: 500, y: 520},
      petal: {x: 315, y: 320}, 'seed-crown': {x: 500, y: 320}, leaf: {x: 700, y: 520},
    }},
  },
  {
    schemaVersion: 2,
    id: 'tulip',
    name: 'Tulpe',
    rootNodeId: 'base',
    availableInBouquet: true,
    availableAsComponent: true,
    catalogIcon: {symbol: '♢', color: '#cf416b'},
    outputNodeIds: [],
    stem: {color: '#467744', highlightColor: '#80a86c', width: 7, taper: 0.62, bend: 0, curve: 28},
    nodes: [
      {
        id: 'base', name: 'Basis', draggable: false, graphic: null,
        connections: [{childId: 'bloom'}, {childId: 'leaf'}],
      },
      {
        id: 'bloom', name: 'Blütenansatz', draggable: false, graphic: null,
        incoming: incoming({length: range(135, 170), angle: range(0, 7), stem: STEM(7, 3.5, 10, 46)}),
        connections: [{childId: 'outer-petal'}, {childId: 'inner-petal'}, {childId: 'stamen'}],
      },
      {
        id: 'outer-petal', name: 'Äußere Blütenblätter', draggable: false,
        graphic: graphic('petal-rounded', '#d94d78', 38, 68, 3, {
          accentColor: '#f291ad', bendMain: -46, bendCross: 38,
          rotationBase: 4, rotationSpread: 8,
          patterns: [{id: 'petal-gradient', type: 'gradient', color: '#8f244f', opacity: 0.42, direction: 'base-to-tip'}],
        }),
        incoming: incoming({
          count: range(6), length: range(10), angle: range(17, 30),
          azimuth: range(0, 360), randomness: 0.05,
          placement: {mode: 'ring', orientation: 'radial'},
          stem: {color: '#b93463', startWidth: 1.5, endWidth: 0.7, bend: 8, curve: 20},
        }),
        connections: [],
      },
      {
        id: 'inner-petal', name: 'Innere Blütenblätter', draggable: false,
        graphic: graphic('petal-rounded', '#eb668b', 30, 60, 2.5, {
          bendMain: -22, bendCross: 50, rotationBase: 30, rotationSpread: 6,
        }),
        incoming: incoming({
          count: range(3), length: range(7), angle: range(8, 16),
          azimuth: range(0, 360), randomness: 0,
          placement: {mode: 'ring', orientation: 'radial'},
          stem: {color: '#cf446d', startWidth: 1.3, endWidth: 0.6, bend: 6, curve: 16},
        }),
        connections: [],
      },
      {
        id: 'stamen', name: 'Staubblätter', draggable: false,
        graphic: graphic('rod', '#3c2b2a', 2.5, 22, 2.5, {orientation: 'connection'}),
        incoming: incoming({
          count: range(6), length: range(9), angle: range(7, 20),
          azimuth: range(0, 360), randomness: 0.16,
          placement: {mode: 'ring', orientation: 'parent'},
          stem: {color: '#4a3430', startWidth: 1.1, endWidth: 0.55, bend: 10, curve: 22},
        }),
        connections: [],
      },
      {
        id: 'leaf', name: 'Tulpenblätter', draggable: false,
        graphic: graphic('leaf-pointed', '#4c804b', 34, 118, 3, {
          bendMain: 44, bendCross: 32, rotationSpread: 8,
          patterns: [{id: 'leaf-gradient', type: 'gradient', color: '#274f31', opacity: 0.34, direction: 'base-to-tip'}],
        }),
        incoming: incoming({
          count: range(2, 3), length: range(65, 105), angle: range(9, 27),
          azimuth: range(0, 360), randomness: 0.34, stem: STEM(3.6, 1.8, 18, 50),
        }),
        connections: [],
      },
    ],
    editor: {nodePositions: {
      base: {x: 500, y: 760}, bloom: {x: 500, y: 560},
      'outer-petal': {x: 260, y: 340}, 'inner-petal': {x: 470, y: 340},
      stamen: {x: 680, y: 340}, leaf: {x: 720, y: 570},
    }},
  },
  {
    schemaVersion: 2,
    id: 'lavender',
    name: 'Lavendel',
    rootNodeId: 'base',
    availableInBouquet: true,
    availableAsComponent: true,
    catalogIcon: {symbol: '✦', color: '#7659a8'},
    outputNodeIds: [],
    stem: {color: '#55714a', highlightColor: '#91a879', width: 5, taper: 0.58, bend: 0, curve: 32},
    nodes: [
      {
        id: 'base', name: 'Basis', draggable: false, graphic: null,
        connections: [{childId: 'tip'}, {childId: 'leaf'}],
      },
      {
        id: 'tip', name: 'Blütenstand', draggable: false, graphic: null,
        incoming: incoming({length: range(125, 165), angle: range(0, 9), stem: STEM(5, 2.2, 12, 58)}),
        connections: [{childId: 'floret'}, {childId: 'bud'}],
      },
      {
        id: 'floret', name: 'Lavendelblüten', draggable: false,
        graphic: graphic('cone', '#7652a4', 9, 17, 9, {
          rotationSpread: 20,
        }),
        incoming: incoming({
          count: range(18, 24), length: range(30), angle: range(24, 76),
          azimuth: range(0, 360), roll: range(-30, 30), randomness: 0.28,
          placement: {mode: 'sphere', orientation: 'radial'},
          stem: {...STEM(1.8, 1.1, 28, 52), color: '#5d744e'},
        }),
        connections: [],
      },
      {
        id: 'bud', name: 'Knospen', draggable: false,
        graphic: graphic('sphere', '#9c7bc0', 7, 11, 7, {orientation: 'connection'}),
        incoming: incoming({
          count: range(8, 12), length: range(22), angle: range(12, 48),
          azimuth: range(0, 360), randomness: 0.36,
          placement: {mode: 'sphere', orientation: 'radial'},
          stem: {color: '#6f568a', startWidth: 1.2, endWidth: 0.55, bend: 16, curve: 35},
        }),
        connections: [],
      },
      {
        id: 'leaf', name: 'Schmale Blätter', draggable: false,
        graphic: graphic('leaf-pointed', '#617c53', 13, 54, 2, {
          bendMain: 38, bendCross: 18, rotationSpread: 16,
        }),
        incoming: incoming({
          count: range(4, 7), length: range(38, 92), angle: range(23, 54),
          azimuth: range(0, 360), randomness: 0.31, stem: STEM(2.2, 1.2, 24, 55),
        }),
        connections: [],
      },
    ],
    editor: {nodePositions: {
      base: {x: 500, y: 720}, tip: {x: 500, y: 510},
      floret: {x: 300, y: 300}, bud: {x: 510, y: 300}, leaf: {x: 720, y: 510},
    }},
  },
];
