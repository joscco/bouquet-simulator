import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {FlowerNodeGraphic, GraphicPaintStroke} from '../../core/models/flower.models';
import {canonicalGraphicPrimitive} from '../../core/rendering/graphic-geometries';
import {drawGraphicPaint} from '../../core/rendering/graphic-paint';

@Component({
  selector: 'app-graphic-painter',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-xl border border-stone-200 bg-white p-2">
      <div class="mb-2 flex items-center gap-2">
        <span class="text-[9px] font-bold uppercase text-stone-400">Bemalen</span>
        <input class="h-7 w-8 cursor-pointer border-0 bg-transparent p-0" type="color"
          aria-label="Pinselfarbe" [ngModel]="brushColor()" (ngModelChange)="brushColor.set($event)">
        <label class="flex flex-1 items-center gap-2 text-[9px] text-stone-500">
          Pinsel
          <input class="min-w-0 flex-1 accent-emerald-900" type="range" min="1" max="30"
            [ngModel]="brushSize()" (ngModelChange)="brushSize.set(+$event)">
        </label>
        <button class="rounded-lg px-2 py-1 text-[9px] font-semibold"
          type="button" [class.bg-stone-800]="erasing()" [class.text-white]="erasing()"
          [class.text-stone-600]="!erasing()" (click)="erasing.update(value => !value)">
          {{ erasing() ? 'Radierer an' : 'Radierer' }}
        </button>
      </div>
      <div class="mb-2 flex justify-end gap-1">
        <button class="rounded-lg px-2 py-1 text-[9px] font-semibold text-stone-600 hover:bg-stone-100"
          type="button" [disabled]="!history.length" (click)="undo()">Rückgängig</button>
        <button class="rounded-lg px-2 py-1 text-[9px] font-semibold text-rose-700 hover:bg-rose-50"
          type="button" (click)="clear()">Alles löschen</button>
      </div>
      <canvas #paintCanvas width="320" height="240"
        class="block aspect-4/3 w-full touch-none cursor-crosshair rounded-lg bg-stone-100"
        aria-label="Blatt mit dem Pinsel bemalen"
        (pointerdown)="startPaint($event)"
        (pointermove)="movePaint($event)"
        (pointerup)="stopPaint($event)"
        (pointercancel)="stopPaint($event)"></canvas>
      <p class="mb-0 mt-1 text-[8px] text-stone-400">Direkt auf das Blatt zeichnen; die Textur wird im 3D-Modell übernommen.</p>
    </div>
  `,
})
export class GraphicPainterComponent implements AfterViewInit {
  readonly graphic = input.required<FlowerNodeGraphic>();
  readonly graphicId = input.required<string>();
  readonly paintChange = output<GraphicPaintStroke[]>();
  readonly brushColor = signal('#f7c5cf');
  readonly brushSize = signal(10);
  readonly erasing = signal(false);

  @ViewChild('paintCanvas', {static: true}) private readonly canvas!: ElementRef<HTMLCanvasElement>;
  private pointerId: number | null = null;
  private lastPoint: {x: number; y: number} | null = null;
  private lastGraphicId: string | null = null;
  protected readonly history: GraphicPaintStroke[][] = [];
  private ready = false;

  constructor() {
    effect(() => {
      const graphicId = this.graphicId();
      this.graphic();
      if (graphicId !== this.lastGraphicId) {
        this.history.length = 0;
        this.lastGraphicId = graphicId;
      }
      if (this.ready) this.draw();
    });
  }

  ngAfterViewInit(): void {
    this.ready = true;
    this.draw();
  }

  startPaint(event: PointerEvent): void {
    this.rememberCurrentPaint();
    this.pointerId = event.pointerId;
    this.lastPoint = null;
    this.canvas.nativeElement.setPointerCapture(event.pointerId);
    this.addStroke(event);
  }

  movePaint(event: PointerEvent): void {
    if (this.pointerId === event.pointerId) this.addStroke(event);
  }

  stopPaint(event: PointerEvent): void {
    if (this.pointerId === event.pointerId) {
      this.pointerId = null;
      this.lastPoint = null;
    }
  }

  clear(): void {
    this.rememberCurrentPaint();
    this.paintChange.emit([]);
  }

  undo(): void {
    const previous = this.history.pop();
    if (previous) this.paintChange.emit(previous);
  }

  private rememberCurrentPaint(): void {
    this.history.push([...(this.graphic().paint ?? [])]);
    if (this.history.length > 50) this.history.shift();
  }

  private addStroke(event: PointerEvent): void {
    const bounds = this.canvas.nativeElement.getBoundingClientRect();
    const x = clamp((event.clientX - bounds.left) / bounds.width, 0, 1);
    const y = clamp(1 - (event.clientY - bounds.top) / bounds.height, 0, 1);
    if (this.erasing()) {
      const radius = this.brushSize() / 180;
      const start = this.lastPoint ?? {x, y};
      this.paintChange.emit((this.graphic().paint ?? []).filter((stroke) =>
        pointToSegmentDistance(stroke, start, {x, y}) > radius + stroke.size / 2));
      this.lastPoint = {x, y};
      return;
    }
    const nextStrokes: GraphicPaintStroke[] = [];
    const distance = this.lastPoint ? Math.hypot(x - this.lastPoint.x, y - this.lastPoint.y) : 0;
    const steps = this.lastPoint
      ? Math.max(1, Math.ceil(distance / Math.max(0.006, this.brushSize() / 400)))
      : 1;
    for (let step = 1; step <= steps; step++) {
      const progress = step / steps;
      nextStrokes.push({
        x: this.lastPoint ? this.lastPoint.x + (x - this.lastPoint.x) * progress : x,
        y: this.lastPoint ? this.lastPoint.y + (y - this.lastPoint.y) * progress : y,
        size: this.brushSize() / 100,
        color: this.brushColor(),
      });
    }
    this.lastPoint = {x, y};
    this.paintChange.emit([
      ...(this.graphic().paint ?? []),
      ...nextStrokes,
    ]);
  }

  private draw(): void {
    const canvas = this.canvas.nativeElement;
    const context = canvas.getContext('2d')!;
    context.save();
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#f5f5f4';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.translate(40, 18);
    context.scale(240, 204);
    leafPath(context, this.graphic().primitive ?? 'leaf-pointed');
    context.clip();
    context.setTransform(1, 0, 0, 1, 40, 18);
    drawGraphicPaint(context, this.graphic(), 240, 204);
    context.restore();
  }
}

function leafPath(context: CanvasRenderingContext2D, primitive: FlowerNodeGraphic['primitive']): void {
  const canonical = canonicalGraphicPrimitive(primitive ?? 'leaf-pointed');
  context.beginPath();
  context.moveTo(0.5, 1);
  if (canonical === 'leaf-serrated') {
    context.lineTo(0.23, 0.84);
    context.lineTo(0.3, 0.75);
    context.lineTo(0.14, 0.62);
    context.lineTo(0.24, 0.53);
    context.lineTo(0.1, 0.38);
    context.lineTo(0.27, 0.31);
    context.lineTo(0.5, 0);
    context.lineTo(0.73, 0.31);
    context.lineTo(0.9, 0.38);
    context.lineTo(0.76, 0.53);
    context.lineTo(0.86, 0.62);
    context.lineTo(0.7, 0.75);
    context.lineTo(0.77, 0.84);
  } else {
    const shoulder = canonical === 'leaf-round' ? 0.12 : 0.3;
    context.bezierCurveTo(0.12, 0.82, 0.08, shoulder, 0.5, 0);
    context.bezierCurveTo(0.92, shoulder, 0.88, 0.82, 0.5, 1);
  }
  context.closePath();
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function pointToSegmentDistance(
  point: {x: number; y: number},
  start: {x: number; y: number},
  end: {x: number; y: number},
): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (!lengthSquared) return Math.hypot(point.x - start.x, point.y - start.y);
  const progress = clamp(
    ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared,
    0,
    1,
  );
  return Math.hypot(point.x - (start.x + progress * dx), point.y - (start.y + progress * dy));
}
