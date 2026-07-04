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

  for (const node of definition.nodes) {
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
    }
  }

  const reachable = new Set<string>();
  const active = new Set<string>();
  const nodes = new Map(definition.nodes.map((node) => [node.id, node]));
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
    for (const connection of nodes.get(id)?.connections ?? []) {
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
