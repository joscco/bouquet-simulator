import {Injectable, signal} from '@angular/core';

const MAX_CONCURRENT_RENDERS = 1;

@Injectable({providedIn: 'root'})
export class FlowerThumbnailRenderQueue {
  readonly activeRequests = signal<ReadonlySet<string>>(new Set<string>());
  private queuedRequests: string[] = [];

  enqueue(requestId: string): void {
    if (this.activeRequests().has(requestId) || this.queuedRequests.includes(requestId)) return;
    this.queuedRequests.push(requestId);
    this.promoteQueuedRequests();
  }

  cancel(requestId: string): void {
    this.queuedRequests = this.queuedRequests.filter((candidate) => candidate !== requestId);
    const active = new Set(this.activeRequests());
    let changed = active.delete(requestId);
    while (active.size < MAX_CONCURRENT_RENDERS && this.queuedRequests.length) {
      active.add(this.queuedRequests.shift()!);
      changed = true;
    }
    if (changed) this.activeRequests.set(active);
  }

  private promoteQueuedRequests(): void {
    const active = new Set(this.activeRequests());
    let changed = false;
    while (active.size < MAX_CONCURRENT_RENDERS && this.queuedRequests.length) {
      active.add(this.queuedRequests.shift()!);
      changed = true;
    }
    if (changed) this.activeRequests.set(active);
  }
}
