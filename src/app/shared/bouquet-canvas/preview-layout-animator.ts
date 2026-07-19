import {gsap} from 'gsap';

export interface PreviewLayoutFrame {
  left: number;
  right: number;
  top: number;
  bottom: number;
  x: number;
  y: number;
}

export class PreviewLayoutAnimator {
  private tween: {kill: () => void} | null = null;

  animate(
    current: PreviewLayoutFrame,
    target: PreviewLayoutFrame,
    update: (frame: PreviewLayoutFrame) => void,
    durationSeconds = 0.42,
  ): void {
    this.cancel();
    const frame = {...current};
    const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (reducedMotion) {
      update({...target});
      return;
    }
    this.tween = gsap.to(frame, {
      ...target,
      duration: durationSeconds,
      ease: 'power3.out',
      onUpdate: () => update({...frame}),
      onComplete: () => {
        this.tween = null;
        update({...target});
      },
    });
  }

  cancel(): void {
    this.tween?.kill();
    this.tween = null;
  }
}
