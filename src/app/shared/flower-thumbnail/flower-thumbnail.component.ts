import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import {BouquetState, FlowerDefinition} from '../../core/models/flower.models';
import {MatIconModule} from '@angular/material/icon';
import {BouquetCanvasComponent} from '../bouquet-canvas/bouquet-canvas.component';
import {FlowerThumbnailCache} from './flower-thumbnail-cache.service';
import {FlowerThumbnailRenderQueue} from './flower-thumbnail-render-queue.service';
import {flowerDefinitionWithPreviewAnchor} from './flower-thumbnail-definition';

let nextThumbnailRequestId = 0;

@Component({
  selector: 'app-flower-thumbnail',
  imports: [BouquetCanvasComponent, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {'class': 'block h-full w-full'},
  templateUrl: './flower-thumbnail.component.html',
})
export class FlowerThumbnailComponent implements AfterViewInit, OnDestroy {
  readonly definition = input.required<FlowerDefinition>();
  readonly cache = inject(FlowerThumbnailCache);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderQueue = inject(FlowerThumbnailRenderQueue);
  private readonly renderRequestId = `flower-thumbnail-${nextThumbnailRequestId++}`;
  private requestedSnapshotKey: string | null = null;
  private visibilityObserver: IntersectionObserver | null = null;
  readonly renderVisible = signal(false);
  readonly snapshotKey = computed(() => this.cache.keyFor(this.definition()));
  readonly snapshot = computed(() => this.cache.snapshot(this.snapshotKey()));
  readonly renderActive = computed(() =>
    this.renderQueue.activeRequests().has(this.renderRequestId));
  readonly previewDefinitions = computed(() => [flowerDefinitionWithPreviewAnchor(this.definition())]);
  readonly previewState = computed<BouquetState>(() => ({
    schemaVersion: 2,
    rotation: -0.38,
    flowers: [{
      instanceId: `thumbnail-${this.definition().id}`,
      definitionId: this.definition().id,
      x: 0,
      y: 0,
      z: 0,
      scale: 1,
      leanX: 0.08,
      leanZ: -0.06,
      seed: 0.417,
      nodeOffsets: {},
    }],
  }));

  constructor() {
    effect(() => {
      const renderVisible = this.renderVisible();
      if (!renderVisible) {
        this.renderQueue.cancel(this.renderRequestId);
        return;
      }
      const snapshotKey = this.snapshotKey();
      const snapshot = this.snapshot();
      const status = this.cache.status(snapshotKey);
      if (this.requestedSnapshotKey !== snapshotKey) {
        this.renderQueue.cancel(this.renderRequestId);
        this.requestedSnapshotKey = snapshotKey;
      }
      if (snapshot) {
        this.renderQueue.cancel(this.renderRequestId);
      } else if (status === 'missing') {
        this.renderQueue.enqueue(this.renderRequestId);
      } else {
        this.renderQueue.cancel(this.renderRequestId);
        if (status === 'idle') this.cache.load(this.definition());
      }
    });
  }

  ngAfterViewInit(): void {
    if (typeof IntersectionObserver === 'undefined') {
      this.renderVisible.set(true);
      return;
    }
    this.visibilityObserver = new IntersectionObserver(([entry]) => {
      this.renderVisible.set(entry?.isIntersecting ?? false);
    }, {rootMargin: '80px 0px'});
    this.visibilityObserver.observe(this.elementRef.nativeElement);
  }

  storeSnapshot(event: {key: string; dataUrl: string}): void {
    this.cache.store(event.key, event.dataUrl);
    this.renderQueue.cancel(this.renderRequestId);
  }

  handleSnapshotError(): void {
    this.cache.markMissing(this.snapshotKey());
  }

  ngOnDestroy(): void {
    this.visibilityObserver?.disconnect();
    this.renderQueue.cancel(this.renderRequestId);
  }
}
