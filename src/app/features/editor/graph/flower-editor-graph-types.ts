export interface Point {
  x: number;
  y: number;
}

export interface GraphNode extends Point {
  id: string;
  name: string;
  root: boolean;
  hasGraphic: boolean;
  component: boolean;
  componentNodeCount: number;
  componentOutputCount: number;
  outputPorts: Point[];
  outputPortLabels: string[];
  outputPortNames: string[];
  outputPortNodeIds: string[];
  loop: boolean;
  loopStartName: string;
  loopEndName: string;
  loopMember: boolean;
  memberIds: string[];
  width: number;
  height: number;
}

export interface GraphEdge {
  key: string;
  sourceId: string;
  targetId: string;
  index: number;
  path: string;
  labelX: number;
  labelY: number;
  label: string;
  selectable: boolean;
  color: string;
}

export interface GraphLayout {
  nodes: GraphNode[];
  edges: GraphEdge[];
  width: number;
  height: number;
}
