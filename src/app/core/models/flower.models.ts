export interface NumberRange {
  min: number;
  max: number;
}

export interface GraphicPoint {
  x: number;
  y: number;
}

export type NodeRepeatMode = 'chain' | 'branches';

export interface FlowerNodeConnection {
  childId: string;
  repeat: NumberRange;
  mode: NodeRepeatMode;
  length: NumberRange;
  angle: NumberRange;
  stem?: {
    color: string;
    width: number;
  };
}

export interface FlowerNodeGraphic {
  png: string;
  width: number;
  height: number;
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
