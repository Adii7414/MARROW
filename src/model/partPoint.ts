import * as THREE from 'three';
import type { PartGroup } from './types';

const tmp = new THREE.Vector3();
/** World-space centre of a part instance. */
export function partPoint(g: PartGroup, i: number) {
  const m = g.instances[i].matrix;
  tmp.setFromMatrixPosition(m);
  if (tmp.lengthSq() < 1e-6) {
    if (!g.geometry.boundingBox) g.geometry.computeBoundingBox();
    return g.geometry.boundingBox!.getCenter(new THREE.Vector3());
  }
  return tmp.clone();
}
