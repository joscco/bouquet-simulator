import {
  BufferGeometry,
  Group,
  LineSegments,
  Material,
  Mesh,
  MeshStandardMaterial,
} from 'three';

export function disposeGroupChildren(group: Group): void {
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  group.traverse((object) => {
    if (!(object instanceof Mesh || object instanceof LineSegments)) return;
    geometries.add(object.geometry);
    const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of objectMaterials) materials.add(material);
  });
  group.clear();
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) {
    if (material instanceof MeshStandardMaterial) {
      material.map?.dispose();
      material.bumpMap?.dispose();
    }
    material.dispose();
  }
}
