import {Box3, Object3D, SpotLight, Vector3} from 'three';
import {BouquetBackgroundMode} from '../../../core/models/flower.models';

const FULL_CIRCLE = Math.PI * 2;
const UPLIGHT = {
  color: '#ffe2bd',
  darkIntensityAtReferenceHeight: 18000,
  lightIntensityAtReferenceHeight: 9000,
  referenceHeight: 360,
  minimumIntensityScale: 0.75,
  maximumIntensityScale: 2.2,
  minimumBouquetHeight: 120,
  minimumGroundRadius: 52,
  groundRadiusFactor: 0.32,
  groundHeightOffset: 2,
  minimumDistance: 260,
  distanceFactor: 1.45,
  coneAngle: Math.PI * 0.18,
  penumbra: 0.72,
  decay: 2,
  startAngle: -Math.PI / 2,
  targetHeightRatios: [0.58, 0.76, 0.92],
} as const;

export function createBouquetUplights(
  bounds: Box3,
  backgroundMode: BouquetBackgroundMode,
): Object3D[] {
  const center = bounds.getCenter(new Vector3());
  const size = bounds.getSize(new Vector3());
  const height = Math.max(UPLIGHT.minimumBouquetHeight, size.y);
  const groundRadius = Math.max(
    UPLIGHT.minimumGroundRadius,
    Math.max(size.x, size.z) * UPLIGHT.groundRadiusFactor,
  );
  const distance = Math.max(UPLIGHT.minimumDistance, height * UPLIGHT.distanceFactor);
  const linearIntensityScale = Math.max(
    UPLIGHT.minimumIntensityScale,
    Math.min(UPLIGHT.maximumIntensityScale, height / UPLIGHT.referenceHeight),
  );
  const referenceIntensity = backgroundMode === 'dark'
    ? UPLIGHT.darkIntensityAtReferenceHeight
    : UPLIGHT.lightIntensityAtReferenceHeight;
  const intensity = referenceIntensity * linearIntensityScale ** 2;

  return UPLIGHT.targetHeightRatios.flatMap((targetHeightRatio, index) => {
    const angle = UPLIGHT.startAngle
      + index / UPLIGHT.targetHeightRatios.length * FULL_CIRCLE;
    const target = new Object3D();
    target.position.set(center.x, bounds.min.y + height * targetHeightRatio, center.z);
    const light = new SpotLight(
      UPLIGHT.color,
      intensity,
      distance,
      UPLIGHT.coneAngle,
      UPLIGHT.penumbra,
      UPLIGHT.decay,
    );
    light.position.set(
      center.x + Math.cos(angle) * groundRadius,
      bounds.min.y + UPLIGHT.groundHeightOffset,
      center.z + Math.sin(angle) * groundRadius,
    );
    light.target = target;
    return [light, target];
  });
}
