<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue';
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
let moved = false;
let startX = 0;
let startY = 0;
let startYaw = 0;
let startPitch = 0;
let yaw = 0;
let pitch = .12;
let raycaster!: THREE.Raycaster;
const pointer = new THREE.Vector2();
const hitTargets: THREE.Object3D[] = [];
const productByObject = new Map<THREE.Object3D, Product>();
let disposed = false;

const mat = (color: string, roughness = .88, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
function box(parent: THREE.Object3D, size: [number, number, number], pos: [number, number, number], material: THREE.Material, cast = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...pos); mesh.castShadow = cast; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function cylinder(parent: THREE.Object3D, radius: number, height: number, pos: [number, number, number], material: THREE.Material, radial = 20) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, radial), material);
  mesh.position.set(...pos); mesh.castShadow = true; parent.add(mesh); return mesh;
}
function sphere(parent: THREE.Object3D, radius: number, pos: [number, number, number], material: THREE.Material, scale: [number,number,number] = [1,1,1]) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 12), material);
  mesh.position.set(...pos); mesh.scale.set(...scale); mesh.castShadow = true; parent.add(mesh); return mesh;
}
function makeConcreteTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#b9b5a8'; ctx.fillRect(0,0,512,512);
  for (let i=0;i<17000;i++) {
    const v = 105 + Math.random()*95; ctx.fillStyle = `rgba(${v},${v},${v-5},${Math.random()*.16})`;
    ctx.fillRect(Math.random()*512,Math.random()*512,1+Math.random()*3,1+Math.random()*3);
  }
  const texture = new THREE.CanvasTexture(canvas); texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(3,2); return texture;
}
function makePaving() {
  const g = new THREE.Group(); scene.add(g);
  const base = new THREE.Mesh(new THREE.PlaneGeometry(42,34), mat('#aaa397',1)); base.rotation.x=-Math.PI/2; base.position.set(0,-.08,-1); base.receiveShadow=true; g.add(base);
  const tileMat = mat('#b9b4a7',.96);
  for(let x=-18;x<=18;x+=1.5) for(let z=-15;z<=13;z+=1.5) {
    const tile = new THREE.Mesh(new THREE.BoxGeometry(1.46,.035,1.46), tileMat);
    tile.position.set(x,.0,z); tile.receiveShadow=true; g.add(tile);
  }
  // Drain covers and worn painted curb.
  const drain = box(g,[1.1,.025,.42],[-5,.025,2.2],mat('#5f625d',.95),false);
  for(let i=0;i<7;i++) box(g,[.035,.012,.34],[-5.42+i*.14,.045,2.2],mat('#999b93'),false);
  box(g,[34,.18,.34],[0,.02,-5.7],mat('#777a6f'),false);
}
function makeApartmentFacade() {
  const wall = new THREE.Group(); wall.position.set(0,0,-10); scene.add(wall);
  const concrete = new THREE.MeshStandardMaterial({ map: makeConcreteTexture(), roughness:1 });
  box(wall,[27,10,.65],[0,5,0],concrete,false);
  // Realistic repetitive window bays, recessed frames and balconies.
  for(let floor=0;floor<4;floor++) for(let col=0;col<8;col++) {
    const x=-11.2+col*3.2, y=1.55+floor*2.18;
    box(wall,[1.28,1.35,.10],[x,y,.37],mat('#716f68'),false);
    box(wall,[1.12,1.19,.035],[x,y,.44],mat((floor+col)%5===0?'#b3aa93':'#52636a',.32,.18),false);
    box(wall,[.055,1.25,.07],[x,y,.49],mat('#d5d0c3',.52,.2),false);
    box(wall,[1.2,.055,.07],[x,y,.5],mat('#d5d0c3',.52,.2),false);
    if((col+floor)%3===0) {
      box(wall,[1.5,.08,.75],[x,y-.78,.68],mat('#88877d'),false);
      box(wall,[1.5,.06,.06],[x,y-.38,1.02],mat('#777b76'),false);
      for(const dx of [-.68,.68]) box(wall,[.055,.42,.06],[x+dx,y-.58,1.02],mat('#777b76'),false);
    }
  }
  // Air-conditioning outdoor units.
  for(const x of [-9,-2,5,11]) {
    const ac = new THREE.Group(); ac.position.set(x,2.8,.65); wall.add(ac);
    box(ac,[.72,.48,.38],[0,0,0],mat('#dedbd1'),false);
    cylinder(ac,.16,.05,[0,0,.21],mat('#777c79'),32).rotation.x=Math.PI/2;
    box(ac,[.9,.06,.48],[0,-.3,-.05],mat('#77776d'),false);
  }
  // Ground-floor entrance and a faded community notice board.
  box(wall,[2.2,2.7,.16],[-8,1.45,.42],mat('#464c49'),false);
  box(wall,[1.88,2.35,.06],[-8,1.4,.53],mat('#8d9a94',.36),false);
  box(wall,[2.7,1.7,.16],[8.6,1.55,.48],mat('#846d50'),false);
  box(wall,[2.42,1.4,.04],[8.6,1.55,.58],mat('#d5c9ad'),false);
  for(let i=0;i<4;i++) box(wall,[2.1,.025,.035],[8.6,1.95-i*.3,.62],mat('#99886c'),false);
}
function makeTree(x:number,z:number) {
  const g=new THREE.Group(); g.position.set(x,0,z); scene.add(g);
  cylinder(g,.16,1.8,[0,.9,0],mat('#62503d'),12);
  sphere(g,.95,[0,2.25,0],mat('#627858'),[1,1.2,1]);
  sphere(g,.68,[-.48,2.05,.12],mat('#7b8c66'));
  sphere(g,.7,[.48,2.15,-.08],mat('#536f50'));
  cylinder(g,.82,.12,[0,.1,0],mat('#777a69'),32);
}
function makeBicycle(x:number,z:number) {
  const g=new THREE.Group(); g.position.set(x,0,z); scene.add(g);
  const rubber=mat('#282b2a',.8), metal=mat('#69716d',.35,.7);
  for(const wx of [-.62,.62]) {
    const wheel=new THREE.Mesh(new THREE.TorusGeometry(.39,.035,8,28),rubber); wheel.position.set(wx,.42,0); wheel.rotation.y=Math.PI/2; g.add(wheel);
    cylinder(g,.035,.08,[wx,.42,0],metal).rotation.z=Math.PI/2;
  }
  const a=[-.62,.42,0],b=[0,.95,0],c=[.62,.42,0];
  const rod=(p1:number[],p2:number[])=>{const d=new THREE.Vector3(p2[0]-p1[0],p2[1]-p1[1],p2[2]-p1[2]);const m=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,d.length,8),metal);m.position.set((p1[0]+p2[0])/2,(p1[1]+p2[1])/2,0);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());g.add(m);};
  rod(a,b);rod(b,c);rod(a,c);rod(b,[.12,1.02,0]);rod([.12,1.02,0],[.42,1.02,0]);
  box(g,[.34,.07,.18],[.02,1.05,0],mat('#292d2a'));
}
function makeScooter(x:number,z:number) {
  const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
  const dark=mat('#303433'), body=mat('#b9b9ad',.4,.2);
  for(const wx of [-.52,.5]) cylinder(g,.22,.12,[wx,.23,0],dark,24).rotation.z=Math.PI/2;
  box(g,[.85,.18,.35],[0,.48,0],body);
  box(g,[.34,.52,.28],[-.24,.78,0],body);
  const stem=cylinder(g,.035,.8,[.38,.94,0],dark,12);stem.rotation.z=-.25;
  box(g,[.42,.05,.08],[.45,1.32,0],dark);
}
function makeFoldingTable(x:number,z:number,product:Product,index:number,loader:THREE.TextureLoader) {
  const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
  const top=mat(index%2?'#b8a88d':'#777a70');
  box(g,[2.05,.12,1.05],[0,.92,0],top);
  for(const sx of [-.82,.82]) for(const sz of [-.36,.36]) {
    const leg=cylinder(g,.035,.9,[sx,.46,sz],mat('#555a56',.5,.6),10); leg.rotation.z=sx*.05;
  }
  // Used cardboard cartons and a folded cloth make the table feel occupied, not showroom-like.
  box(g,[.42,.35,.46],[-.68,1.14,-.15],mat('#a88760'));
  box(g,[.42,.025,.46],[-.68,1.33,-.15],mat('#8f704f'));
  const cloth=box(g,[.8,.025,.45],[.53,1.01,.02],mat('#d0c8b5'));cloth.rotation.z=.02;
  // Product image as a small, weathered second-hand listing board placed on the table.
  const frameGroup=new THREE.Group();frameGroup.position.set(.45,1.18,.2);g.add(frameGroup);
  const frameMat=mat('#6f5b47');
  box(frameGroup,[.62,.72,.07],[0,.36,0],frameMat);
  const photo=new THREE.Mesh(new THREE.PlaneGeometry(.54,.58),new THREE.MeshBasicMaterial({color:'#c8c1b2'}));
  photo.position.set(0,.36,.041);frameGroup.add(photo);
  loader.load(product.image,(tex: THREE.Texture)=>{if(disposed){tex.dispose();return;}tex.colorSpace=THREE.SRGBColorSpace;photo.material=new THREE.MeshBasicMaterial({map:tex});});
  const price=box(frameGroup,[.58,.12,.035],[0,.02,.06],mat('#eee5d3'),false);
  const hit=new THREE.Mesh(new THREE.PlaneGeometry(.64,.76),new THREE.MeshBasicMaterial({transparent:true,opacity:0,side:THREE.DoubleSide}));
  hit.position.set(0,.36,.1);frameGroup.add(hit);hitTargets.push(hit);productByObject.set(hit,product);
  // A recognizable silhouette hints at the actual object category.
  if(product.category==='家具家居') {
    box(g,[.65,.12,.42],[.02,1.12,-.27],mat('#8d7357'));
    for(const sx of [-.25,.29]) box(g,[.06,.48,.06],[sx,.68,-.27],mat('#8d7357'));
  } else if(product.category==='家用电器') {
    box(g,[.42,.52,.4],[-.25,1.25,-.22],mat('#c5c6bd',.42,.08));
    box(g,[.32,.02,.02],[-.25,1.37,0],mat('#777b75'));
  } else if(product.category==='母婴玩具') {
    sphere(g,.22,[-.3,1.18,-.2],mat('#b86d4c'));
    cylinder(g,.07,.25,[-.3,1.42,-.2],mat('#6e665b'));
  } else {
    cylinder(g,.36,.09,[-.25,1.08,-.2],mat('#343a39'),24);
    cylinder(g,.36,.09,[.22,1.08,-.2],mat('#343a39'),24);
    box(g,[.42,.08,.18],[-.02,1.45,-.2],mat('#687b64'));
  }
  // Click the entire tabletop, not just the tiny photo.
  const area=new THREE.Mesh(new THREE.BoxGeometry(2.05,.15,1.05),new THREE.MeshBasicMaterial({transparent:true,opacity:0}));
  area.position.set(0,.94,0);g.add(area);hitTargets.push(area);productByObject.set(area,product);
}
function makeBenchAndPlanters() {
  const bench=new THREE.Group();bench.position.set(-5,0,-3.8);scene.add(bench);
  const wood=mat('#78634d');box(bench,[2.1,.14,.55],[0,.55,0],wood);
  for(const x of [-.82,.82]){box(bench,[.12,.65,.12],[x,.32,0],mat('#555a53'));box(bench,[.12,.9,.12],[x,1.05,-.2],mat('#555a53'));}
  for(const x of [-10,10]) {
    const planter=new THREE.Group();planter.position.set(x,0,-3.1);scene.add(planter);
    box(planter,[1.6,.42,1.1],[0,.22,0],mat('#827a69'));
    for(let i=0;i<5;i++) sphere(planter,.22,[-.55+i*.27,.62,(i%2)*.2],mat(i%2?'#536f50':'#7b8b64'),[1,1.6,1]);
  }
}
function build() {
  if(!host.value)return;
  scene=new THREE.Scene();scene.background=new THREE.Color('#b9c4c0');scene.fog=new THREE.Fog('#b9c4c0',22,48);
  camera=new THREE.PerspectiveCamera(47,host.value.clientWidth/host.value.clientHeight,.1,120);
  camera.position.set(0,4.1,12.5);camera.lookAt(0,1.2,-2);
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.65));renderer.setSize(host.value.clientWidth,host.value.clientHeight);
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;
  host.value.appendChild(renderer.domElement);
  scene.add(new THREE.HemisphereLight('#e7ece7','#5e594e',1.75));
  const sun=new THREE.DirectionalLight('#fff0d7',2.4);sun.position.set(-7,12,8);sun.castShadow=true;sun.shadow.mapSize.set(1536,1536);scene.add(sun);
  makePaving();makeApartmentFacade();makeBenchAndPlanters();
  makeTree(-11,-3);makeTree(11,-4);makeBicycle(-7,2.1);makeScooter(8,2.2);
  const loader=new THREE.TextureLoader();loader.setCrossOrigin('anonymous');
  const placements=[[-6.1,-1.0],[0,-2.2],[6.0,-.7],[10,-1.8]] as const;
  props.products.slice(0,4).forEach((p,i)=>makeFoldingTable(placements[i][0],placements[i][1],p,i,loader));
  raycaster=new THREE.Raycaster();ready.value=true;animate();
}
function animate(){
  frame=requestAnimationFrame(animate);if(!renderer)return;
  const radius=12.8;
  camera.position.x+=(Math.sin(yaw)*radius-camera.position.x)*.045;
  camera.position.y+=(4.05+pitch*2-camera.position.y)*.045;
  camera.position.z+=(Math.cos(yaw)*radius-camera.position.z)*.045;
  camera.lookAt(0,1.25,-2.2);renderer.render(scene,camera);
}
function resize(){if(!host.value||!renderer||!camera)return;camera.aspect=host.value.clientWidth/host.value.clientHeight;camera.updateProjectionMatrix();renderer.setSize(host.value.clientWidth,host.value.clientHeight);}
function down(e:PointerEvent){pointerDown=true;moved=false;startX=e.clientX;startY=e.clientY;startYaw=yaw;startPitch=pitch;host.value?.setPointerCapture(e.pointerId);}
function move(e:PointerEvent){if(!pointerDown)return;const dx=e.clientX-startX,dy=e.clientY-startY;if(Math.abs(dx)+Math.abs(dy)>5)moved=true;yaw=THREE.MathUtils.clamp(startYaw+dx*.003,-.85,.85);pitch=THREE.MathUtils.clamp(startPitch-dy*.002,-.25,.55);}
function up(){pointerDown=false;}
function click(e:PointerEvent){if(moved||!host.value)return;const r=host.value.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(hitTargets,false)[0];const p=hit?productByObject.get(hit.object):undefined;if(p)emit('select',p);}
function wheel(e:WheelEvent){yaw=THREE.MathUtils.clamp(yaw+e.deltaY*.0009,-.85,.85);}
onMounted(()=>{build();if(host.value){observer=new ResizeObserver(resize);observer.observe(host.value);}});
onBeforeUnmount(()=>{disposed=true;cancelAnimationFrame(frame);observer?.disconnect();renderer?.dispose();scene?.traverse((o: THREE.Object3D)=>{if(o instanceof THREE.Mesh){o.geometry.dispose();const m=o.material;if(Array.isArray(m))m.forEach(x=>x.dispose());else m.dispose();}});});
</script>

<template>
  <div class="neighborhood-3d" ref="host" @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="up" @click="click" @wheel.prevent="wheel">
    <div class="scene-hud"><span class="hud-live"></span><b>{{ communityName }}</b><i></i><small>居民区生活场景 · 拖动观察</small></div>
    <div class="scene-bottom"><span>拾光集市 · 小区公共空间</span><small>点击闲置摊位查看邻居发布的物品</small></div>
    <div v-if="!ready" class="scene-loading">正在还原小区生活场景…</div>
  </div>
</template>

<style scoped>
.neighborhood-3d{height:510px;position:relative;overflow:hidden;background:#b9c4c0;cursor:grab;touch-action:pan-y;border:1px solid #b7b1a3;box-shadow:0 22px 55px #39362d24}
.neighborhood-3d:active{cursor:grabbing}.neighborhood-3d canvas{display:block;width:100%;height:100%}
.scene-hud{position:absolute;top:17px;left:18px;display:flex;align-items:center;gap:9px;padding:9px 13px;background:#272d2ad9;color:#f2eee5;border:1px solid #ffffff35;pointer-events:none;font-size:12px}
.scene-hud i{height:14px;width:1px;background:#ffffff55}.scene-hud small{font-size:10px;color:#d5d0c4}.hud-live{width:7px;height:7px;border-radius:50%;background:#9eb28b;box-shadow:0 0 0 4px #9eb28b22}
.scene-bottom{position:absolute;left:18px;bottom:17px;right:18px;display:flex;justify-content:space-between;align-items:center;color:#fff;text-shadow:0 2px 8px #242722;font-size:11px;pointer-events:none}.scene-bottom small{font-size:10px}
.scene-loading{position:absolute;inset:0;display:grid;place-items:center;background:#b9c4c0;color:#424a43;font-size:12px}
@media(max-width:700px){.neighborhood-3d{height:390px}.scene-hud{top:11px;left:10px;padding:8px 10px}.scene-hud small{display:none}.scene-bottom{left:12px;right:12px;bottom:12px;gap:12px}.scene-bottom small{max-width:55%;text-align:right}}
</style>
