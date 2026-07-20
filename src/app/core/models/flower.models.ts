export interface NumberRange {
  min: number;
  max: number;
}

export interface GraphicPoint {
  x: number;
  y: number;
}

/** Mehrere vollständige Windungen bleiben editierbar, ohne unbeschränkte Extremwerte zuzulassen. */
export const MAX_GRAPHIC_BEND = 800;

export interface GraphicBendProfile {
  base: number;
  tip: number;
}

export type GraphicPrimitive =
  | 'leaf-pointed'
  | 'leaf-round'
  | 'leaf-serrated'
  | 'petal-rounded'
  | 'sphere'
  | 'rod'
  | 'cone'
  | 'disc'
  | 'png';

/** Form der Blattkante. Die Werte werden nur von gezackten Blättern ausgewertet. */
export interface GraphicLeafEdgeSettings {
  /** Anzahl der Zacken je Blattseite. */
  serrationCount: number;
  /** Tiefe der Einschnitte, 0 bis 100. */
  serrationDepth: number;
  /** Schärfe der Zackenspitzen, 0 bis 100. */
  serrationSharpness: number;
  /** Negativ = konkave, positiv = konvexe Übergänge zwischen den Spitzen. */
  edgeCurvature: number;
}

export interface GraphicPaintStroke {
  /** Position auf der Grafik, jeweils von 0 bis 1. */
  x: number;
  y: number;
  /** Pinseldurchmesser relativ zur Grafikbreite. */
  size: number;
  color: string;
}

export type GraphicPatternType = 'gradient' | 'veins' | 'spots' | 'edge';

/** Reproduzierbare UV-Musterebene. */
export interface GraphicPatternLayer {
  id: string;
  type: GraphicPatternType;
  color: string;
  /** Deckkraft der Ebene von 0 bis 1. */
  opacity: number;
  /** Richtung eines Verlaufs. */
  direction?: 'base-to-tip' | 'tip-to-base';
  /** Anzahl der Aderpaare beziehungsweise Flecken. */
  density?: number;
  /** Relative Flecken- oder Liniengröße. */
  size?: number;
  /** Richtung der Seitenadern in Grad: positiv zur Spitze, negativ zum Ansatz. */
  angle?: number;
  /** Deterministischer Startwert für verteilte Muster. */
  seed?: number;
  /** Relative Breite eines Randmusters. */
  width?: number;
}

export interface FlowerStemSettings {
  color: string;
  /** @deprecated Legacy-Fallback für Definitionen ohne lokale Segmentdicken. */
  width: number;
  /** Gewünschte Dicke am Anfang des Segments. */
  startWidth?: number;
  /** Gewünschte Dicke am Ende des Segments. */
  endWidth?: number;
  /** Seitliche Biegung des Stängelsegments, -100 bis 100. */
  bend?: number;
  /** Stärke einer leichten organischen Eigenkrümmung, 0 bis 100. */
  curve?: number;
  /** Drehung der Krümmungsebene relativ zur individuellen Roll-Achse. */
  bendRotation?: NumberRange;
}

export type FlowerNodePlacementMode = 'directional' | 'ring' | 'disc' | 'sphere';
export type FlowerNodePlacementOrientation = 'radial' | 'parent';

export interface FlowerNodePlacementSettings {
  /** Räumliche Verteilung relativ zum Elternknoten. */
  mode: FlowerNodePlacementMode;
  /** Wachstumsrichtung unabhängig von der verteilten Position. */
  orientation?: FlowerNodePlacementOrientation;
}

export type FlowerNodeGrowthOrientation = 'spread' | 'main';

/** Feste Wachstumsrichtung relativ zur eingehenden Verbindung. */
export interface FlowerNodeMainDirection {
  /** Lokale Drehung um die X-Achse der eingehenden Verbindung, in Grad. */
  x: number;
  /** Lokale Drehung um die Y-/Wachstumsachse, in Grad. */
  y: number;
  /** Lokale Drehung um die Z-Achse der eingehenden Verbindung, in Grad. */
  z: number;
  /** @deprecated Alte polare Darstellung; wird beim Laden nach X/Y/Z migriert. */
  inclination?: number;
  /** @deprecated Alte polare Darstellung; wird beim Laden nach X/Y/Z migriert. */
  azimuth?: number;
  /** @deprecated Alte polare Darstellung; wird beim Laden nach X/Y/Z migriert. */
  roll?: number;
}

/** Verteilung mehrerer Instanzen um die Hauptrichtung. */
export interface FlowerNodeSpreadSettings {
  /** Polarwinkel relativ zur Hauptrichtung, in Grad. */
  deviation: NumberRange;
  /** Umlaufwinkel um die Hauptrichtung, in Grad. */
  revolution: NumberRange;
  /** Zusätzliche Eigendrehung je Instanz, in Grad. */
  roll: NumberRange;
  /** 0 verteilt deterministisch gleichmäßig, 1 vollständig zufällig. */
  randomness: number;
  /** Wachstumsachse folgt der gestreuten Richtung oder bleibt in Hauptrichtung. */
  orientation: FlowerNodeGrowthOrientation;
}

export interface FlowerNodeIncomingConnection {
  repeat: NumberRange;
  length: NumberRange;
  /** X/Y/Z-Translation im gemeinsamen Hauptrichtungsrahmen inklusive aller Nachfolger. */
  originOffset?: {x: number; y: number; z: number};
  direction?: FlowerNodeMainDirection;
  spread?: FlowerNodeSpreadSettings;
  /** @deprecated Wird beim Laden nach direction/spread migriert. */
  /** Neigung relativ zur Wachstumsrichtung des Elternknotens, in Grad. */
  angle?: NumberRange;
  /** @deprecated Wird beim Laden nach direction/spread migriert. */
  /** Drehung um die Wachstumsrichtung des Elternknotens, in Grad. */
  azimuth?: NumberRange;
  /** @deprecated Wird beim Laden nach direction/spread migriert. */
  /** Individuelle Roll-Drehung um die eigene Wachstumsrichtung, in Grad. */
  roll?: NumberRange;
  /** @deprecated Wird beim Laden nach spread.randomness migriert. */
  /** 0 verteilt Wiederholungen gleichmäßig, 1 vollständig zufällig. */
  randomness?: number;
  /** @deprecated Wird beim Laden nach direction/spread migriert. */
  /** Optionale räumliche Anordnung; fehlend entspricht der gerichteten Astverteilung. */
  placement?: FlowerNodePlacementSettings;
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
  /** Parametrische, reproduzierbare Musterebenen in Zeichenreihenfolge. */
  patterns?: GraphicPatternLayer[];
  /** @deprecated Alte Freihandpunkte bleiben darstellbar, werden aber nicht mehr neu erzeugt. */
  paint?: GraphicPaintStroke[];
  /** Wölbung entlang der Wachstumsrichtung; Werte über ±100 erzeugen stärkere Windungen. */
  bendMain?: number;
  /** Absolute Hauptrichtungswölbung am Ansatz und an der Spitze. */
  bendMainProfile?: GraphicBendProfile;
  /** Wölbung quer zur Wachstumsrichtung; Werte über ±100 rollen das Element ein. */
  bendCross?: number;
  /** Absolute Nebenrichtungswölbung am Ansatz und an der Spitze. */
  bendCrossProfile?: GraphicBendProfile;
  /** Roll-Ausrichtung der Grafik um ihre Wachstumsrichtung. */
  orientation?: 'connection' | 'toward-parent';
  /** Elementspezifische Kontur eines gezackten Blatts. */
  leafEdge?: GraphicLeafEdgeSettings;
  /** Drehung des Blatts vom Ansatz bis zur Spitze, in Grad. */
  twist?: number;
  /** Anzahl radialer Rippen einer Kugel/Ellipsoid-Form. */
  ribCount?: number;
  /** Tiefe der radialen Rippen, 0 bis 100. */
  ribDepth?: number;
  /** Konstante Drehung um die Wachstumsrichtung, in Grad. */
  rotationBase?: number;
  /** Symmetrische zufällige Abweichung von rotationBase, in Grad. */
  rotationSpread?: number;
  png?: string;
  width: number;
  height: number;
  depth?: number;
  /** @deprecated Breite, Höhe und Tiefe bestimmen die Größe vollständig. */
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
  /** @deprecated Wird beim Laden in die beiden unabhaengigen Katalogfreigaben migriert. */
  catalogRole?: 'flower' | 'component';
  /** Die Definition kann im Bouquet-Picker ausgewaehlt werden. */
  availableInBouquet?: boolean;
  /** Die Definition kann im Flower-Editor als echte Referenz eingefuegt werden. */
  availableAsComponent?: boolean;
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
    /** @deprecated Legacy-Fallback für Verbindungen ohne lokale Segmentdicken. */
    width: number;
    /** @deprecated Wird nur noch zur verlustfreien Darstellung alter Definitionen verwendet. */
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
  /** Eigendrehung der Blumeninstanz um ihre Wachstumsachse, in Radiant. */
  rotationY?: number;
  seed: number;
  /** 0 = vollständig, 1 = von unten maximal gekürzt. */
  cutRatio?: number;
  nodeOffsets?: Record<string, NodeOffset>;
}

export type BouquetBackgroundMode = 'light' | 'dark';
export type BouquetSceneEffectId = keyof BouquetSceneEffects;

export interface BouquetSceneEffects {
  sparkles: boolean;
  glowPoints: boolean;
  uplight: boolean;
}

export interface BouquetState {
  schemaVersion: 2;
  rotation: number;
  vaseId?: string;
  /** Von der Vasenform unabhängige Oberflächenoptik. */
  vaseMaterialId?: string;
  /** Lichtstimmung von 0 (Nacht) über 50 (Dämmerung) bis 100 (Tag). */
  lightLevel?: number;
  /** @deprecated Legacy-Fallback für Projekte ohne lightLevel. */
  backgroundMode?: BouquetBackgroundMode;
  sceneEffects?: BouquetSceneEffects;
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
