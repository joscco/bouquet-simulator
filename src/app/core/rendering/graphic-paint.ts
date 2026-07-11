import {CanvasTexture, SRGBColorSpace} from 'three';
import {FlowerNodeGraphic} from '../models/flower.models';

export const PAINT_TEXTURE_SIZE = 512;

export function createGraphicPaintTexture(graphic: FlowerNodeGraphic): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = PAINT_TEXTURE_SIZE;
  canvas.height = PAINT_TEXTURE_SIZE;
  const context = canvas.getContext('2d')!;
  drawGraphicPaint(context, graphic, PAINT_TEXTURE_SIZE, PAINT_TEXTURE_SIZE);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.flipY = false;
  return texture;
}

export function drawGraphicPaint(
  context: CanvasRenderingContext2D,
  graphic: FlowerNodeGraphic,
  width: number,
  height: number,
): void {
  context.clearRect(0, 0, width, height);
  context.fillStyle = graphic.color ?? '#5b8d53';
  context.fillRect(0, 0, width, height);
  context.lineCap = 'round';
  context.lineJoin = 'round';
  for (const stroke of graphic.paint ?? []) {
    context.fillStyle = stroke.color;
    context.beginPath();
    context.arc(stroke.x * width, (1 - stroke.y) * height, stroke.size * width / 2, 0, Math.PI * 2);
    context.fill();
  }
}
