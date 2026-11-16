<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import * as THREE from 'three';
import type { Product } from '../data/market';

const props = defineProps<{ products: Product[]; communityName: string; scene: string; accent: string }>();
const emit = defineEmits<{ select: [product: Product] }>();
const host = ref<HTMLDivElement | null>(null);
const ready = ref(false);
let renderer: THREE.WebGLRenderer | undefined;
let scene!: THREE.Scene;
let camera!: THREE.PerspectiveCamera;
let frame = 0;
let observer: ResizeObserver | undefined;
let pointerDown = false;
let startX = 0;
let startRotation = 0;
let targetRotation = 0;
let raycaster: THREE.Raycaster;
let clickable: THREE.Object3D[] = [];
let productMeshes = new Map<THREE.Object3D, Product>();
let pointer = new THREE.Vector2();
let disposed = false;

function makeBox(parent: THREE.Group, size: [number, number, number], position: [number, number, number], color: string, roughness = .82) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), new THREE.MeshStandardMaterial({ color, roughness }));
  mesh.position.set(...position); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function makeCylinder(parent: THREE.Group, radius: number, height: number, position: [number, number, number], color: string) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 24), new THREE.MeshStandardMaterial({ color, roughness: .72 }));
  mesh.position.set(...position); mesh.castShadow = true; parent.add(mesh); return mesh;
}
function buildStall(index: number, product: Product | undefined, loader: THREE.TextureLoader) {
  const g = new THREE.Group();
  const x = (index - 1.5) * 4.25;
  g.position.set(x, 0, -1.6 - (index % 2) * .25);
  scene.add(g);
  const wood = index % 2 ? '#87654a' : '#9b7652';
  makeBox(g, [3.15, 1.55, 1.12], [0, 1.12, 0], '#e8d7b9');
  makeBox(g, [3.35, .18, 1.3], [0, .32, .05], wood);
  makeBox(g, [3.55, .16, 1.45], [0, 1.98, -.02], '#6f5039');
  for (const sx of [-1.45, 1.45]) makeBox(g, [.13, 2.2, .14], [sx, 1.15, .42], wood);
  const awning = new THREE.Group(); awning.position.set(0, 2.12, .28); g.add(awning);
  makeBox(awning, [3.65, .18, 1.15], [0, 0, -.35], props.accent || '#b86d4c');
  for (let i = 0; i < 7; i++) makeBox(awning, [.07, .2, 1.17], [-1.55 + i * .52, -.02, -.35], i % 2 ? '#ead8b8' : '#a75d43');
  makeBox(g, [3.35, .08, .3], [0, 1.4, .65], '#76583e');
  if (product) {
    const card = new THREE.Group(); card.position.set(0, 1.08, .79); g.add(card);
    const mat = new THREE.MeshBasicMaterial({ color: '#f5eee1' });
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(1.18, 1.15), mat); card.add(plate);
    const photo = new THREE.Mesh(new THREE.PlaneGeometry(1.08, .9), new THREE.MeshBasicMaterial({ color: '#d7c7ae' }));
    photo.position.z = .015; card.add(photo);
    loader.load(product.image, texture => {
      if (disposed) { texture.dispose(); return; }
      texture.colorSpace = THREE.SRGBColorSpace;
      photo.material = new THREE.MeshBasicMaterial({ map: texture });
    });
    const price = new THREE.Mesh(new THREE.PlaneGeometry(.62, .2), new THREE.MeshBasicMaterial({ color: '#a94e35' }));
    price.position.set(.2, -.43, .03); card.add(price);
    card.userData.product = product; clickable.push(plate, photo, price); productMeshes.set(plate, product); productMeshes.set(photo, product); productMeshes.set(price, product);
    card.rotation.y = -.08;
  } else {
    for (let j = 0; j < 3; j++) {
      const jar = makeCylinder(g, .18, .42 + j * .1, [-.85 + j * .65, .65, .72], ['#c58d55', '#78906d', '#d3b98a'][j]);
      jar.rotation.z = Math.PI / 2;
    }
  }
  // Warm hanging bulbs
  for (const px of [-1.25, 1.25]) {
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(.075, 12, 12), new THREE.MeshBasicMaterial({ color: '#ffe3a4' }));
    bulb.position.set(px, 2.25, .55); g.add(bulb);
  }
}
function init() {
  if (!host.value) return;
  scene = new THREE.Scene(); scene.background = new THREE.Color('#cbd8d1'); scene.fog = new THREE.Fog('#d8d8c7', 13, 33);
  camera = new THREE.PerspectiveCamera(43, host.value.clientWidth / host.value.clientHeight, .1, 100);
  camera.position.set(0, 5.3, 12.8); camera.lookAt(0, 1.3, -1);
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
  renderer.setSize(host.value.clientWidth, host.value.clientHeight);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12;
  host.value.appendChild(renderer.domElement);
  const hemi = new THREE.HemisphereLight('#fff2d8', '#78664f', 2.05); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffe1ad', 3.2); sun.position.set(-5, 10, 7); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); scene.add(sun);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 45), new THREE.MeshStandardMaterial({ color: '#a99b7e', roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -.03; floor.receiveShadow = true; scene.add(floor);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(60, 6), new THREE.MeshStandardMaterial({ color: '#c5b99f', roughness: 1 }));
  road.rotation.x = -Math.PI / 2; road.position.set(0, .005, 3.2); scene.add(road);
  // Community apartment blocks create a recognizable Beijing residential backdrop.
  for (let i = 0; i < 9; i++) {
    const h = 4.3 + (i % 3) * .85;
    const building = new THREE.Group();
    makeBox(building, [2.3, h, 1.25], [0, 0, 0], '#b9b7a5');
    building.position.set(-11 + i * 2.8, h / 2, -8.2); scene.add(building);
    for (let row = 0; row < 4; row++) for (let col = 0; col < 2; col++) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(.34, .42), new THREE.MeshBasicMaterial({ color: (row + col + i) % 4 ? '#d7d0b8' : '#879c9b' }));
      win.position.set(-11 + i * 2.8 - .48 + col * .95, .9 + row * .82, -7.55); scene.add(win);
    }
  }
  // Plane of the neighborhood lane and small trees.
  for (let i = 0; i < 7; i++) {
    const x = -12 + i * 4;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.11, .16, 1.45, 8), new THREE.MeshStandardMaterial({ color: '#765b42' }));
    trunk.position.set(x, .72, -3.4); scene.add(trunk);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(.72, 12, 10), new THREE.MeshStandardMaterial({ color: i % 2 ? '#829477' : '#9ba17a', roughness: 1 }));
    crown.position.set(x, 1.85, -3.4); crown.scale.y = 1.25; scene.add(crown);
  }
  const loader = new THREE.TextureLoader(); loader.setCrossOrigin('anonymous');
  const picks = props.products.slice(0, 4);
  for (let i = 0; i < 4; i++) buildStall(i, picks[i], loader);
  raycaster = new THREE.Raycaster();
  ready.value = true;
  animate();
}
function animate() {
  frame = requestAnimationFrame(animate);
  if (!renderer) return;
  camera.position.x += (Math.sin(targetRotation) * 2.6 - camera.position.x) * .035;
  camera.lookAt(0, 1.1, -1.2);
  renderer.render(scene, camera);
}
function resize() {
  if (!host.value || !renderer || !camera) return;
  const w = host.value.clientWidth, h = host.value.clientHeight;
  camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
}
function down(e: PointerEvent) { pointerDown = true; startX = e.clientX; startRotation = targetRotation; host.value?.setPointerCapture(e.pointerId); }
function move(e: PointerEvent) { if (pointerDown) targetRotation = THREE.MathUtils.clamp(startRotation + (e.clientX - startX) * .002, -1.05, 1.05); }
function up() { pointerDown = false; }
function click(e: PointerEvent) {
  if (!host.value || pointerDown) return;
  const rect = host.value.getBoundingClientRect();
  pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(clickable, false)[0];
  const product = hit ? productMeshes.get(hit.object) : undefined;
  if (product) emit('select', product);
}
function wheel(e: WheelEvent) { targetRotation = THREE.MathUtils.clamp(targetRotation + e.deltaY * .0015, -1.05, 1.05); }
onMounted(() => { init(); if (host.value) { observer = new ResizeObserver(resize); observer.observe(host.value); } });
onBeforeUnmount(() => { disposed = true; cancelAnimationFrame(frame); observer?.disconnect(); renderer?.dispose(); scene?.traverse(o => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); const m = o.material; if (Array.isArray(m)) m.forEach(x => x.dispose()); else m.dispose(); } }); });
watch(() => props.products, () => { /* Scene intentionally remains stable while community transitions; product cards update on next mount. */ });
</script>

<template>
  <div class="neighborhood-3d" ref="host" @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="up" @click="click" @wheel.prevent="wheel">
    <div class="scene-hud"><span class="hud-live"></span><b>{{ communityName }}</b><i></i><small>社区实景漫游 · 拖动视角</small></div>
    <div class="scene-crosshair">↔</div>
    <div class="scene-bottom"><span>拾光集市 · 邻里生活街</span><small>点击摊位上的商品查看详情</small></div>
    <div v-if="!ready" class="scene-loading">正在布置邻里街巷…</div>
  </div>
</template>

<style scoped>
.neighborhood-3d{height:490px;position:relative;overflow:hidden;background:linear-gradient(#cbd8d1,#d9cdb2);cursor:grab;touch-action:pan-y;border:1px solid #c6bda9;box-shadow:0 25px 60px #524c3924}
.neighborhood-3d:active{cursor:grabbing}.neighborhood-3d canvas{display:block;width:100%;height:100%}
.scene-hud{position:absolute;top:18px;left:20px;display:flex;align-items:center;gap:9px;padding:10px 14px;background:#263b30df;color:#f7ecd7;border:1px solid #e5d2ad55;border-radius:3px;pointer-events:none;font-size:12px;letter-spacing:1px}
.scene-hud i{height:14px;width:1px;background:#ffffff55}.scene-hud small{font-size:10px;color:#d8cbb1;letter-spacing:0}.hud-live{width:7px;height:7px;border-radius:50%;background:#a9c68b;box-shadow:0 0 0 4px #a9c68b22}
.scene-bottom{position:absolute;left:20px;bottom:18px;right:20px;display:flex;justify-content:space-between;align-items:center;color:#fff5df;text-shadow:0 2px 6px #2b2b22;font-size:11px;pointer-events:none}.scene-bottom small{font-size:10px}.scene-crosshair{position:absolute;right:22px;top:50%;color:#fff5df;font-size:26px;text-shadow:0 2px 8px #333;pointer-events:none}.scene-loading{position:absolute;inset:0;display:grid;place-items:center;background:#d5d2bf;color:#52604f;font-size:12px}
@media(max-width:700px){.neighborhood-3d{height:390px}.scene-hud{top:12px;left:10px;padding:8px 10px}.scene-hud small{display:none}.scene-bottom{left:12px;right:12px;bottom:12px}}
</style>
