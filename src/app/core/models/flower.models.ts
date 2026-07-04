export interface NumberRange {
  min: number;
  max: number;
}

export type NodeRepeatMode = 'chain' | 'branches';

export interface FlowerNodeConnection {
  childId: string;
  repeat: NumberRange;
  mode: NodeRepeatMode;
  length: NumberRange;
  angle: NumberRange;
}

export interface FlowerNodeGraphic {
  svg: string;
  width: number;
  height: number;
  rotation: NumberRange;
  anchorX: number;
  anchorY: number;
}

export interface FlowerNodeDefinition {
  id: string;
  name: string;
  draggable: boolean;
  graphic: FlowerNodeGraphic | null;
  connections: FlowerNodeConnection[];
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
