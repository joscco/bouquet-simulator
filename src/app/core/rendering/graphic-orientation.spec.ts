import {Vector3} from 'three';
import {describe, expect, it} from 'vitest';
import {FlowerNodeGraphic} from '../models/flower.models';
import {FlowerTreeNode} from './flower-tree';
import {graphicOrientationQuaternion, graphicRotationSettings} from './graphic-orientation';

const graphic: FlowerNodeGraphic = {
  primitive: 'leaf-pointed',
  color: '#ffffff',
  width: 10,
  height: 20,
  depth: 1,
  rotation: {min: 0, max: 0},
  orientation: 'toward-parent',
  start: {x: 0.5, y: 1},
  end: {x: 0.5, y: 0},
};

describe('graphic orientation', () => {
  it('aligns the leaf length with its connection', () => {
    const parent = treeNode('parent', 0, 0);
    const node = treeNode('petal', Math.PI / 2, Math.PI / 3);
    const quaternion = graphicOrientationQuaternion(node, parent, graphic, 0.5);
    const transformedUp = new Vector3(0, 1, 0).applyQuaternion(quaternion);
    const expected = new Vector3(0.5, 0, Math.sqrt(3) / 2);

    expect(transformedUp.distanceTo(expected)).toBeLessThan(1e-6);
  });

  it('keeps the leaf plane in the parent/connection plane', () => {
    const parent = treeNode('parent', 0, 0);
    const node = treeNode('petal', Math.PI / 2, Math.PI / 4);
    const quaternion = graphicOrientationQuaternion(node, parent, graphic, 0.2);
    const normal = new Vector3(0, 0, 1).applyQuaternion(quaternion);
    const parentDirection = new Vector3(0, 1, 0);
    const connectionDirection = new Vector3(Math.SQRT1_2, 0, Math.SQRT1_2);

    expect(Math.abs(normal.dot(parentDirection))).toBeLessThan(1e-6);
    expect(Math.abs(normal.dot(connectionDirection))).toBeLessThan(1e-6);
  });

  it('derives constant rotation plus symmetric scatter from legacy ranges', () => {
    expect(graphicRotationSettings({
      rotation: {min: 30, max: 50},
    })).toEqual({base: 40, spread: 10});
  });

  it('prefers explicit rotation settings over the legacy range', () => {
    expect(graphicRotationSettings({
      rotation: {min: -180, max: 180},
      rotationBase: 35,
      rotationSpread: 5,
    })).toEqual({base: 35, spread: 5});
  });

  it.each([0, Math.PI])('keeps repeated leaves radially distinct at the polar angle %s', (angle) => {
    const parent = treeNode('parent', 0, 0);
    const first = {...treeNode('first', angle, 0), parentId: parent.id, attachmentAzimuth: 0};
    const second = {...treeNode('second', angle, 0), parentId: parent.id, attachmentAzimuth: Math.PI / 2};
    const firstNormal = new Vector3(0, 0, 1)
      .applyQuaternion(graphicOrientationQuaternion(first, parent, graphic, 0.5));
    const secondNormal = new Vector3(0, 0, 1)
      .applyQuaternion(graphicOrientationQuaternion(second, parent, graphic, 0.5));

    expect(Math.abs(firstNormal.dot(secondNormal))).toBeLessThan(1e-6);
  });

  it('applies an individual node roll independently of its growth direction', () => {
    const parent = treeNode('parent', 0, 0);
    const first = {...treeNode('first', Math.PI / 3, Math.PI / 4), parentId: parent.id, roll: 0};
    const second = {...first, id: 'second', roll: Math.PI / 2};
    const firstNormal = new Vector3(0, 0, 1)
      .applyQuaternion(graphicOrientationQuaternion(first, parent, graphic, 0.5));
    const secondNormal = new Vector3(0, 0, 1)
      .applyQuaternion(graphicOrientationQuaternion(second, parent, graphic, 0.5));

    expect(Math.abs(firstNormal.dot(secondNormal))).toBeLessThan(1e-6);
  });
});

function treeNode(id: string, angle: number, azimuth: number): FlowerTreeNode {
  return {
    id,
    templateId: id,
    parentId: null,
    x: 0,
    y: 0,
    z: 0,
    angle,
    azimuth,
    depth: 0,
    draggable: false,
  };
}
