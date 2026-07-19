import {
  FlowerNodeComponent,
  FlowerNodeDefinition,
  ResolvedFlowerNodeConnection,
} from './flower.models';
import {effectiveConnection, normalizeIncomingConnection} from './flower-connections';

export interface FlowerGraphEdge {
  sourceId: string;
  targetId: string;
  connectionIndex: number;
  connection: ResolvedFlowerNodeConnection;
}

export interface FlowerGraph {
  nodes: Map<string, FlowerNodeDefinition>;
  outgoing: Map<string, FlowerGraphEdge[]>;
  incoming: Map<string, FlowerGraphEdge>;
  loops: Map<string, NonNullable<FlowerNodeDefinition['loop']>>;
  components: Map<string, FlowerNodeComponent>;
}

export function createFlowerGraph(
  nodes: Iterable<FlowerNodeDefinition>,
): FlowerGraph {
  const nodeMap = new Map<string, FlowerNodeDefinition>();
  for (const node of nodes) nodeMap.set(node.id, node);

  const outgoing = new Map<string, FlowerGraphEdge[]>();
  const incoming = new Map<string, FlowerGraphEdge>();
  const loops = new Map<string, NonNullable<FlowerNodeDefinition['loop']>>();
  const components = new Map<string, FlowerNodeComponent>();
  const definition = {
    schemaVersion: 2 as const,
    id: '',
    name: '',
    rootNodeId: '',
    stem: {
      color: '#000000',
      highlightColor: '#ffffff',
      width: 1,
      taper: 1,
    },
    nodes: [...nodeMap.values()],
  };

  for (const source of nodeMap.values()) {
    if (source.loop) loops.set(source.id, source.loop);
    if (source.component) components.set(source.id, source.component);

    const edges = source.connections.map((connection, connectionIndex) => {
      const effective = effectiveConnection(definition, connection);
      return {
        sourceId: source.id,
        targetId: effective.childId,
        connectionIndex,
        connection: effective,
      } satisfies FlowerGraphEdge;
    });
    outgoing.set(source.id, edges);
    for (const edge of edges) {
      if (!incoming.has(edge.targetId)) incoming.set(edge.targetId, edge);
    }
  }

  return {nodes: nodeMap, outgoing, incoming, loops, components};
}

export function graphOutgoing(
  graph: FlowerGraph,
  sourceId: string,
): FlowerGraphEdge[] {
  return graph.outgoing.get(sourceId) ?? [];
}

export function graphLoopStartEdge(
  graph: FlowerGraph,
  loopNode: FlowerNodeDefinition,
  entryEdge: FlowerGraphEdge,
): FlowerGraphEdge {
  const startNodeId = loopNode.loop?.startNodeId;
  const startNode = startNodeId ? graph.nodes.get(startNodeId) : undefined;
  if (!startNodeId || !startNode?.incoming) return entryEdge;
  return {
    sourceId: startNodeId,
    targetId: startNodeId,
    connectionIndex: -1,
    connection: {...normalizeIncomingConnection(startNode.incoming), childId: startNodeId},
  };
}
