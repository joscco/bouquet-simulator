import {FlowerDefinition} from './flower.models';

export interface FlowerValidationIssue {
  severity: 'error' | 'warning';
  message: string;
}

export function validateFlowerDefinition(definition: FlowerDefinition): FlowerValidationIssue[] {
  const issues: FlowerValidationIssue[] = [];
  const ids = new Set<string>();

  for (const node of definition.nodes) {
    if (!node.id.trim()) issues.push({severity: 'error', message: 'Ein Knoten hat keine ID.'});
    if (ids.has(node.id)) {
      issues.push({severity: 'error', message: `Die Knoten-ID „${node.id}“ ist doppelt vergeben.`});
    }
    ids.add(node.id);
  }
  if (!ids.has(definition.rootNodeId)) {
    issues.push({severity: 'error', message: `Der Basisknoten „${definition.rootNodeId}“ fehlt.`});
    return issues;
  }
  if (definition.nodes.find((node) => node.id === definition.rootNodeId)?.loop) {
    issues.push({severity: 'error', message: 'Ein Loop kann nicht der Basisknoten sein.'});
  }
  const nodes = new Map(definition.nodes.map((node) => [node.id, node]));

  function hasPath(startId: string, endId: string, visited = new Set<string>()): boolean {
    if (startId === endId) return true;
    if (visited.has(startId)) return false;
    visited.add(startId);
    return (nodes.get(startId)?.connections ?? []).some((connection) =>
      hasPath(connection.childId, endId, visited));
  }

  for (const node of definition.nodes) {
    if (node.loop) {
      if (
        !node.loop.startNodeId
        || !node.loop.endNodeId
        || !ids.has(node.loop.startNodeId)
        || !ids.has(node.loop.endNodeId)
      ) {
        issues.push({severity: 'error', message: `Loop „${node.name}“ benötigt einen gültigen Start und ein gültiges Ende.`});
      } else if (!hasPath(node.loop.startNodeId, node.loop.endNodeId)) {
        issues.push({severity: 'error', message: `In Loop „${node.name}“ ist das Ende vom Start aus nicht erreichbar.`});
      }
    }
    if (
      node.graphic
      && !node.graphic.png?.startsWith('data:image/png')
      && !node.graphic.png?.toLowerCase().endsWith('.png')
    ) {
      issues.push({severity: 'error', message: `„${node.name}“ verwendet keine PNG-Grafik.`});
    }
    if (node.graphic) {
      const points = [node.graphic.start, node.graphic.end];
      if (points.some((point) =>
        !point
        || point.x < 0
        || point.x > 1
        || point.y < 0
        || point.y > 1
      )) {
        issues.push({severity: 'error', message: `„${node.name}“ hat ungültige Ausrichtungspunkte.`});
      } else if (
        node.graphic.start.x === node.graphic.end.x
        && node.graphic.start.y === node.graphic.end.y
      ) {
        issues.push({severity: 'error', message: `„${node.name}“ benötigt zwei verschiedene Ausrichtungspunkte.`});
      }
    }
    for (const connection of node.connections) {
      if (!ids.has(connection.childId)) {
        issues.push({
          severity: 'error',
          message: `„${node.id}“ verweist auf den fehlenden Knoten „${connection.childId}“.`,
        });
      }
      if (connection.repeat.min < 0 || connection.repeat.max < 0) {
        issues.push({severity: 'error', message: `„${node.id}“ hat eine negative Wiederholungszahl.`});
      }
      if (connection.stem && connection.stem.width <= 0) {
        issues.push({severity: 'error', message: `„${node.id}“ hat eine ungültige Stängeldicke.`});
      }
    }
  }

  const reachable = new Set<string>();
  const active = new Set<string>();
  const reportedCycles = new Set<string>();

  function visit(id: string): void {
    if (active.has(id)) {
      if (!reportedCycles.has(id)) {
        issues.push({severity: 'error', message: `Zyklische Verbindung bei „${id}“ gefunden.`});
        reportedCycles.add(id);
      }
      return;
    }
    if (reachable.has(id)) return;
    reachable.add(id);
    active.add(id);
    const node = nodes.get(id);
    if (node?.loop?.startNodeId && nodes.has(node.loop.startNodeId)) {
      visit(node.loop.startNodeId);
    }
    for (const connection of node?.connections ?? []) {
      if (nodes.has(connection.childId)) visit(connection.childId);
    }
    active.delete(id);
  }

  visit(definition.rootNodeId);
  for (const node of definition.nodes) {
    if (!reachable.has(node.id)) {
      issues.push({
        severity: 'warning',
        message: `„${node.name}“ ist nicht mit dem Basisknoten verbunden und wird nicht erzeugt.`,
      });
    }
  }
  return issues;
}
