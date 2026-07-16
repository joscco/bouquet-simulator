import {
  Box3,
  Box3Helper,
  Color,
  Group,
  LineBasicMaterial,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from 'three';
import {
  BouquetFlower,
  FlowerDefinition,
} from '../../../core/models/flower.models';
import {resolvedStemWidths} from '../../../core/models/flower-connections';
import {isFlowerTemplateHighlighted} from '../../../core/rendering/flower-highlights';
import {graphicOrientationQuaternion} from '../../../core/rendering/graphic-orientation';
import {
  FlowerTreeNode,
  flattenFlowerTemplates,
  generateFlowerTree,
} from '../../../core/rendering/flower-tree';
import {cutFlowerTree} from '../../../core/rendering/flower-tree-cut';
import {
  createStemJointTangents,
  flowerTreePosition,
  pruneLowerFlowerBranches,
} from './bouquet-flower-tree';
import {createFlowerGraphicMesh} from './bouquet-graphic-renderer';
import {createStemMesh} from './bouquet-stem-geometry';

const EMPTY_OFFSETS: Record<string, {x: number; y: number}> = {};
const VASE_BRANCH_CLEARANCE = 34;
const SELECTION_GLOW_COLOR = '#14b8a6';
const SELECTION_GLOW_INTENSITY = 0.48;

export interface BouquetPickData {
  instanceId: string;
  scale?: number;
}

export interface FlowerRenderOptions {
  vaseEnabled: boolean;
  selected: boolean;
  overlapping: boolean;
  highlightedNodeIds: ReadonlySet<string>;
  highlightedConnection: {sourceId: string; index: number} | null;
  requestRender: () => void;
}

interface StemRenderEdge {
  from: FlowerTreeNode;
  to: FlowerTreeNode;
  startWidth: number;
  endWidth: number;
  color: string;
  bend: number;
  curve: number;
  curveRotation: number;
  highlighted: boolean;
  capStart: boolean;
  capEnd: boolean;
}

export function createBouquetFlower(
  definition: FlowerDefinition,
  flower: BouquetFlower,
  options: FlowerRenderOptions,
): Group {
  const group = new Group();
  group.userData['pick'] = {instanceId: flower.instanceId, scale: flower.scale} satisfies BouquetPickData;
  const templates = flattenFlowerTemplates(definition);
  let tree = cutFlowerTree(
    generateFlowerTree(definition, flower.seed, flower.nodeOffsets ?? EMPTY_OFFSETS),
    flower.cutRatio ?? 0,
  );
  if (options.vaseEnabled) tree = pruneLowerFlowerBranches(tree, VASE_BRANCH_CLEARANCE);
  const nodes = new Map(tree.nodes.map((node) => [node.id, node]));
  const stemEdges = collectStemEdges(definition, tree.nodes, tree.edges, options.highlightedConnection);
  const jointTangents = createStemJointTangents(stemEdges);
  const jointWidths = collectJointWidths(stemEdges);

  for (const stemEdge of stemEdges) {
    const stem = createStemMesh({
      from: stemEdge.from,
      to: stemEdge.to,
      startWidth: stemEdge.startWidth,
      endWidth: stemEdge.endWidth,
      startJointWidth: jointWidths.get(stemEdge.from.id) ?? stemEdge.startWidth,
      endJointWidth: jointWidths.get(stemEdge.to.id) ?? stemEdge.endWidth,
      color: stemEdge.color,
      opacity: 1,
      bend: stemEdge.bend,
      curve: stemEdge.curve,
      curveRotation: stemEdge.curveRotation,
      startTangent: jointTangents.get(stemEdge.from.id),
      endTangent: jointTangents.get(stemEdge.to.id),
      capStart: stemEdge.capStart,
      capEnd: stemEdge.capEnd,
    });
    if (stemEdge.highlighted
      || isFlowerTemplateHighlighted(stemEdge.to.templateId, options.highlightedNodeIds)) {
      applySelectionGlow(stem);
    }
    stem.userData['pick'] = {instanceId: flower.instanceId, scale: flower.scale} satisfies BouquetPickData;
    group.add(stem);
  }

  const graphicPrototypes = new Map<string, Mesh>();
  for (const node of tree.nodes) {
    const template = templates.get(node.templateId);
    if (!template?.graphic) continue;
    let prototype = graphicPrototypes.get(node.templateId);
    if (!prototype) {
      prototype = createFlowerGraphicMesh(template.graphic, options.requestRender);
      graphicPrototypes.set(node.templateId, prototype);
    }
    const graphic = prototype.clone();
    const orientation = graphicOrientationQuaternion(
      node,
      node.parentId ? nodes.get(node.parentId) : undefined,
      template.graphic,
      flower.seed,
    );
    graphic.quaternion.copy(orientation);
    const graphicOffset = template.graphic.offset ?? {x: 0, y: 0, z: 0};
    graphic.position.copy(flowerTreePosition(node)).add(
      new Vector3(graphicOffset.x, graphicOffset.y, graphicOffset.z).applyQuaternion(orientation),
    );
    graphic.scale.setScalar(Math.max(0.01, template.graphic.scale ?? 1));
    graphic.userData['pick'] = {
      instanceId: flower.instanceId,
      scale: flower.scale,
    } satisfies BouquetPickData;
    group.add(graphic);
    if (isFlowerTemplateHighlighted(node.templateId, options.highlightedNodeIds)) {
      applySelectionGlow(graphic);
    }
  }

  if (options.selected) addSelectionBounds(group);
  configureFlowerMeshes(group, options.overlapping);
  group.rotation.set(flower.leanX ?? 0, flower.rotationY ?? 0, flower.leanZ ?? 0);
  group.position.set(flower.x, -flower.y, flower.z);
  group.scale.setScalar(flower.scale);
  return group;
}

function collectStemEdges(
  definition: FlowerDefinition,
  treeNodes: FlowerTreeNode[],
  treeEdges: ReturnType<typeof generateFlowerTree>['edges'],
  highlightedConnection: FlowerRenderOptions['highlightedConnection'],
): StemRenderEdge[] {
  const nodes = new Map(treeNodes.map((node) => [node.id, node]));
  const outgoingCounts = new Map<string, number>();
  for (const edge of treeEdges) {
    outgoingCounts.set(edge.from, (outgoingCounts.get(edge.from) ?? 0) + 1);
  }

  const stemEdges: StemRenderEdge[] = [];
  for (const edge of treeEdges) {
    const from = nodes.get(edge.from);
    const to = nodes.get(edge.to);
    if (!from || !to) continue;
    const connection = edge.connection;
    const resolvedWidths = resolvedStemWidths(definition, connection, from.depth, to.depth);
    stemEdges.push({
      from,
      to,
      startWidth: Math.max(1.1, resolvedWidths.startWidth),
      endWidth: Math.max(1.1, resolvedWidths.endWidth),
      color: connection.stem?.color ?? definition.stem.color,
      bend: connection.stem?.bend ?? definition.stem.bend ?? 0,
      curve: connection.stem?.curve ?? definition.stem.curve ?? 14,
      curveRotation: (to.attachmentAzimuth ?? 0) + (to.roll ?? 0) + (to.bendRotation ?? 0),
      highlighted: highlightedConnection?.sourceId === edge.connectionSourceId
        && highlightedConnection?.index === edge.connectionIndex,
      capStart: from.parentId === null,
      capEnd: (outgoingCounts.get(to.id) ?? 0) === 0,
    });
  }
  return stemEdges;
}

function collectJointWidths(edges: readonly StemRenderEdge[]): Map<string, number> {
  const widths = new Map<string, number>();
  for (const edge of edges) {
    widths.set(edge.from.id, Math.max(widths.get(edge.from.id) ?? 0, edge.startWidth));
    widths.set(edge.to.id, Math.max(widths.get(edge.to.id) ?? 0, edge.endWidth));
  }
  return widths;
}

function applySelectionGlow(mesh: Mesh): void {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (const material of materials) {
    if (!(material instanceof MeshStandardMaterial)) continue;
    material.emissive.set(SELECTION_GLOW_COLOR);
    material.emissiveIntensity = SELECTION_GLOW_INTENSITY;
    material.userData['editorSelection'] = true;
  }
}

function addSelectionBounds(group: Group): void {
  const helper = new Box3Helper(new Box3().setFromObject(group), new Color('#2f6251'));
  const helperMaterial = helper.material as LineBasicMaterial;
  helperMaterial.transparent = true;
  helperMaterial.opacity = 0.58;
  group.add(helper);
}

function configureFlowerMeshes(group: Group, overlapping: boolean): void {
  group.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    object.castShadow = true;
    object.receiveShadow = true;
    if (!overlapping) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (!(material instanceof MeshStandardMaterial) || material.userData['editorSelection']) continue;
      material.emissive.set('#d97706');
      material.emissiveIntensity = 0.18;
    }
  });
}
