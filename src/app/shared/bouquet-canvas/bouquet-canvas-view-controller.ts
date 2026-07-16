import {
  Box3,
  Group,
  OrthographicCamera,
  Vector3,
} from 'three';
import {clamp} from '../../core/utils/numbers';
import {
  BOUQUET_FIT_MARGIN,
  BOUQUET_FIT_PADDING,
  BOUQUET_ORBIT_LIMIT,
} from './bouquet-canvas-metrics';

export interface BouquetCanvasViewConfiguration {
  host: HTMLElement;
  userZoom: number;
  fitToContent: boolean;
  viewportInsets: {left: number; right: number; top: number; bottom: number};
  orbitPitch: number;
  viewOffset: {x: number; y: number};
  vaseEnabled: boolean;
  recordingViewport: {width: number; height: number} | null;
}

export class BouquetCanvasViewController {
  private readonly sceneCenter = new Vector3();
  private readonly fitBounds = new Box3();

  constructor(
    private readonly camera: OrthographicCamera,
    private readonly bouquet: Group,
  ) {}

  setContentBounds(bounds: Box3): void {
    bounds.getCenter(this.sceneCenter);
    this.fitBounds.copy(bounds);
  }

  resizeCamera(configuration: BouquetCanvasViewConfiguration): void {
    const viewport = viewportSize(configuration);
    this.camera.near = 0.1;
    this.camera.far = 2400;
    const elevation = clamp(
      0.08 + configuration.orbitPitch,
      -BOUQUET_ORBIT_LIMIT,
      BOUQUET_ORBIT_LIMIT,
    );
    const distance = 1000;
    this.camera.position.set(0, Math.sin(elevation) * distance, Math.cos(elevation) * distance);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateMatrixWorld();

    const zoom = this.effectiveZoom(configuration);
    this.camera.left = -viewport.width / 2 / zoom;
    this.camera.right = viewport.width / 2 / zoom;
    this.camera.top = viewport.height / 2 / zoom;
    this.camera.bottom = -viewport.height / 2 / zoom;
    this.camera.updateProjectionMatrix();

    const offset = configuration.recordingViewport ? {x: 0, y: 0} : configuration.viewOffset;
    const center = configuration.vaseEnabled
      ? new Vector3(0, this.sceneCenter.y, 0)
      : this.sceneCenter.clone().applyQuaternion(this.bouquet.quaternion);
    const insets = resolvedInsets(configuration);
    const viewportCenter = this.screenOffset(
      (insets.left - insets.right) / 2 / zoom,
      (insets.bottom - insets.top) / 2 / zoom,
    );
    this.bouquet.position
      .copy(center.negate())
      .add(viewportCenter)
      .add(this.screenOffset(offset.x, offset.y));
  }

  effectiveZoom(
    configuration: BouquetCanvasViewConfiguration,
    userZoom = configuration.userZoom,
  ): number {
    return Math.max(0.01, this.fitZoom(configuration) * userZoom);
  }

  zoomPanDelta(
    clientX: number,
    clientY: number,
    nextUserZoom: number,
    configuration: BouquetCanvasViewConfiguration,
  ): {dx: number; dy: number} | null {
    if (Math.abs(nextUserZoom - configuration.userZoom) < 0.0001) return null;
    const previousEffectiveZoom = this.effectiveZoom(configuration);
    const nextEffectiveZoom = this.effectiveZoom(configuration, nextUserZoom);
    const bounds = configuration.host.getBoundingClientRect();
    const insets = resolvedInsets(configuration);
    const visibleCenterX = bounds.left + (insets.left + bounds.width - insets.right) / 2;
    const visibleCenterY = bounds.top + (insets.top + bounds.height - insets.bottom) / 2;
    const anchorX = clientX - visibleCenterX;
    const anchorY = visibleCenterY - clientY;
    return {
      dx: anchorX * (1 / nextEffectiveZoom - 1 / previousEffectiveZoom),
      dy: anchorY * (1 / nextEffectiveZoom - 1 / previousEffectiveZoom),
    };
  }

  private fitZoom(configuration: BouquetCanvasViewConfiguration): number {
    const viewport = viewportSize(configuration);
    if (!configuration.fitToContent || this.fitBounds.isEmpty()
      || !viewport.width || !viewport.height) return 1;

    const projectedSize = this.projectedFitSize(configuration.vaseEnabled);
    const insets = resolvedInsets(configuration);
    const visibleWidth = Math.max(1, viewport.width - insets.left - insets.right);
    const visibleHeight = Math.max(1, viewport.height - insets.top - insets.bottom);
    const horizontalPadding = Math.min(BOUQUET_FIT_PADDING, visibleWidth * 0.08);
    const verticalPadding = Math.min(BOUQUET_FIT_PADDING, visibleHeight * 0.08);
    const availableWidth = Math.max(120, visibleWidth - horizontalPadding * 2);
    const availableHeight = Math.max(120, visibleHeight - verticalPadding * 2);
    return clamp(Math.min(
      availableWidth / Math.max(1, projectedSize.width * BOUQUET_FIT_MARGIN),
      availableHeight / Math.max(1, projectedSize.height * BOUQUET_FIT_MARGIN),
    ), 0.08, 4);
  }

  private projectedFitSize(vaseEnabled: boolean): {width: number; height: number} {
    const right = new Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    const up = new Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
    if (vaseEnabled) {
      const radialExtent = Math.hypot(
        Math.max(Math.abs(this.fitBounds.min.x), Math.abs(this.fitBounds.max.x)),
        Math.max(Math.abs(this.fitBounds.min.z), Math.abs(this.fitBounds.max.z)),
      );
      return {
        width: radialExtent * 2,
        height: (this.fitBounds.max.y - this.fitBounds.min.y) * Math.abs(up.y)
          + radialExtent * 2 * Math.hypot(up.x, up.z),
      };
    }

    const point = new Vector3();
    let minimumX = Number.POSITIVE_INFINITY;
    let maximumX = Number.NEGATIVE_INFINITY;
    let minimumY = Number.POSITIVE_INFINITY;
    let maximumY = Number.NEGATIVE_INFINITY;
    for (const x of [this.fitBounds.min.x, this.fitBounds.max.x]) {
      for (const y of [this.fitBounds.min.y, this.fitBounds.max.y]) {
        for (const z of [this.fitBounds.min.z, this.fitBounds.max.z]) {
          point.set(x, y, z).applyQuaternion(this.bouquet.quaternion);
          const projectedX = point.dot(right);
          const projectedY = point.dot(up);
          minimumX = Math.min(minimumX, projectedX);
          maximumX = Math.max(maximumX, projectedX);
          minimumY = Math.min(minimumY, projectedY);
          maximumY = Math.max(maximumY, projectedY);
        }
      }
    }
    return {width: maximumX - minimumX, height: maximumY - minimumY};
  }

  private screenOffset(x: number, y: number): Vector3 {
    const right = new Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion).multiplyScalar(x);
    const up = new Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion).multiplyScalar(y);
    return right.add(up);
  }
}

function resolvedInsets(
  configuration: BouquetCanvasViewConfiguration,
): {left: number; right: number; top: number; bottom: number} {
  if (configuration.recordingViewport) return {left: 0, right: 0, top: 0, bottom: 0};
  const {host, viewportInsets} = configuration;
  return {
    left: clamp(viewportInsets.left, 0, Math.max(0, host.clientWidth - 1)),
    right: clamp(viewportInsets.right, 0, Math.max(0, host.clientWidth - 1)),
    top: clamp(viewportInsets.top, 0, Math.max(0, host.clientHeight - 1)),
    bottom: clamp(viewportInsets.bottom, 0, Math.max(0, host.clientHeight - 1)),
  };
}

function viewportSize(
  configuration: BouquetCanvasViewConfiguration,
): {width: number; height: number} {
  if (configuration.recordingViewport) return configuration.recordingViewport;
  return {width: configuration.host.clientWidth, height: configuration.host.clientHeight};
}
