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

export interface FlowerStemSettings {
  color: string;
  width: number;
  /** Seitliche Biegung des Stängelsegments, -100 bis 100. */
  bend?: number;
  /** Stärke einer leichten organischen Eigenkrümmung, 0 bis 100. */
  curve?: number;
}

export interface FlowerNodeIncomingConnection {
  repeat: NumberRange;
  length: NumberRange;
  /** Neigung relativ zur Wachstumsrichtung des Elternknotens, in Grad. */
  angle: NumberRange;
  /** Drehung um die Wachstumsrichtung des Elternknotens, in Grad. */
  azimuth?: NumberRange;
  /** 0 verteilt Wiederholungen gleichmäßig, 1 vollständig zufällig. */
  randomness?: number;
  stem?: FlowerStemSettings;
}

/**
 * Ausgehende Kanten sind Referenzen. Historische Daten duerfen hier noch
 * konkrete Parameter enthalten; neue Editor-Aktionen speichern nur childId.
 */
export interface FlowerNodeConnection extends Partial<FlowerNodeIncomingConnection> {
  childId: string;
}

export type ResolvedFlowerNodeConnection = FlowerNodeIncomingConnection & { childId: string };

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

export interface FlowerNodeComponent {
  schemaVersion: 1;
  id: string;
  name: string;
  rootNodeId?: string;
  /** Interne Knoten, an denen externe Nachfolger einer Komponente weiterwachsen. */
  outputNodeIds?: string[];
  createdAt?: string;
  sourceDefinitionId?: string;
  nodes?: FlowerNodeDefinition[];
  editor?: {
    nodePositions: Record<string, {x: number; y: number}>;
  };
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
    /** Sichtbar gerahmte Knoten, die als Teilbaum wiederholt werden. */
    memberNodeIds?: string[];
    /** Outputs, von denen aus die nächste Wiederholung weiterwächst. Leer/fehlend = alle Outputs. */
    continuationOutputNodeIds?: string[];
  };
  component?: FlowerNodeComponent;
}

export interface FlowerDefinition {
  schemaVersion: 2;
  id: string;
  name: string;
  /** Nur fertige Blumen erscheinen im Strauß-Editor; Komponenten bleiben im Flower-Editor wiederverwendbar. */
  catalogRole?: 'flower' | 'component';
  catalogIcon?: {
    symbol: string;
    color: string;
  };
  /** Explizite Komponenten-Ausgänge. Undefined = automatisch offene Endknoten, [] = keine Ausgänge. */
  outputNodeIds?: string[];
  rootNodeId: string;
  stem: {
    color: string;
    highlightColor: string;
    width: number;
    taper: number;
    /** Standard-Biegung neuer Stängelsegmente, -100 bis 100. */
    bend?: number;
    /** Standard-Stärke einer leichten organischen Eigenkrümmung, 0 bis 100. */
    curve?: number;
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
  /** 0 = vollständig, 1 = von unten maximal gekürzt. */
  cutRatio?: number;
  nodeOffsets?: Record<string, NodeOffset>;
}

export interface BouquetState {
  schemaVersion: 2;
  rotation: number;
  vaseId?: string;
  flowers: BouquetFlower[];
}

export interface BouquetProject {
  id: string;
  name: string;
  state: BouquetState;
}

export interface ProjectExport {
  schemaVersion: 2;
  exportedAt: string;
  definitions: FlowerDefinition[];
  bouquet: BouquetState;
  bouquets?: BouquetProject[];
  activeBouquetId?: string;
}
