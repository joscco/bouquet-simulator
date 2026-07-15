import {Matrix4, Quaternion, Vector3} from 'three';
import {FlowerNodeGraphic} from '../models/flower.models';
import {FlowerTreeNode} from './flower-tree';

const UP = new Vector3(0, 1, 0);
const FORWARD = new Vector3(0, 0, 1);

/**
 * Richtet die lokale Y-Achse einer Grafik an ihrer Verbindung aus.
 * Bei "toward-parent" liegt die lokale Blattebene zusätzlich in der Ebene
 * aus Eltern-Wachstumsachse und aktueller Verbindung.
 */
export function graphicOrientationQuaternion(
  node: FlowerTreeNode,
  parent: FlowerTreeNode | undefined,
  graphic: FlowerNodeGraphic,
  seed: number,
): Quaternion {
  const direction = directionVector(node);
  const parentDirection = parent ? directionVector(parent) : null;
  const collinearWithParent = parentDirection
    ? Math.abs(Math.abs(parentDirection.dot(direction)) - 1) < 1e-6
    : false;
  let alignment: Quaternion;

  if (graphic.orientation === 'toward-parent' && parent) {
    let normal = new Vector3().crossVectors(parentDirection!, direction);
    if (normal.lengthSq() < 1e-8) {
      const reference = Math.abs(direction.dot(UP)) > 0.98 ? FORWARD : UP;
      normal = new Vector3().crossVectors(reference, direction);
    }
    normal.normalize();
    const across = new Vector3().crossVectors(direction, normal).normalize();
    alignment = new Quaternion().setFromRotationMatrix(
      new Matrix4().makeBasis(across, direction, normal),
    );
  } else {
    alignment = new Quaternion().setFromUnitVectors(UP, direction);
  }

  const {base, spread} = graphicRotationSettings(graphic);
  const hash = [...node.id].reduce(
    (value, character) => ((value * 31) + character.charCodeAt(0)) | 0,
    17,
  );
  const unit = Math.abs(Math.sin(hash + seed * 9973) * 43758.5453) % 1;
  const polarAttachmentTwist = collinearWithParent ? node.attachmentAzimuth ?? 0 : 0;
  const twist = (base - spread + unit * spread * 2) * Math.PI / 180
    + polarAttachmentTwist
    + (node.roll ?? 0);
  return alignment.multiply(new Quaternion().setFromAxisAngle(UP, twist));
}

export function graphicRotationSettings(
  graphic: Pick<FlowerNodeGraphic, 'rotation' | 'rotationBase' | 'rotationSpread'>,
): {base: number; spread: number} {
  const legacyMinimum = Math.min(graphic.rotation.min, graphic.rotation.max);
  const legacyMaximum = Math.max(graphic.rotation.min, graphic.rotation.max);
  return {
    base: graphic.rotationBase ?? (legacyMinimum + legacyMaximum) / 2,
    spread: Math.max(0, graphic.rotationSpread ?? (legacyMaximum - legacyMinimum) / 2),
  };
}

function directionVector(node: FlowerTreeNode): Vector3 {
  return new Vector3(
    Math.sin(node.angle) * Math.cos(node.azimuth),
    Math.cos(node.angle),
    Math.sin(node.angle) * Math.sin(node.azimuth),
  ).normalize();
}
