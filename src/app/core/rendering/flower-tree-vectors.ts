export interface FlowerTreeVector {
  x: number;
  y: number;
  z: number;
}

export function sphericalDirection(angle: number, azimuth: number): FlowerTreeVector {
  return {
    x: Math.sin(angle) * Math.cos(azimuth),
    y: Math.cos(angle),
    z: Math.sin(angle) * Math.sin(azimuth),
  };
}

export function cross(first: FlowerTreeVector, second: FlowerTreeVector): FlowerTreeVector {
  return {
    x: first.y * second.z - first.z * second.y,
    y: first.z * second.x - first.x * second.z,
    z: first.x * second.y - first.y * second.x,
  };
}

export function normalize(vector: FlowerTreeVector): FlowerTreeVector {
  const length = Math.hypot(vector.x, vector.y, vector.z) || 1;
  return {x: vector.x / length, y: vector.y / length, z: vector.z / length};
}
