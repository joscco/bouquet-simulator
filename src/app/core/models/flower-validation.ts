import {FlowerDefinition} from './flower.models';
import {effectiveConnection} from './flower-connections';

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
  if (definition.outputNodeIds?.some((id) => !ids.has(id))) {
    issues.push({severity: 'error', message: 'Die Komponentenausgänge enthalten einen fehlenden Knoten.'});
  }
  if (Math.abs(definition.stem.bend ?? 0) > 100) {
    issues.push({severity: 'error', message: 'Die Standard-Stängelbiegung ist ungültig.'});
  }
  if ((definition.stem.curve ?? 0) < 0 || (definition.stem.curve ?? 0) > 100) {
    issues.push({severity: 'error', message: 'Die Standard-Stängelkrümmung ist ungültig.'});
  }
  const nodes = new Map(definition.nodes.map((node) => [node.id, node]));
  const incomingCounts = new Map<string, number>();
  for (const source of definition.nodes) {
    for (const connection of source.connections) {
      incomingCounts.set(connection.childId, (incomingCounts.get(connection.childId) ?? 0) + 1);
    }
  }

  function hasPath(startId: string, endId: string, visited = new Set<string>()): boolean {
    if (startId === endId) return true;
    if (visited.has(startId)) return false;
    visited.add(startId);
    return (nodes.get(startId)?.connections ?? []).some((connection) =>
      hasPath(connection.childId, endId, visited));
  }

  for (const node of definition.nodes) {
    if (node.loop) {
      const memberNodeIds = node.loop.memberNodeIds ?? [];
      if (memberNodeIds.some((id) => !ids.has(id))) {
        issues.push({severity: 'error', message: `Loop „${node.name}“ enthält einen fehlenden Knoten.`});
      }
      if ((node.loop.continuationOutputNodeIds ?? []).some((id) => !memberNodeIds.includes(id))) {
        issues.push({severity: 'error', message: `Loop „${node.name}“ hat einen ungültigen Fortsetzungsoutput.`});
      }
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
      && (node.graphic.primitive ?? 'png') === 'png'
      && !node.graphic.png?.startsWith('data:image/png')
      && !node.graphic.png?.toLowerCase().endsWith('.png')
    ) {
      issues.push({severity: 'error', message: `„${node.name}“ verwendet keine PNG-Grafik.`});
    }
    if (node.graphic) {
      if (node.graphic.width <= 0 || node.graphic.height <= 0 || (node.graphic.depth ?? 1) <= 0) {
        issues.push({severity: 'error', message: `„${node.name}“ hat eine ungültige Größe.`});
      }
      if (
        Math.abs(node.graphic.bendMain ?? 0) > 100
        || Math.abs(node.graphic.bendCross ?? 0) > 100
      ) {
        issues.push({severity: 'error', message: `„${node.name}“ hat eine ungültige Wölbung.`});
      }
      if (
        node.graphic.orientation
        && !['connection', 'toward-parent'].includes(node.graphic.orientation)
      ) {
        issues.push({severity: 'error', message: `„${node.name}“ hat eine ungültige Ausrichtung.`});
      }
      if (
        Math.abs(node.graphic.rotationBase ?? 0) > 180
        || (node.graphic.rotationSpread ?? 0) < 0
        || (node.graphic.rotationSpread ?? 0) > 180
      ) {
        issues.push({severity: 'error', message: `„${node.name}“ hat eine ungültige Grafikdrehung.`});
      }
      if ((node.graphic.scale ?? 1) <= 0) {
        issues.push({severity: 'error', message: `„${node.name}“ hat eine ungültige Grafikskalierung.`});
      }
      if ((node.graphic.paint ?? []).some((stroke) =>
        stroke.x < 0
        || stroke.x > 1
        || stroke.y < 0
        || stroke.y > 1
        || stroke.size <= 0
        || stroke.size > 1
      )) {
        issues.push({severity: 'error', message: `„${node.name}“ enthält ungültige Pinselstriche.`});
      }
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
    if ((incomingCounts.get(node.id) ?? 0) > 1) {
      issues.push({severity: 'error', message: `„${node.name}“ hat mehr als eine Eingangsverbindung.`});
    }
    for (const legacyConnection of node.connections) {
      const connection = effectiveConnection(definition, legacyConnection);
      if ((connection.randomness ?? 0.35) < 0 || (connection.randomness ?? 0.35) > 1) {
        issues.push({severity: 'error', message: `„${node.id}“ hat eine ungültige Zufallsverteilung.`});
      }
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
      if (Math.abs(connection.stem?.bend ?? 0) > 100) {
        issues.push({severity: 'error', message: `„${node.id}“ hat eine ungültige Stängelbiegung.`});
      }
      if ((connection.stem?.curve ?? 0) < 0 || (connection.stem?.curve ?? 0) > 100) {
        issues.push({severity: 'error', message: `„${node.id}“ hat eine ungültige Stängelkrümmung.`});
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
