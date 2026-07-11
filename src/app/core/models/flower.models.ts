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
  | 'leaf-serrated'
  /** @deprecated Alte Dateien werden weiterhin geladen; entspricht leaf-pointed. */
  | 'petal-pointed'
  /** @deprecated Alte Dateien werden weiterhin geladen; entspricht leaf-round. */
  | 'petal-round'
  | 'sphere'
  | 'rod'
  | 'png';

export interface GraphicPaintStroke {
  /** Position auf der Grafik, jeweils von 0 bis 1. */
  x: number;
  y: number;
  /** Pinseldurchmesser relativ zur Grafikbreite. */
  size: number;
  color: string;
}

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

export type FlowerNodeIncomingConnection = Omit<FlowerNodeConnection, 'childId'>;

export interface FlowerNodeGraphic {
  primitive?: GraphicPrimitive;
  color?: string;
  accentColor?: string;
  /** Freihand-Bemalung in UV-Koordinaten. */
  paint?: GraphicPaintStroke[];
  /** Wölbung entlang der Wachstumsrichtung, -100 bis 100. */
  bendMain?: number;
  /** Wölbung quer zur Wachstumsrichtung, -100 bis 100. */
  bendCross?: number;
  /** Roll-Ausrichtung der Grafik um ihre Wachstumsrichtung. */
  orientation?: 'connection' | 'toward-parent';
  /** Konstante Drehung um die Wachstumsrichtung, in Grad. */
  rotationBase?: number;
  /** Symmetrische zufällige Abweichung von rotationBase, in Grad. */
  rotationSpread?: number;
  png?: string;
  width: number;
  height: number;
  depth?: number;
  /** Einheitliche Skalierung zusätzlich zu Breite, Höhe und Tiefe. */
  scale?: number;
  /** Lokaler Versatz der Grafik relativ zum Ursprung des Knotens. */
  offset?: {x: number; y: number; z: number};
  rotation: NumberRange;
  start: GraphicPoint;
  end: GraphicPoint;
}

export interface FlowerNodeDefinition {
  id: string;
  name: string;
  draggable: boolean;
  graphic: FlowerNodeGraphic | null;
  /** Parameter der einzigen zulässigen Eingangsverbindung. */
  incoming?: FlowerNodeIncomingConnection;
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
  /** Neigung der gesamten Blume um ihren Einsteckpunkt. */
  leanX?: number;
  leanZ?: number;
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
