import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  OnDestroy,
  Output,
  ViewChild,
  computed,
  effect,
  input,
  signal,
} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {GraphicPoint} from '../../core/models/flower.models';

type DrawingTool = 'brush' | 'eraser' | 'alignment';
type AlignmentPoint = 'start' | 'end';

@Component({
  selector: 'app-drawing-canvas',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overflow-hidden rounded-2xl border border-stone-200 bg-white">
      <div class="grid grid-cols-3 gap-1 border-b border-stone-200 bg-stone-50 p-1.5">
        <button
          class="rounded-lg px-2 py-2 text-[9px] font-semibold transition"
          [class.bg-white]="tool() === 'brush'"
          [class.text-stone-900]="tool() === 'brush'"
          [class.shadow-sm]="tool() === 'brush'"
          type="button"
          (click)="tool.set('brush')"
        >✎ Zeichnen</button>
        <button
          class="rounded-lg px-2 py-2 text-[9px] font-semibold transition"
          [class.bg-white]="tool() === 'eraser'"
          [class.text-stone-900]="tool() === 'eraser'"
          [class.shadow-sm]="tool() === 'eraser'"
          type="button"
          (click)="tool.set('eraser')"
        >⌫ Radieren</button>
        <button
          class="rounded-lg px-2 py-2 text-[9px] font-semibold transition"
          [class.bg-amber-100]="tool() === 'alignment'"
          [class.text-amber-900]="tool() === 'alignment'"
          [class.shadow-sm]="tool() === 'alignment'"
          type="button"
          (click)="tool.set('alignment')"
        >↗ Ausrichten</button>
      </div>

      @if (tool() === 'alignment') {
        <div class="border-b border-stone-200 p-2.5">
          <div class="mb-2 grid grid-cols-2 gap-2">
            <button
              class="rounded-lg border px-2 py-2 text-[9px] font-bold"
              [class.border-emerald-500]="activePoint() === 'start'"
              [class.bg-emerald-50]="activePoint() === 'start'"
              type="button"
              (click)="activePoint.set('start')"
            >S · Startpunkt</button>
            <button
              class="rounded-lg border px-2 py-2 text-[9px] font-bold"
              [class.border-amber-500]="activePoint() === 'end'"
              [class.bg-amber-50]="activePoint() === 'end'"
              type="button"
              (click)="activePoint.set('end')"
            >E · Endpunkt</button>
          </div>
          <p class="m-0 text-[9px] leading-relaxed text-stone-400">
            Punkte anklicken oder ziehen. Die Achse S → E folgt der Verbindung.
          </p>
        </div>
      } @else {
        <div class="flex items-center gap-2 border-b border-stone-200 p-2">
          @if (tool() === 'brush') {
            <label class="grid h-9 w-9 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-lg border border-stone-200" title="Farbe">
              <input class="h-12 w-12 cursor-pointer border-0 p-0" type="color" [(ngModel)]="color" aria-label="Pinselfarbe">
            </label>
          }
          <label class="flex min-w-0 flex-1 items-center gap-2" title="Werkzeugstärke">
            <input class="min-w-0 flex-1 accent-emerald-800" type="range" min="1" max="64" [(ngModel)]="brushSize" aria-label="Werkzeugstärke">
            <span class="w-7 text-right text-[9px] tabular-nums text-stone-400">{{ brushSize }}</span>
          </label>
          <button class="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-base hover:bg-stone-100 disabled:opacity-25" type="button" title="Rückgängig" [disabled]="!canUndo()" (click)="undo()">↶</button>
          <button class="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-base hover:bg-stone-100 disabled:opacity-25" type="button" title="Wiederholen" [disabled]="!canRedo()" (click)="redo()">↷</button>
        </div>
      }

      <div
        class="relative aspect-square w-full touch-none overflow-hidden bg-[linear-gradient(45deg,#f5f5f4_25%,transparent_25%),linear-gradient(-45deg,#f5f5f4_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f5f5f4_75%),linear-gradient(-45deg,transparent_75%,#f5f5f4_75%)] bg-[length:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0px]"
        (pointermove)="moveAlignmentPoint($event)"
        (pointerup)="finishAlignmentPoint($event)"
        (pointercancel)="finishAlignmentPoint($event)"
      >
        <canvas
          #canvas
          class="block h-full w-full"
          [class.cursor-crosshair]="tool() !== 'alignment'"
          [class.cursor-cell]="tool() === 'alignment'"
          width="512"
          height="512"
          aria-label="Grafik zeichnen und ausrichten"
          (pointerdown)="startDrawing($event)"
          (pointermove)="draw($event)"
          (pointerup)="stopDrawing($event)"
          (pointercancel)="stopDrawing($event)"
        ></canvas>

        @if (tool() === 'alignment') {
          <div
            class="pointer-events-none absolute h-0.5 origin-left bg-amber-500/70"
            [style.left.%]="localStart().x * 100"
            [style.top.%]="localStart().y * 100"
            [style.width.%]="alignmentLength()"
            [style.transform]="'rotate(' + alignmentAngle() + 'deg)'"
          ></div>
          <button
            class="absolute grid h-6 w-6 -translate-x-1/2 -translate-y-1/2 cursor-move place-items-center rounded-full border-2 border-white bg-emerald-600 text-[9px] font-black text-white shadow-md"
            [style.left.%]="localStart().x * 100"
            [style.top.%]="localStart().y * 100"
            type="button"
            aria-label="Startpunkt verschieben"
            (pointerdown)="beginAlignmentPoint($event, 'start')"
          >S</button>
          <button
            class="absolute grid h-6 w-6 -translate-x-1/2 -translate-y-1/2 cursor-move place-items-center rounded-full border-2 border-white bg-amber-500 text-[9px] font-black text-white shadow-md"
            [style.left.%]="localEnd().x * 100"
            [style.top.%]="localEnd().y * 100"
            type="button"
            aria-label="Endpunkt verschieben"
            (pointerdown)="beginAlignmentPoint($event, 'end')"
          >E</button>
        }
      </div>

      <div class="flex items-center justify-between border-t border-stone-200 p-2">
        <label class="cursor-pointer rounded-lg px-2 py-1.5 text-[9px] font-semibold text-stone-500 hover:bg-stone-100">
          PNG laden
          <input class="sr-only" type="file" accept="image/png,.png" (change)="importPng($event)">
        </label>
        <button class="rounded-lg px-2 py-1.5 text-[9px] font-semibold text-rose-600 hover:bg-rose-50" type="button" (click)="clear()">Bild leeren</button>
      </div>
    </div>
  `,
})
export class DrawingCanvasComponent implements AfterViewInit, OnDestroy {
  readonly image = input('');
  readonly startPoint = input<GraphicPoint>({x: 0.5, y: 0.9});
  readonly endPoint = input<GraphicPoint>({x: 0.5, y: 0.1});
  readonly tool = signal<DrawingTool>('brush');
  readonly activePoint = signal<AlignmentPoint>('start');
  readonly canUndo = signal(false);
  readonly canRedo = signal(false);
  readonly localStart = signal<GraphicPoint>({x: 0.5, y: 0.9});
  readonly localEnd = signal<GraphicPoint>({x: 0.5, y: 0.1});
  readonly alignmentLength = computed(() => {
    const dx = this.localEnd().x - this.localStart().x;
    const dy = this.localEnd().y - this.localStart().y;
    return Math.hypot(dx, dy) * 100;
  });
  readonly alignmentAngle = computed(() => {
    const dx = this.localEnd().x - this.localStart().x;
    const dy = this.localEnd().y - this.localStart().y;
    return Math.atan2(dy, dx) * 180 / Math.PI;
  });

  @Output() readonly imageChange = new EventEmitter<string>();
  @Output() readonly startPointChange = new EventEmitter<GraphicPoint>();
  @Output() readonly endPointChange = new EventEmitter<GraphicPoint>();
  @ViewChild('canvas', {static: true}) private readonly canvasRef!: ElementRef<HTMLCanvasElement>;

  color = '#db816e';
  brushSize = 24;
  private context: CanvasRenderingContext2D | null = null;
  private drawing = false;
  private lastPoint: GraphicPoint | null = null;
  private undoStack: ImageData[] = [];
  private redoStack: ImageData[] = [];
  private draggingPoint: {kind: AlignmentPoint; pointerId: number} | null = null;
  private ready = false;
  private loadVersion = 0;
  private currentSource = '';

  constructor() {
    effect(() => {
      const image = this.image();
      if (this.ready && image !== this.currentSource) void this.loadImage(image);
    });
    effect(() => {
      const point = this.startPoint();
      if (this.draggingPoint?.kind !== 'start') this.localStart.set(point);
    });
    effect(() => {
      const point = this.endPoint();
      if (this.draggingPoint?.kind !== 'end') this.localEnd.set(point);
    });
  }

  ngAfterViewInit(): void {
    this.context = this.canvasRef.nativeElement.getContext('2d');
    this.ready = true;
    void this.loadImage(this.image());
  }

  ngOnDestroy(): void {
    this.loadVersion++;
  }

  startDrawing(event: PointerEvent): void {
    if (!this.context) return;
    if (this.tool() === 'alignment') {
      const point = this.normalizedPointFromEvent(event);
      this.setLocalAlignmentPoint(this.activePoint(), point);
      this.emitAlignmentPoint(this.activePoint(), point);
      this.activePoint.update((active) => active === 'start' ? 'end' : 'start');
      return;
    }
    this.pushUndo();
    this.redoStack = [];
    this.syncHistoryState();
    this.drawing = true;
    this.lastPoint = this.canvasPointFromEvent(event);
    this.canvasRef.nativeElement.setPointerCapture(event.pointerId);
    this.drawLine(this.lastPoint, this.lastPoint);
  }

  draw(event: PointerEvent): void {
    if (!this.drawing || !this.lastPoint) return;
    const point = this.canvasPointFromEvent(event);
    this.drawLine(this.lastPoint, point);
    this.lastPoint = point;
  }

  stopDrawing(event: PointerEvent): void {
    if (!this.drawing) return;
    this.drawing = false;
    this.lastPoint = null;
    if (this.canvasRef.nativeElement.hasPointerCapture(event.pointerId)) {
      this.canvasRef.nativeElement.releasePointerCapture(event.pointerId);
    }
    this.emitImage();
  }

  beginAlignmentPoint(event: PointerEvent, kind: AlignmentPoint): void {
    event.stopPropagation();
    this.activePoint.set(kind);
    this.draggingPoint = {kind, pointerId: event.pointerId};
    (event.currentTarget as HTMLButtonElement).setPointerCapture(event.pointerId);
  }

  moveAlignmentPoint(event: PointerEvent): void {
    if (this.draggingPoint?.pointerId !== event.pointerId) return;
    this.setLocalAlignmentPoint(this.draggingPoint.kind, this.normalizedPointFromEvent(event));
  }

  finishAlignmentPoint(event: PointerEvent): void {
    if (this.draggingPoint?.pointerId !== event.pointerId) return;
    const {kind} = this.draggingPoint;
    const point = kind === 'start' ? this.localStart() : this.localEnd();
    this.draggingPoint = null;
    this.emitAlignmentPoint(kind, point);
  }

  undo(): void {
    const snapshot = this.undoStack.pop();
    if (!snapshot || !this.context) return;
    this.redoStack.push(this.context.getImageData(0, 0, 512, 512));
    this.restore(snapshot);
    this.syncHistoryState();
    this.emitImage();
  }

  redo(): void {
    const snapshot = this.redoStack.pop();
    if (!snapshot || !this.context) return;
    this.undoStack.push(this.context.getImageData(0, 0, 512, 512));
    this.restore(snapshot);
    this.syncHistoryState();
    this.emitImage();
  }

  clear(): void {
    if (!this.context) return;
    this.pushUndo();
    this.redoStack = [];
    this.context.clearRect(0, 0, 512, 512);
    this.syncHistoryState();
    this.emitImage();
  }

  async importPng(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || file.type !== 'image/png') {
      input.value = '';
      return;
    }
    const previous = this.context?.getImageData(0, 0, 512, 512) ?? null;
    const source = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    await this.loadImage(source);
    if (previous) {
      this.undoStack = [previous];
      this.syncHistoryState();
    }
    this.emitImage();
    input.value = '';
  }

  private drawLine(from: GraphicPoint, to: GraphicPoint): void {
    const context = this.context!;
    context.save();
    context.globalCompositeOperation = this.tool() === 'eraser' ? 'destination-out' : 'source-over';
    context.strokeStyle = this.color;
    context.fillStyle = this.color;
    context.lineWidth = Number(this.brushSize);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    if (from.x === to.x && from.y === to.y) {
      context.beginPath();
      context.arc(from.x, from.y, Number(this.brushSize) / 2, 0, Math.PI * 2);
      context.fill();
    } else {
      context.beginPath();
      context.moveTo(from.x, from.y);
      context.lineTo(to.x, to.y);
      context.stroke();
    }
    context.restore();
  }

  private canvasPointFromEvent(event: PointerEvent): GraphicPoint {
    const canvas = this.canvasRef.nativeElement;
    const bounds = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - bounds.left) * canvas.width / bounds.width,
      y: (event.clientY - bounds.top) * canvas.height / bounds.height,
    };
  }

  private normalizedPointFromEvent(event: PointerEvent): GraphicPoint {
    const bounds = this.canvasRef.nativeElement.getBoundingClientRect();
    return {
      x: clamp((event.clientX - bounds.left) / bounds.width, 0, 1),
      y: clamp((event.clientY - bounds.top) / bounds.height, 0, 1),
    };
  }

  private setLocalAlignmentPoint(kind: AlignmentPoint, point: GraphicPoint): void {
    if (kind === 'start') this.localStart.set(point);
    else this.localEnd.set(point);
  }

  private emitAlignmentPoint(kind: AlignmentPoint, point: GraphicPoint): void {
    if (kind === 'start') this.startPointChange.emit(point);
    else this.endPointChange.emit(point);
  }

  private pushUndo(): void {
    if (!this.context) return;
    this.undoStack.push(this.context.getImageData(0, 0, 512, 512));
    if (this.undoStack.length > 30) this.undoStack.shift();
    this.syncHistoryState();
  }

  private restore(snapshot: ImageData): void {
    this.context!.clearRect(0, 0, 512, 512);
    this.context!.putImageData(snapshot, 0, 0);
  }

  private syncHistoryState(): void {
    this.canUndo.set(this.undoStack.length > 0);
    this.canRedo.set(this.redoStack.length > 0);
  }

  private emitImage(): void {
    this.currentSource = this.canvasRef.nativeElement.toDataURL('image/png');
    this.imageChange.emit(this.currentSource);
  }

  private async loadImage(source: string): Promise<void> {
    const context = this.context;
    if (!context) return;
    const version = ++this.loadVersion;
    this.currentSource = source;
    context.clearRect(0, 0, 512, 512);
    this.undoStack = [];
    this.redoStack = [];
    this.syncHistoryState();
    if (!source) return;
    if (!source.startsWith('data:image/png') && !source.toLowerCase().endsWith('.png')) return;
    const image = new Image();
    image.src = source;
    try {
      await image.decode();
    } catch {
      return;
    }
    if (version !== this.loadVersion) return;
    const scale = Math.min(512 / image.naturalWidth, 512 / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    context.drawImage(image, (512 - width) / 2, (512 - height) / 2, width, height);
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
