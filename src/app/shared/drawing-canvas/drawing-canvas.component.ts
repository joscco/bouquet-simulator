import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  OnDestroy,
  Output,
  ViewChild,
  effect,
  input,
  signal,
} from '@angular/core';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-drawing-canvas',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overflow-hidden rounded-2xl border border-stone-200 bg-white">
      <div class="flex items-center gap-2 border-b border-stone-200 p-2">
        <label class="grid h-9 w-9 cursor-pointer place-items-center overflow-hidden rounded-lg border border-stone-200" title="Farbe">
          <input class="h-12 w-12 cursor-pointer border-0 p-0" type="color" [(ngModel)]="color" aria-label="Pinselfarbe">
        </label>
        <label class="flex min-w-0 flex-1 items-center gap-2 px-1" title="Pinselstärke">
          <span class="text-xs text-stone-400">●</span>
          <input class="min-w-0 flex-1 accent-emerald-800" type="range" min="2" max="70" [(ngModel)]="brushSize" aria-label="Pinselstärke">
        </label>
        <button
          class="grid h-9 w-9 place-items-center rounded-lg text-sm transition hover:bg-stone-100"
          [class.bg-stone-900]="eraser()"
          [class.text-white]="eraser()"
          type="button"
          title="Radierer"
          (click)="eraser.set(!eraser())"
        >⌫</button>
        <button class="grid h-9 w-9 place-items-center rounded-lg text-lg transition hover:bg-stone-100 disabled:opacity-25" type="button" title="Rückgängig" [disabled]="!canUndo()" (click)="undo()">↶</button>
        <button class="grid h-9 w-9 place-items-center rounded-lg text-sm text-rose-700 transition hover:bg-rose-50" type="button" title="Leeren" (click)="clear()">×</button>
      </div>
      <div
        class="aspect-square w-full touch-none bg-[linear-gradient(45deg,#f5f5f4_25%,transparent_25%),linear-gradient(-45deg,#f5f5f4_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f5f5f4_75%),linear-gradient(-45deg,transparent_75%,#f5f5f4_75%)] bg-[length:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0px]"
      >
        <canvas
          #canvas
          class="block h-full w-full cursor-crosshair"
          width="512"
          height="512"
          aria-label="Grafik zeichnen"
          (pointerdown)="startDrawing($event)"
          (pointermove)="draw($event)"
          (pointerup)="stopDrawing($event)"
          (pointercancel)="stopDrawing($event)"
        ></canvas>
      </div>
    </div>
  `,
})
export class DrawingCanvasComponent implements AfterViewInit, OnDestroy {
  readonly image = input('');
  readonly eraser = signal(false);
  readonly canUndo = signal(false);

  @Output() readonly imageChange = new EventEmitter<string>();
  @ViewChild('canvas', {static: true}) private readonly canvasRef!: ElementRef<HTMLCanvasElement>;

  color = '#db816e';
  brushSize = 24;
  private context: CanvasRenderingContext2D | null = null;
  private drawing = false;
  private lastPoint: {x: number; y: number} | null = null;
  private history: ImageData[] = [];
  private ready = false;
  private loadVersion = 0;
  private currentSource = '';

  constructor() {
    effect(() => {
      const image = this.image();
      if (this.ready && image !== this.currentSource) void this.loadImage(image);
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
    this.pushHistory();
    this.drawing = true;
    this.lastPoint = this.pointFromEvent(event);
    this.canvasRef.nativeElement.setPointerCapture(event.pointerId);
    this.drawLine(this.lastPoint, this.lastPoint);
  }

  draw(event: PointerEvent): void {
    if (!this.drawing || !this.lastPoint) return;
    const point = this.pointFromEvent(event);
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

  undo(): void {
    const snapshot = this.history.pop();
    if (!snapshot || !this.context) return;
    this.context.clearRect(0, 0, 512, 512);
    this.context.putImageData(snapshot, 0, 0);
    this.canUndo.set(this.history.length > 0);
    this.emitImage();
  }

  clear(): void {
    if (!this.context) return;
    this.pushHistory();
    this.context.clearRect(0, 0, 512, 512);
    this.emitImage();
  }

  private drawLine(from: {x: number; y: number}, to: {x: number; y: number}): void {
    const context = this.context!;
    context.save();
    context.globalCompositeOperation = this.eraser() ? 'destination-out' : 'source-over';
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

  private pointFromEvent(event: PointerEvent): {x: number; y: number} {
    const canvas = this.canvasRef.nativeElement;
    const bounds = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - bounds.left) * canvas.width / bounds.width,
      y: (event.clientY - bounds.top) * canvas.height / bounds.height,
    };
  }

  private pushHistory(): void {
    if (!this.context) return;
    this.history.push(this.context.getImageData(0, 0, 512, 512));
    if (this.history.length > 20) this.history.shift();
    this.canUndo.set(true);
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
    this.history = [];
    this.canUndo.set(false);
    if (!source) return;
    const image = new Image();
    image.src = source.startsWith('data:') ? source : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source.trim())}`;
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
