import {
  FlowerDefinition,
  GraphicBendProfile,
  GraphicPatternLayer,
  MAX_GRAPHIC_BEND,
} from './flower.models';
import {effectiveConnection} from './flower-connections';

export interface FlowerValidationIssue {
  severity: 'error' | 'warning';
  message: string;
}

export interface FlowerValidationOptions {
  /** Der Editor darf während des freien Verknüpfens vorübergehend keinen aktiven Baum haben. */
  allowForest?: boolean;
}

export function validateFlowerDefinition(
  definition: FlowerDefinition,
  options: FlowerValidationOptions = {},
): FlowerValidationIssue[] {
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
    if (!options.allowForest) {
      issues.push({severity: 'error', message: `Der Basisknoten „${definition.rootNodeId}“ fehlt.`});
      return issues;
    }
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
        invalidGraphicBend(node.graphic.bendMain)
        || invalidGraphicBend(node.graphic.bendCross)
        || invalidGraphicBendProfile(node.graphic.bendMainProfile)
        || invalidGraphicBendProfile(node.graphic.bendCrossProfile)
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
      if ((node.graphic.primitive ?? 'png') === 'png' && node.graphic.patterns?.length) {
        issues.push({severity: 'error', message: `„${node.name}“ kann keine parametrischen Muster auf eine PNG-Grafik legen.`});
      } else if (!validGraphicPatterns(node.graphic.patterns)) {
        issues.push({severity: 'error', message: `„${node.name}“ enthält ungültige Musterebenen.`});
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
      if (connection.stem && (
        connection.stem.width <= 0
        || (connection.stem.startWidth ?? 1) <= 0
        || (connection.stem.endWidth ?? 1) <= 0
      )) {
        issues.push({severity: 'error', message: `„${node.id}“ hat eine ungültige Stängeldicke.`});
      }
      if (Math.abs(connection.stem?.bend ?? 0) > 100) {
        issues.push({severity: 'error', message: `„${node.id}“ hat eine ungültige Stängelbiegung.`});
      }
      if ((connection.stem?.curve ?? 0) < 0 || (connection.stem?.curve ?? 0) > 100) {
        issues.push({severity: 'error', message: `„${node.id}“ hat eine ungültige Stängelkrümmung.`});
      }
      if (invalidDegreeRange(connection.roll) || invalidDegreeRange(connection.stem?.bendRotation)) {
        issues.push({severity: 'error', message: `„${node.id}“ hat eine ungültige lokale Drehung.`});
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

  if (ids.has(definition.rootNodeId)) visit(definition.rootNodeId);
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

function invalidDegreeRange(range: {min: number; max: number} | undefined): boolean {
  return !!range && (
    !Number.isFinite(range.min)
    || !Number.isFinite(range.max)
    || Math.abs(range.min) > 360
    || Math.abs(range.max) > 360
  );
}

function validGraphicPatterns(patterns: GraphicPatternLayer[] | undefined): boolean {
  if (!patterns) return true;
  const ids = new Set<string>();
  for (const pattern of patterns) {
    if (!pattern.id.trim() || ids.has(pattern.id)) return false;
    ids.add(pattern.id);
    if (!['gradient', 'veins', 'spots', 'edge'].includes(pattern.type)) return false;
    if (!pattern.color.trim() || !Number.isFinite(pattern.opacity) || pattern.opacity < 0 || pattern.opacity > 1) {
      return false;
    }
    if (pattern.type === 'gradient'
      && pattern.direction !== undefined
      && !['base-to-tip', 'tip-to-base'].includes(pattern.direction)) return false;
    if (pattern.type === 'veins' && (
      !within(pattern.density ?? 7, 1, 24)
      || !within(pattern.size ?? 0.012, 0.002, 0.12)
    )) return false;
    if (pattern.type === 'spots' && (
      !within(pattern.density ?? 18, 1, 160)
      || !within(pattern.size ?? 0.035, 0.003, 0.3)
      || !Number.isFinite(pattern.seed ?? 0.42)
    )) return false;
    if (pattern.type === 'edge' && !within(pattern.width ?? 0.055, 0.003, 0.4)) return false;
  }
  return true;
}

function within(value: number, minimum: number, maximum: number): boolean {
  return Number.isFinite(value) && value >= minimum && value <= maximum;
}

function invalidGraphicBendProfile(
  profile: GraphicBendProfile | undefined,
): boolean {
  return !!profile && (
    !within(profile.base, -MAX_GRAPHIC_BEND, MAX_GRAPHIC_BEND)
    || !within(profile.tip, -MAX_GRAPHIC_BEND, MAX_GRAPHIC_BEND)
  );
}

function invalidGraphicBend(value: number | undefined): boolean {
  return value !== undefined
    && (!Number.isFinite(value) || Math.abs(value) > MAX_GRAPHIC_BEND);
}
