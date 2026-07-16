import {CanvasTexture, SRGBColorSpace} from 'three';
import {FlowerNodeGraphic, GraphicPatternLayer} from '../models/flower.models';
import {clamp} from '../utils/numbers';
import {mulberry32} from '../utils/random';

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
  for (const pattern of graphic.patterns ?? []) {
    drawGraphicPattern(context, pattern, width, height);
  }
  context.globalAlpha = 1;
  for (const stroke of graphic.paint ?? []) {
    context.fillStyle = stroke.color;
    context.beginPath();
    context.arc(stroke.x * width, (1 - stroke.y) * height, stroke.size * width / 2, 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;
}

function drawGraphicPattern(
  context: CanvasRenderingContext2D,
  pattern: GraphicPatternLayer,
  width: number,
  height: number,
): void {
  context.globalAlpha = clamp(pattern.opacity, 0, 1);

  if (pattern.type === 'gradient') {
    const gradient = context.createLinearGradient(0, 0, 0, height);
    const fromBase = pattern.direction !== 'tip-to-base';
    gradient.addColorStop(0, fromBase ? 'transparent' : pattern.color);
    gradient.addColorStop(1, fromBase ? pattern.color : 'transparent');
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
    return;
  }

  if (pattern.type === 'veins') {
    const density = Math.round(clamp(pattern.density ?? 7, 1, 24));
    const angle = clamp(pattern.angle ?? 22, -75, 75) * Math.PI / 180;
    context.strokeStyle = pattern.color;
    context.lineWidth = clamp(pattern.size ?? 0.012, 0.002, 0.12) * width;
    context.beginPath();
    context.moveTo(width / 2, height);
    context.lineTo(width / 2, 0);
    for (let index = 1; index <= density; index++) {
      const progress = index / (density + 1);
      const centerY = height * (1 - progress);
      const reach = width * (0.34 + Math.sin(progress * Math.PI) * 0.12);
      const edgeY = clamp(centerY - Math.tan(angle) * reach, 0, height);
      context.moveTo(width / 2, centerY);
      context.lineTo(width / 2 - reach, edgeY);
      context.moveTo(width / 2, centerY);
      context.lineTo(width / 2 + reach, edgeY);
    }
    context.stroke();
    return;
  }

  if (pattern.type === 'spots') {
    const density = Math.round(clamp(pattern.density ?? 18, 1, 160));
    const size = clamp(pattern.size ?? 0.035, 0.003, 0.3) * width;
    const random = mulberry32(Math.floor((pattern.seed ?? 0.42) * 0xffffffff) || 1);
    context.fillStyle = pattern.color;
    for (let index = 0; index < density; index++) {
      const x = random() * width;
      const y = random() * height;
      const radius = size * (0.55 + random() * 0.7) / 2;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    }
    return;
  }

  const edgeWidth = clamp(pattern.width ?? 0.055, 0.003, 0.4);
  context.fillStyle = pattern.color;
  context.fillRect(0, 0, width * edgeWidth, height);
  context.fillRect(width * (1 - edgeWidth), 0, width * edgeWidth, height);
  context.fillRect(0, 0, width, height * edgeWidth);
  context.fillRect(0, height * (1 - edgeWidth), width, height * edgeWidth);
}
