import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnDestroy,
  input,
  output,
  signal,
} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';

@Component({
  selector: 'app-settings-drawer',
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings-drawer.component.html',
  host: {'class': 'contents'},
})
export class SettingsDrawerComponent implements AfterViewInit, OnDestroy {
  readonly open = input.required<boolean>();
  readonly panelId = input('settings-drawer-panel');
  readonly toggleLabel = input.required<string>();
  readonly busy = input(false);
  readonly disabled = input(false);
  readonly glass = input(false);
  readonly extentRatio = input(0.5);
  readonly resizeLabel = input('Resize settings');
  readonly resizeHint = input('Drag to resize · Double-click to reset');
  readonly toggle = output<void>();
  readonly extentRatioChange = output<number>();
  readonly transitionsReady = signal(false);
  readonly resizeHovered = signal(false);
  readonly resizing = signal(false);
  private transitionFrame: number | null = null;
  private resizePointerId: number | null = null;

  ngAfterViewInit(): void {
    this.transitionFrame = requestAnimationFrame(() => {
      this.transitionFrame = null;
      this.transitionsReady.set(true);
    });
  }

  ngOnDestroy(): void {
    if (this.transitionFrame !== null) cancelAnimationFrame(this.transitionFrame);
  }

  startResize(event: PointerEvent): void {
    if (!this.open() || (event.button !== 0 && event.pointerType !== 'touch')) return;
    event.preventDefault();
    event.stopPropagation();
    this.resizePointerId = event.pointerId;
    this.resizing.set(true);
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  @HostListener('document:pointermove', ['$event'])
  resize(event: PointerEvent): void {
    if (event.pointerId !== this.resizePointerId) return;
    event.preventDefault();
    const portrait = this.isPortrait();
    const ratio = portrait
      ? (window.innerHeight - event.clientY) / window.innerHeight
      : event.clientX / window.innerWidth;
    this.emitExtentRatio(ratio);
  }

  @HostListener('document:pointerup', ['$event'])
  @HostListener('document:pointercancel', ['$event'])
  finishResize(event: PointerEvent): void {
    if (event.pointerId !== this.resizePointerId) return;
    this.resizePointerId = null;
    this.resizing.set(false);
  }

  resizeWithKeyboard(event: KeyboardEvent): void {
    const portrait = this.isPortrait();
    const direction = portrait
      ? event.key === 'ArrowUp' ? 1 : event.key === 'ArrowDown' ? -1 : 0
      : event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!direction && event.key !== 'Home') return;
    event.preventDefault();
    this.emitExtentRatio(event.key === 'Home' ? 0.5 : this.extentRatio() + direction * 0.03);
  }

  resetExtent(): void {
    this.emitExtentRatio(0.5);
  }

  resizeAriaOrientation(): 'horizontal' | 'vertical' {
    return this.isPortrait() ? 'horizontal' : 'vertical';
  }

  private emitExtentRatio(ratio: number): void {
    this.extentRatioChange.emit(Math.min(0.82, Math.max(0.28, ratio)));
  }

  private isPortrait(): boolean {
    return typeof window !== 'undefined' && window.innerHeight >= window.innerWidth;
  }
}
