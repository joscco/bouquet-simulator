import {
  ArrowHelper,
  Box3,
  Box3Helper,
  Color,
  Euler,
  Group,
  LineBasicMaterial,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from 'three';
import {
  BouquetFlower,
  FlowerDefinition,
} from '../../../core/models/flower.models';
import {resolvedStemWidths} from '../../../core/models/flower-connections';
import {FLOWER_CREATION_DEFAULTS} from '../../../core/models/flower-creation-defaults';
import {isFlowerTemplateHighlighted} from '../../../core/rendering/flower-highlights';
import {graphicOrientationQuaternion} from '../../../core/rendering/graphic-orientation';
import {
  FlowerTreeNode,
  flattenFlowerTemplates,
  flowerConnectionMainDirection,
  flowerTreeNodeDirection,
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
import {clipVaseStemEnd} from './bouquet-vase-renderer';

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
  vaseId: string | null;
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
  const vaseStemExtended = addVaseStemExtension(
    group,
    nodes.get(tree.rootId),
    stemEdges,
    flower,
    options.vaseId,
  );

  for (const stemEdge of stemEdges) {
    if (stemEdge.startWidth === 0 && stemEdge.endWidth === 0) continue;
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
      capStart: stemEdge.capStart && !vaseStemExtended,
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
    graphic.userData['pick'] = {
      instanceId: flower.instanceId,
      scale: flower.scale,
    } satisfies BouquetPickData;
    group.add(graphic);
    if (isFlowerTemplateHighlighted(node.templateId, options.highlightedNodeIds)) {
      applySelectionGlow(graphic);
    }
  }

  addMainDirectionArrows(group, tree, nodes, options.highlightedConnection);

  if (options.selected) addSelectionBounds(group);
  configureFlowerMeshes(group, options.overlapping);
  group.rotation.set(flower.leanX ?? 0, flower.rotationY ?? 0, flower.leanZ ?? 0);
  group.position.set(flower.x, -flower.y, flower.z);
  group.scale.setScalar(flower.scale);
  return group;
}

function addMainDirectionArrows(
  group: Group,
  tree: ReturnType<typeof generateFlowerTree>,
  nodes: ReadonlyMap<string, FlowerTreeNode>,
  highlightedConnection: FlowerRenderOptions['highlightedConnection'],
): void {
  if (!highlightedConnection) return;
  const renderedParents = new Set<string>();
  for (const edge of tree.edges) {
    if (
      edge.connectionSourceId !== highlightedConnection.sourceId
      || edge.connectionIndex !== highlightedConnection.index
      || renderedParents.has(edge.from)
    ) continue;
    const parent = nodes.get(edge.from);
    if (!parent) continue;
    renderedParents.add(edge.from);
    const length = Math.max(28, Math.min(90, (edge.connection.length.min + edge.connection.length.max) / 2));
    const origin = flowerTreePosition(parent);
    const baseDirection = flowerTreeNodeDirection(parent);
    group.add(editorDirectionArrow(
      baseDirection,
      origin,
      length * 0.78,
      0xf59e0b,
      'editorBaseDirection',
      19,
      0.34,
      0.2,
    ));
    group.add(editorDirectionArrow(
      flowerConnectionMainDirection(parent, edge.connection),
      origin,
      length,
      0x10b981,
      'editorMainDirection',
      20,
      0.28,
      0.14,
    ));
  }
}

function editorDirectionArrow(
  direction: {x: number; y: number; z: number},
  origin: Vector3,
  length: number,
  color: number,
  marker: 'editorBaseDirection' | 'editorMainDirection',
  renderOrder: number,
  headLengthRatio: number,
  headWidthRatio: number,
): ArrowHelper {
  const arrow = new ArrowHelper(
    new Vector3(direction.x, direction.y, direction.z).normalize(),
    origin,
    length,
    color,
    Math.min(13, length * headLengthRatio),
    Math.min(8, length * headWidthRatio),
  );
  for (const material of [arrow.line.material, arrow.cone.material].flatMap((entry) =>
    Array.isArray(entry) ? entry : [entry])) {
    material.depthTest = false;
  }
  arrow.line.renderOrder = renderOrder;
  arrow.cone.renderOrder = renderOrder;
  arrow.userData[marker] = true;
  return arrow;
}

function addVaseStemExtension(
  group: Group,
  root: FlowerTreeNode | undefined,
  stemEdges: readonly StemRenderEdge[],
  flower: BouquetFlower,
  vaseId: string | null,
): boolean {
  if (!root || vaseId === null) return false;
  const rootEdge = stemEdges.find((edge) => edge.from.id === root.id);
  if (!rootEdge) return false;

  const flowerRotation = new Quaternion().setFromEuler(new Euler(
    flower.leanX ?? 0,
    flower.rotationY ?? 0,
    flower.leanZ ?? 0,
  ));
  const groupPosition = new Vector3(flower.x, -flower.y, flower.z);
  const rootLocal = flowerTreePosition(root);
  const rootWorld = rootLocal.clone()
    .applyQuaternion(flowerRotation)
    .multiplyScalar(flower.scale)
    .add(groupPosition);
  const rootDirection = flowerTreePosition(rootEdge.to)
    .sub(rootLocal)
    .normalize()
    .applyQuaternion(flowerRotation);
  const stemEnd = clipVaseStemEnd(
    vaseId,
    rootWorld,
    rootDirection.negate(),
    rootEdge.startWidth * flower.scale / 2,
  );
  if (stemEnd.distanceToSquared(rootWorld) < 1) return false;
  const localBottom = stemEnd
    .sub(groupPosition)
    .applyQuaternion(flowerRotation.invert())
    .divideScalar(Math.max(0.01, flower.scale));
  const bottomNode: FlowerTreeNode = {
    ...root,
    id: `${root.id}:vase-bottom`,
    parentId: null,
    x: localBottom.x,
    y: -localBottom.y,
    z: localBottom.z,
  };
  const bottomWidth = rootEdge.startWidth * 0.9;
  const stem = createStemMesh({
    from: bottomNode,
    to: root,
    startWidth: bottomWidth,
    endWidth: rootEdge.startWidth,
    startJointWidth: bottomWidth,
    endJointWidth: rootEdge.startWidth,
    color: rootEdge.color,
    opacity: 1,
    bend: 0,
    curve: 0,
    curveRotation: rootEdge.curveRotation,
    capStart: true,
    capEnd: false,
  });
  stem.userData['pick'] = {instanceId: flower.instanceId, scale: flower.scale} satisfies BouquetPickData;
  group.add(stem);
  return true;
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
      startWidth: Math.max(0, resolvedWidths.startWidth),
      endWidth: Math.max(0, resolvedWidths.endWidth),
      color: connection.stem?.color ?? definition.stem.color,
      bend: connection.stem?.bend ?? definition.stem.bend ?? 0,
      curve: connection.stem?.curve
        ?? definition.stem.curve
        ?? FLOWER_CREATION_DEFAULTS.definition.stem.curve
        ?? 0,
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
