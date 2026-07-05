export interface NumberRange {
  min: number;
  max: number;
}

export interface GraphicPoint {
  x: number;
  y: number;
}

export type GraphicPrimitive =
  | 'leaf-pointed'
  | 'leaf-round'
  | 'petal-pointed'
  | 'petal-round'
  | 'sphere'
  | 'rod'
  | 'png';

export interface FlowerNodeConnection {
  childId: string;
  repeat: NumberRange;
  length: NumberRange;
  /** Neigung relativ zur Wachstumsrichtung des Elternknotens, in Grad. */
  angle: NumberRange;
  /** Drehung um die Wachstumsrichtung des Elternknotens, in Grad. */
  azimuth?: NumberRange;
  /** 0 verteilt Wiederholungen gleichmäßig, 1 vollständig zufällig. */
  randomness?: number;
  stem?: {
    color: string;
    width: number;
  };
}

export interface FlowerNodeGraphic {
  primitive?: GraphicPrimitive;
  color?: string;
  accentColor?: string;
  png?: string;
  width: number;
  height: number;
  depth?: number;
  rotation: NumberRange;
  start: GraphicPoint;
  end: GraphicPoint;
}

export interface FlowerNodeDefinition {
  id: string;
  name: string;
  draggable: boolean;
  graphic: FlowerNodeGraphic | null;
  connections: FlowerNodeConnection[];
  loop?: {
    repeat: NumberRange;
    startNodeId: string | null;
    endNodeId: string | null;
  };
}

export interface FlowerDefinition {
  schemaVersion: 2;
  id: string;
  name: string;
  rootNodeId: string;
  stem: {
    color: string;
    highlightColor: string;
    width: number;
    taper: number;
  };
  nodes: FlowerNodeDefinition[];
  editor?: {
    nodePositions: Record<string, {x: number; y: number}>;
  };
}

export interface NodeOffset {
  x: number;
  y: number;
}

export interface BouquetFlower {
  instanceId: string;
  definitionId: string;
  x: number;
  y: number;
  z: number;
  scale: number;
  seed: number;
  nodeOffsets?: Record<string, NodeOffset>;
}

export interface BouquetState {
  schemaVersion: 2;
  rotation: number;
  flowers: BouquetFlower[];
}

export interface ProjectExport {
  schemaVersion: 2;
  exportedAt: string;
  definitions: FlowerDefinition[];
  bouquet: BouquetState;
}
