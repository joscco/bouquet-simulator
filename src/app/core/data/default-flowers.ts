import {FlowerDefinition, FlowerNodeGraphic} from '../models/flower.models';

const graphic = (
  png: string,
  width: number,
  height: number,
  startX = 0.5,
  startY = 0.5,
  endX = 0.5,
  endY = 0,
  rotationMin = 0,
  rotationMax = 0,
): FlowerNodeGraphic => ({
  png, width, height,
  start: {x: startX, y: startY},
  end: {x: endX, y: endY},
  rotation: {min: rotationMin, max: rotationMax},
});

export const DEFAULT_FLOWERS: FlowerDefinition[] = [
  {
    schemaVersion: 2,
    id: 'garden-rose',
    name: 'Gartenrose',
    rootNodeId: 'base',
    stem: {color: '#477348', highlightColor: '#76a56e', width: 10, taper: 0.72},
    nodes: [
      {
        id: 'base', name: 'Basis', draggable: false, graphic: null,
        connections: [
          {childId: 'growth-loop', mode: 'branches', repeat: {min: 1, max: 1}, length: {min: 92, max: 122}, angle: {min: -7, max: 7}},
        ],
      },
      {
        id: 'growth-loop', name: 'Stängel mit Blättern', draggable: false, graphic: null,
        loop: {repeat: {min: 2, max: 3}, startNodeId: 'stem', endNodeId: 'leaf'},
        connections: [
          {childId: 'bloom', mode: 'branches', repeat: {min: 1, max: 1}, length: {min: 36, max: 48}, angle: {min: -5, max: 5}},
        ],
      },
      {
        id: 'stem', name: 'Gewachsener Stängel', draggable: false, graphic: null,
        connections: [
          {childId: 'leaf', mode: 'branches', repeat: {min: 1, max: 2}, length: {min: 18, max: 34}, angle: {min: -72, max: 72}},
        ],
      },
      {id: 'leaf', name: 'Blattgrafik', draggable: false, graphic: graphic('/flower-graphics/rose-leaf.png', 76, 44, 0, 0.5, 1, 0.5, -18, 18), connections: []},
      {
        id: 'bloom', name: 'Blütenzentrum', draggable: true, graphic: graphic('/flower-graphics/rose-center.png', 44, 44),
        connections: [
          {childId: 'petal', mode: 'branches', repeat: {min: 15, max: 20}, length: {min: 0, max: 3}, angle: {min: -180, max: 180}},
        ],
      },
      {id: 'petal', name: 'Rosenblatt', draggable: false, graphic: graphic('/flower-graphics/rose-petal.png', 43, 72, 0.5, 0.88, 0.5, 0.05), connections: []},
    ],
  },
  {
    schemaVersion: 2,
    id: 'meadow-daisy',
    name: 'Margerite',
    rootNodeId: 'base',
    stem: {color: '#50835a', highlightColor: '#88af78', width: 7, taper: 0.68},
    nodes: [
      {
        id: 'base', name: 'Basis', draggable: false, graphic: null,
        connections: [
          {childId: 'growth-loop', mode: 'branches', repeat: {min: 1, max: 1}, length: {min: 72, max: 94}, angle: {min: -5, max: 5}},
        ],
      },
      {
        id: 'growth-loop', name: 'Stängel mit Blättern', draggable: false, graphic: null,
        loop: {repeat: {min: 3, max: 4}, startNodeId: 'stem', endNodeId: 'leaf'},
        connections: [
          {childId: 'flower-head', mode: 'branches', repeat: {min: 2, max: 4}, length: {min: 42, max: 115}, angle: {min: -42, max: 42}},
        ],
      },
      {
        id: 'stem', name: 'Stängel', draggable: false, graphic: null,
        connections: [
          {childId: 'leaf', mode: 'branches', repeat: {min: 1, max: 2}, length: {min: 20, max: 34}, angle: {min: -68, max: 68}},
        ],
      },
      {id: 'leaf', name: 'Blatt', draggable: false, graphic: graphic('/flower-graphics/daisy-leaf.png', 68, 38, 0, 0.5, 1, 0.5, -15, 15), connections: []},
      {
        id: 'flower-head', name: 'Blütenkopf', draggable: true, graphic: graphic('/flower-graphics/daisy-center.png', 34, 34),
        connections: [
          {childId: 'petal', mode: 'branches', repeat: {min: 12, max: 16}, length: {min: 0, max: 1}, angle: {min: -180, max: 180}},
        ],
      },
      {id: 'petal', name: 'Blütenblatt', draggable: false, graphic: graphic('/flower-graphics/daisy-petal.png', 30, 62, 0.5, 0.91, 0.5, 0.05), connections: []},
    ],
  },
  {
    schemaVersion: 2,
    id: 'lilac',
    name: 'Flieder',
    rootNodeId: 'base',
    stem: {color: '#426f50', highlightColor: '#82a878', width: 9, taper: 0.62},
    nodes: [
      {
        id: 'base', name: 'Basis', draggable: false, graphic: null,
        connections: [
          {childId: 'growth-loop', mode: 'branches', repeat: {min: 1, max: 1}, length: {min: 70, max: 88}, angle: {min: -6, max: 6}},
        ],
      },
      {
        id: 'growth-loop', name: 'Stängel mit Blättern', draggable: false, graphic: null,
        loop: {repeat: {min: 3, max: 4}, startNodeId: 'stem', endNodeId: 'leaf'},
        connections: [
          {childId: 'umbel', mode: 'branches', repeat: {min: 3, max: 5}, length: {min: 34, max: 82}, angle: {min: -48, max: 48}},
        ],
      },
      {
        id: 'stem', name: 'Hauptstängel', draggable: false, graphic: null,
        connections: [
          {childId: 'leaf', mode: 'branches', repeat: {min: 1, max: 2}, length: {min: 24, max: 40}, angle: {min: -72, max: 72}},
        ],
      },
      {id: 'leaf', name: 'Blatt', draggable: false, graphic: graphic('/flower-graphics/lilac-leaf.png', 70, 41, 0, 0.5, 1, 0.5, -18, 18), connections: []},
      {
        id: 'umbel', name: 'Doldenast', draggable: true, graphic: null,
        connections: [
          {childId: 'sprig', mode: 'branches', repeat: {min: 3, max: 5}, length: {min: 22, max: 45}, angle: {min: -55, max: 55}},
        ],
      },
      {
        id: 'sprig', name: 'Blütenzweig', draggable: false, graphic: null,
        connections: [
          {childId: 'floret', mode: 'branches', repeat: {min: 3, max: 6}, length: {min: 7, max: 23}, angle: {min: -75, max: 75}},
        ],
      },
      {id: 'floret', name: 'Einzelblüte', draggable: false, graphic: graphic('/flower-graphics/lilac-floret.png', 24, 24, 0.5, 0.5, 0.5, 0, -20, 20), connections: []},
    ],
  },
];
