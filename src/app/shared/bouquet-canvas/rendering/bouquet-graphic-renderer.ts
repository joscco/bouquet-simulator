import {
  BufferGeometry,
  DoubleSide,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  TextureLoader,
  Vector2,
} from 'three';
import {FlowerNodeGraphic} from '../../../core/models/flower.models';
import {createBuiltInGeometry} from '../../../core/rendering/graphic-geometries';
import {createGraphicPaintTexture} from '../../../core/rendering/graphic-paint';

export function createFlowerGraphicMesh(
  graphic: FlowerNodeGraphic,
  requestRender: () => void,
): Mesh {
  const width = Math.max(1, graphic.width);
  const height = Math.max(1, graphic.height);
  const depth = Math.max(0.5, graphic.depth ?? Math.min(width, height) * 0.12);
  const primitive = graphic.primitive ?? 'png';
  let geometry: BufferGeometry;

  if (primitive === 'png' && graphic.png) {
    geometry = createPngGeometry(graphic, width, height);
    const material = new MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      alphaTest: 0.06,
      side: DoubleSide,
    });
    new TextureLoader().load(graphic.png, (texture) => {
      texture.colorSpace = SRGBColorSpace;
      material.map = texture;
      material.needsUpdate = true;
      requestRender();
    });
    return new Mesh(geometry, material);
  }

  geometry = createBuiltInGeometry(
    primitive,
    width,
    height,
    depth,
    graphic.bendMain,
    graphic.bendCross,
    graphic.bendMainProfile,
    graphic.bendCrossProfile,
  );
  const material = new MeshStandardMaterial({
    color: graphic.color ?? '#5b8d53',
    roughness: 0.72,
    side: DoubleSide,
  });
  if (graphic.patterns?.length || graphic.paint?.length) {
    material.color.set(0xffffff);
    material.map = createGraphicPaintTexture(graphic);
  }
  return new Mesh(geometry, material);
}

function createPngGeometry(graphic: FlowerNodeGraphic, width: number, height: number): PlaneGeometry {
  const geometry = new PlaneGeometry(width, height);
  geometry.translate((0.5 - graphic.start.x) * width, (graphic.start.y - 0.5) * height, 0);
  const axis = new Vector2(
    (graphic.end.x - graphic.start.x) * width,
    (graphic.start.y - graphic.end.y) * height,
  );
  geometry.rotateZ(Math.PI / 2 - Math.atan2(axis.y, axis.x));
  return geometry;
}
