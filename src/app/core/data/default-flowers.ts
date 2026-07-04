import {FlowerDefinition, FlowerNodeGraphic} from '../models/flower.models';

const rosePetal = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140">
  <path d="M50 136C18 105 6 67 20 35 31 10 49 2 50 2s19 8 30 33c14 32 2 70-30 101Z" fill="#e75b71"/>
  <path d="M50 125C35 88 34 43 50 12c16 31 15 76 0 113Z" fill="#f58aa0" opacity=".62"/>
</svg>`;

const daisyPetal = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 150">
  <path d="M35 148C12 122 3 80 13 40 20 14 31 2 35 2s15 12 22 38c10 40 1 82-22 108Z" fill="#fffdf7"/>
  <path d="M35 140V12" stroke="#f0e9da" stroke-width="5" stroke-linecap="round"/>
</svg>`;

const lilacPetal = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <path d="M50 48C17 45 7 20 21 9c13-10 27 4 29 23C52 13 66-1 79 9c14 11 4 36-29 39Z" fill="#a778c4"/>
  <path d="M50 48c33 3 43 28 29 39-13 10-27-4-29-23-2 19-16 33-29 23C7 76 17 51 50 48Z" fill="#bd91d3"/>
  <circle cx="50" cy="49" r="9" fill="#f2d8a4"/>
</svg>`;

const leaf = (fill: string, accent: string): string => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 70">
  <path d="M3 64C18 15 63-3 117 7 102 53 56 76 3 64Z" fill="${fill}"/>
  <path d="M9 61C43 50 71 33 108 11M42 49 33 26M67 37l-2-25M87 25l12 14" fill="none" stroke="${accent}" stroke-width="4" stroke-linecap="round"/>
</svg>`;

const center = (fill: string, accent: string): string => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="47" fill="${fill}"/>
  <g fill="${accent}">
    <circle cx="31" cy="32" r="5"/><circle cx="52" cy="25" r="5"/><circle cx="71" cy="36" r="5"/>
    <circle cx="26" cy="55" r="5"/><circle cx="48" cy="49" r="5"/><circle cx="70" cy="59" r="5"/>
    <circle cx="42" cy="72" r="5"/><circle cx="61" cy="76" r="5"/>
  </g>
</svg>`;

const graphic = (
  svg: string,
  width: number,
  height: number,
  anchorX = 0.5,
  anchorY = 0.5,
  rotationMin = 0,
  rotationMax = 0,
): FlowerNodeGraphic => ({
  svg, width, height, anchorX, anchorY,
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
          {childId: 'stem', mode: 'chain', repeat: {min: 2, max: 3}, length: {min: 92, max: 122}, angle: {min: -7, max: 7}},
        ],
      },
      {
        id: 'stem', name: 'Gewachsener Stängel', draggable: false, graphic: null,
        connections: [
          {childId: 'leaf', mode: 'branches', repeat: {min: 3, max: 5}, length: {min: 18, max: 34}, angle: {min: -72, max: 72}},
          {childId: 'bloom', mode: 'branches', repeat: {min: 1, max: 1}, length: {min: 36, max: 48}, angle: {min: -5, max: 5}},
        ],
      },
      {id: 'leaf', name: 'Blattgrafik', draggable: false, graphic: graphic(leaf('#477b49', '#8db77d'), 76, 44, 0, 0.5, -18, 18), connections: []},
      {
        id: 'bloom', name: 'Blütenzentrum', draggable: true, graphic: graphic(center('#8f2942', '#d95b70'), 44, 44),
        connections: [
          {childId: 'petal', mode: 'branches', repeat: {min: 15, max: 20}, length: {min: 0, max: 3}, angle: {min: -180, max: 180}},
        ],
      },
      {id: 'petal', name: 'Rosenblatt', draggable: false, graphic: graphic(rosePetal, 43, 72, 0.5, 0.88), connections: []},
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
          {childId: 'stem', mode: 'chain', repeat: {min: 3, max: 4}, length: {min: 72, max: 94}, angle: {min: -5, max: 5}},
        ],
      },
      {
        id: 'stem', name: 'Stängel', draggable: false, graphic: null,
        connections: [
          {childId: 'leaf', mode: 'branches', repeat: {min: 3, max: 5}, length: {min: 20, max: 34}, angle: {min: -68, max: 68}},
          {childId: 'flower-head', mode: 'branches', repeat: {min: 2, max: 4}, length: {min: 42, max: 115}, angle: {min: -42, max: 42}},
        ],
      },
      {id: 'leaf', name: 'Blatt', draggable: false, graphic: graphic(leaf('#5b8d53', '#9fc18a'), 68, 38, 0, 0.5, -15, 15), connections: []},
      {
        id: 'flower-head', name: 'Blütenkopf', draggable: true, graphic: graphic(center('#e4b43f', '#a66d28'), 34, 34),
        connections: [
          {childId: 'petal', mode: 'branches', repeat: {min: 12, max: 16}, length: {min: 0, max: 1}, angle: {min: -180, max: 180}},
        ],
      },
      {id: 'petal', name: 'Blütenblatt', draggable: false, graphic: graphic(daisyPetal, 30, 62, 0.5, 0.91), connections: []},
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
          {childId: 'stem', mode: 'chain', repeat: {min: 3, max: 4}, length: {min: 70, max: 88}, angle: {min: -6, max: 6}},
        ],
      },
      {
        id: 'stem', name: 'Hauptstängel', draggable: false, graphic: null,
        connections: [
          {childId: 'leaf', mode: 'branches', repeat: {min: 2, max: 4}, length: {min: 24, max: 40}, angle: {min: -72, max: 72}},
          {childId: 'umbel', mode: 'branches', repeat: {min: 3, max: 5}, length: {min: 34, max: 82}, angle: {min: -48, max: 48}},
        ],
      },
      {id: 'leaf', name: 'Blatt', draggable: false, graphic: graphic(leaf('#477b55', '#94b989'), 70, 41, 0, 0.5, -18, 18), connections: []},
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
      {id: 'floret', name: 'Einzelblüte', draggable: false, graphic: graphic(lilacPetal, 24, 24, 0.5, 0.5, -20, 20), connections: []},
    ],
  },
];
