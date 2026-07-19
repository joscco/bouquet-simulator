import {Directive, ElementRef, HostListener, inject, input, output} from '@angular/core';
import {clamp, roundToStep} from '../../core/utils/numbers';

/** Lets a numeric input keep its normal typing behaviour while also supporting horizontal scrubbing. */
@Directive({
  selector: 'input[appDragNumberInput]',
  host: {
    '[style.cursor]': '"ew-resize"',
    '[style.touch-action]': '"pan-y"',
    '[style.user-select]': '"none"',
    '[style.-webkit-user-select]': '"none"',
  },
})
export class DragNumberInputDirective {
  private readonly element = inject<ElementRef<HTMLInputElement>>(ElementRef);

  readonly dragValue = input.required<number>();
  readonly dragMinimum = input<number | undefined>(undefined);
  readonly dragMaximum = input<number | undefined>(undefined);
  readonly dragStep = input(1);
  readonly dragValueChange = output<number>();

  private pointerId: number | null = null;
  private startX = 0;
  private startValue = 0;
  private dragging = false;
  private suppressClick = false;

  @HostListener('pointerdown', ['$event'])
  start(event: PointerEvent): void {
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    this.pointerId = event.pointerId;
    this.startX = event.clientX;
    this.startValue = this.dragValue();
    this.dragging = false;
    this.element.nativeElement.setPointerCapture(event.pointerId);
  }

  @HostListener('pointermove', ['$event'])
  move(event: PointerEvent): void {
    if (event.pointerId !== this.pointerId) return;
    const distance = event.clientX - this.startX;
    if (!this.dragging && Math.abs(distance) < 3) return;
    this.dragging = true;
    event.preventDefault();

    const modifier = event.shiftKey ? 0.1 : event.altKey ? 10 : 1;
    const step = Math.max(Number.EPSILON, this.dragStep() * modifier);
    const steps = Math.round(distance / 2);
    const minimum = this.dragMinimum() ?? Number.NEGATIVE_INFINITY;
    const maximum = this.dragMaximum() ?? Number.POSITIVE_INFINITY;
    const next = clamp(roundToStep(this.startValue + steps * step, step), minimum, maximum);
    this.dragValueChange.emit(next);
  }

  @HostListener('pointerup', ['$event'])
  @HostListener('pointercancel', ['$event'])
  stop(event: PointerEvent): void {
    if (event.pointerId !== this.pointerId) return;
    this.suppressClick = this.dragging;
    if (this.element.nativeElement.hasPointerCapture(event.pointerId)) {
      this.element.nativeElement.releasePointerCapture(event.pointerId);
    }
    this.pointerId = null;
    this.dragging = false;
  }

  @HostListener('click', ['$event'])
  keepDragFromPlacingCaret(event: MouseEvent): void {
    if (!this.suppressClick) return;
    event.preventDefault();
    this.suppressClick = false;
  }
}
