import * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

export type FurnitureAssetKind = 'desk' | 'sofa' | 'fridge' | 'bike' | 'lamp' | 'cabinet' | 'washer';

interface FurnitureAssetDefinition {
  path: string;
  targetSize: [number, number, number];
  fallback: 'procedural';
}

/**
 * Real furniture models are optional repository assets. Missing files keep the
 * explicitly procedural placeholder visible; they are never silently presented
 * as imported models.
 */
export const furnitureAssets: Record<FurnitureAssetKind, FurnitureAssetDefinition> = {
  desk: { path: '/models/desk.glb', targetSize: [1.25, 1.15, .72], fallback: 'procedural' },
  sofa: { path: '/models/sofa.glb', targetSize: [1.55, .95, .9], fallback: 'procedural' },
  fridge: { path: '/models/fridge.glb', targetSize: [.82, 1.8, .78], fallback: 'procedural' },
  bike: { path: '/models/bike.glb', targetSize: [1.55, 1.2, .48], fallback: 'procedural' },
  lamp: { path: '/models/lamp.glb', targetSize: [.48, 1.65, .48], fallback: 'procedural' },
  cabinet: { path: '/models/cabinet.glb', targetSize: [1.15, 1.65, .58], fallback: 'procedural' },
  washer: { path: '/models/washer.glb', targetSize: [.78, 1.05, .78], fallback: 'procedural' },
};

/**
 * Fits an imported GLTF into a known real-world-ish furniture envelope.
 * The wrapper origin is at floor level and its X/Z center is aligned to the
 * existing room anchor, so asset-specific pivots do not move the item through
 * walls or floors.
 */
export function prepareFurnitureAsset(gltf: GLTF, kind: FurnitureAssetKind): THREE.Group {
  const definition = furnitureAssets[kind];
  const source = gltf.scene;
  source.updateMatrixWorld(true);

  const bounds = new THREE.Box3().setFromObject(source);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const target = new THREE.Vector3(...definition.targetSize);
  const sourceMax = Math.max(size.x, size.y, size.z);
  const targetMax = Math.max(target.x, target.y, target.z);
  const scale = sourceMax > 0 ? targetMax / sourceMax : 1;

  const wrapper = new THREE.Group();
  source.scale.multiplyScalar(scale);
  source.position.x -= center.x * scale;
  source.position.y -= bounds.min.y * scale;
  source.position.z -= center.z * scale;

  source.traverse(object => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map(material => material.clone());
    } else {
      mesh.material = mesh.material.clone();
    }
  });

  wrapper.add(source);
  wrapper.userData.assetKind = kind;
  wrapper.userData.assetPath = definition.path;
  wrapper.userData.importedModel = true;
  return wrapper;
}
