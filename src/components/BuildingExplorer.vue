<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, nextTick } from 'vue';
import { useCommunityStore } from '../stores/community';
import { products as allProducts, wants } from '../data/market';
import { buildingRecords, listingsForBuilding } from '../data/buildings';
import { CommunityWorld } from '../scene/communityWorld';
import type { Product } from '../data/market';
import { MapPin, Building2, Heart, MessageCircle, ArrowLeft, RotateCcw, Sparkles, Search, Layers3, ChevronRight, Bot, X } from 'lucide-vue-next';

const store=useCommunityStore();
const canvas=ref<HTMLCanvasElement|null>(null);
const host=ref<HTMLElement|null>(null);
const world=ref<CommunityWorld|null>(null);
const hover=ref<{kind:'building'|'product';id:string;x:number;y:number}|null>(null);
const selectedBuildingId=ref<string|null>(null);
const selectedProductId=ref<string|null>(null);
const saved=ref<string[]>([]);
const guideOpen=ref(false);
const sceneReady=ref(false);
const activeCommunityProducts=computed(()=>allProducts.filter(p=>p.community_id===store.activeId));
const currentBuildings=computed(()=>buildingRecords.filter(b=>b.communityId===store.activeId));
const selectedBuilding=computed(()=>currentBuildings.value.find(b=>b.id===selectedBuildingId.value)||null);
const selectedProduct=computed<Product|null>(()=>activeCommunityProducts.value.find(p=>p.id===selectedProductId.value)||null);
const buildingListings=computed(()=>selectedBuildingId.value?listingsForBuilding(selectedBuildingId.value,activeCommunityProducts.value):[]);
const buildingWantCount=computed(()=>selectedBuilding.value?.wants||0);
const mode=computed(()=>selectedProduct.value?'product':selectedBuilding.value?'building':'overview');
const activeWants=computed(()=>wants.filter(w=>w.community_id===store.activeId));
const totalListings=computed(()=>currentBuildings.value.reduce((sum,b)=>sum+b.listings.filter(l=>activeCommunityProducts.value.some(p=>p.id===l.productId)).length,0));
const hoverProduct=computed(()=>hover.value?.kind==='product'?activeCommunityProducts.value.find(p=>p.id===hover.value?.id):null);
const hoverBuilding=computed(()=>hover.value?.kind==='building'?currentBuildings.value.find(b=>b.id===hover.value?.id):null);

function onPick(kind:'building'|'product'|null,id?:string,point?:THREE.Vector3) {
  if(!kind||!id){hover.value=null;return;}
  hover.value={kind,id,x:window.innerWidth*.55,y:window.innerHeight*.48};
}
function pointerMove(event:PointerEvent){
  if(!canvas.value||!world.value)return;
  world.value.handlePointerMove(event,canvas.value.getBoundingClientRect());
  if(hover.value) hover.value={...hover.value,x:event.clientX,y:event.clientY};
}
function clickScene(event:PointerEvent){
  if(!canvas.value||!world.value)return;
  world.value.handleClick(event,canvas.value.getBoundingClientRect());
}
function enterBuilding(id:string){
  selectedProductId.value=null;selectedBuildingId.value=id;
  world.value?.focusBuilding(id);
}
function openProduct(id:string){
  selectedProductId.value=id;
  world.value?.focusProduct(id);
}
function back(){
  if(selectedProductId.value){selectedProductId.value=null;if(selectedBuildingId.value)world.value?.focusBuilding(selectedBuildingId.value);else world.value?.resetCamera();return;}
  if(selectedBuildingId.value){selectedBuildingId.value=null;world.value?.resetCamera();return;}
  world.value?.resetCamera();
}
function toggleSave(id:string){saved.value=saved.value.includes(id)?saved.value.filter(x=>x!==id):[...saved.value,id];}
function switchCommunity(id:string){
  if(id===store.activeId)return;
  selectedBuildingId.value=null;selectedProductId.value=null;hover.value=null;
  store.switchCommunity(id);
}
function askContact(){guideOpen.value=true;}
function onResize(){
  if(!host.value||!world.value)return;
  world.value.resize(host.value.clientWidth,host.value.clientHeight);
}

onMounted(async()=>{
  await nextTick();
  if(!canvas.value||!host.value)return;
  world.value=new CommunityWorld(canvas.value,onPick);
  world.value.resize(host.value.clientWidth,host.value.clientHeight);
  sceneReady.value=true;
  window.addEventListener('resize',onResize);
});
watch(()=>store.activeId,async id=>{
  if(!world.value)return;
  selectedBuildingId.value=null;selectedProductId.value=null;hover.value=null;
  world.value.setCommunity(id,activeCommunityProducts.value);
});
onBeforeUnmount(()=>{
  window.removeEventListener('resize',onResize);
  world.value?.dispose();world.value=null;
});
</script>

<template>
  <main class="explorer-shell">
    <header class="explorer-topbar">
      <a class="brand-lockup" href="#"><span class="brand-stamp">拾</span><span><b>次渠 · 拾光集市</b><small>把闲置留在邻里之间</small></span></a>
      <div class="community-switcher">
        <span class="switch-caption">正在探索</span>
        <button v-for="community in store.openCommunities" :key="community.id" :class="{active:store.activeId===community.id}" @click="switchCommunity(community.id)">{{community.name}}</button>
      </div>
      <button class="top-agent" @click="guideOpen=true"><Bot :size="16"/> 小拾 AI <i></i></button>
    </header>

    <section class="explorer-intro">
      <div><span class="eyebrow">NEIGHBORHOOD / 3D EXPLORER</span><h1>走进楼里，<em>看看邻居的好物。</em></h1><p>从一栋楼开始，发现那些正在寻找新主人的生活物件。</p></div>
      <div class="intro-stats"><span><b>{{currentBuildings.length}}</b><small>栋住宅楼</small></span><i></i><span><b>{{totalListings}}</b><small>件闲置好物</small></span><i></i><span><b>{{activeWants.length}}</b><small>条邻里求购</small></span></div>
    </section>

    <section class="world-frame" ref="host">
      <canvas ref="canvas" class="world-canvas" @pointermove="pointerMove" @pointerleave="hover=null" @click="clickScene"></canvas>
      <div class="scene-vignette"></div>
      <div class="scene-topline">
        <div class="scene-location"><MapPin :size="13"/>{{store.active.name}} <span>/</span> 北京 · 通州 · 次渠</div>
        <div class="scene-hint"><span class="live-pip"></span> {{mode==='overview'?'拖动旋转 · 滚轮缩放 · 点击楼栋进入':mode==='building'?'楼栋剖面 · 点击房间里的物品':'物品查看 · 拖动旋转查看细节'}}</div>
      </div>
      <div class="scene-bottomline">
        <div class="scene-legend"><span><i class="legend-building"></i>住宅楼栋</span><span><i class="legend-listing"></i>有闲置发布</span><span><i class="legend-want"></i>有求购需求</span></div>
        <div class="scene-controls"><button @click="world?.resetCamera();selectedBuildingId=null;selectedProductId=null" title="回到社区全景"><RotateCcw :size="15"/></button><button @click="guideOpen=true" title="询问小拾"><Sparkles :size="15"/></button></div>
      </div>
      <div v-if="hoverBuilding&&mode==='overview'" class="hover-card building-hover" :style="{left:Math.min((hover?.x||0)+16,window.innerWidth-220)+'px',top:Math.max((hover?.y||0)-20,100)+'px'}">
        <small>RESIDENTIAL BUILDING</small><b>{{hoverBuilding.label}}</b><span>{{hoverBuilding.listings.filter(l=>activeCommunityProducts.some(p=>p.id===l.productId)).length}} 件闲置 · {{hoverBuilding.wants}} 条求购</span><i>点击进入楼栋剖面</i>
      </div>
      <div v-if="hoverProduct&&mode!=='overview'" class="hover-card product-hover" :style="{left:Math.min((hover?.x||0)+16,window.innerWidth-230)+'px',top:Math.max((hover?.y||0)-20,100)+'px'}">
        <small>{{hoverProduct.category}}</small><b>{{hoverProduct.title}}</b><span>¥{{hoverProduct.price}} · {{hoverProduct.condition}}</span>
      </div>

      <Transition name="slide-in">
        <aside v-if="selectedBuilding&&mode!=='product'" class="building-panel">
          <div class="panel-kicker"><Building2 :size="14"/> BUILDING PROFILE</div>
          <div class="panel-title-row"><div><h2>{{selectedBuilding.label}}</h2><p>{{store.active.name}} · {{selectedBuilding.floors}} 层住宅</p></div><button @click="back"><X :size="17"/></button></div>
          <div class="building-metrics"><span><b>{{buildingListings.length}}</b><small>闲置商品</small></span><span><b>{{buildingWantCount}}</b><small>邻里求购</small></span><span><b>{{selectedBuilding.floors}}</b><small>住宅楼层</small></span></div>
          <div class="floor-heading"><Layers3 :size="14"/> 房间与闲置物品 <small>点击物品聚焦查看</small></div>
          <div class="listing-list">
            <button v-for="listing in buildingListings" :key="listing.product.id" class="listing-row" @click="openProduct(listing.product.id)">
              <img :src="listing.product.image" :alt="listing.product.title"/><span><small>{{listing.floor}}F · {{listing.room}}</small><b>{{listing.product.title}}</b><strong>¥{{listing.product.price}}</strong></span><ChevronRight :size="15"/>
            </button>
            <div v-if="!buildingListings.length" class="empty-list">这栋楼暂时还没有公开的闲置物品</div>
          </div>
          <button class="panel-back" @click="back"><ArrowLeft :size="15"/> 返回社区全景</button>
        </aside>
      </Transition>

      <Transition name="slide-in">
        <aside v-if="selectedProduct" class="product-panel">
          <button class="product-close" @click="back"><ArrowLeft :size="17"/> 返回楼栋</button>
          <div class="product-image"><img :src="selectedProduct.image" :alt="selectedProduct.title"/><span>{{selectedProduct.condition}}</span></div>
          <div class="product-info"><small>{{store.active.name}} · {{selectedBuilding?.label||'邻里发布'}}</small><h2>{{selectedProduct.title}}</h2><div class="product-price">¥{{selectedProduct.price}} <del v-if="selectedProduct.originalPrice">原价 ¥{{selectedProduct.originalPrice}}</del></div><p>{{selectedProduct.description}}</p><div class="seller-line"><span class="seller-avatar">{{selectedProduct.seller.slice(0,1)}}</span><span><b>{{selectedProduct.seller}}</b><small>同小区邻居 · {{selectedProduct.postedAt}}</small></span></div><div class="product-actions"><button :class="{saved:saved.includes(selectedProduct.id)}" @click="toggleSave(selectedProduct.id)"><Heart :size="16" :fill="saved.includes(selectedProduct.id)?'currentColor':'none'"/>{{saved.includes(selectedProduct.id)?'已收藏':'收藏'}}</button><button class="contact-button" @click="askContact"><MessageCircle :size="16"/>联系卖家</button></div></div>
        </aside>
      </Transition>

      <div v-if="!sceneReady" class="scene-loading"><span></span><b>正在搭建社区空间</b><small>加载楼栋、道路与邻里生活</small></div>
      <div class="scene-credit">3D COMMUNITY WORLD <span>·</span> Three.js</div>
    </section>

    <section class="below-world">
      <div class="below-heading"><span class="eyebrow">NEIGHBORHOOD SIGNALS</span><h2>社区里的真实需求</h2><p>楼栋只是入口，真正发生的是邻居之间的物品流转。</p></div>
      <div class="want-grid"><article v-for="want in activeWants" :key="want.id" class="want-card"><span class="want-tag">邻里求购</span><h3>{{want.title}}</h3><p>{{want.detail}}</p><small>{{want.author}} · {{want.time}}</small></article></div>
    </section>

    <Transition name="guide-fade">
      <div v-if="guideOpen" class="guide-backdrop" @click.self="guideOpen=false"><aside class="guide-drawer"><div class="guide-head"><span class="guide-bot"><Bot :size="21"/></span><div><b>小拾 · 社区向导</b><small>只处理已授权公开的商品信息</small></div><button @click="guideOpen=false"><X :size="18"/></button></div><div class="guide-message">你好，我在{{store.active.name}}。可以帮你按楼栋查找已发布的闲置物品，也可以帮你看看附近有没有人正在求购。</div><div class="guide-status"><span class="live-pip"></span> 当前演示数据 · 尚未连接真实任务队列</div><div class="guide-shortcuts"><button @click="guideOpen=false;selectedBuildingId=currentBuildings[0]?.id||null;world?.focusBuilding(currentBuildings[0]?.id||'')">看看有闲置的楼栋</button><button @click="guideOpen=false">浏览社区求购</button></div></aside></div>
    </Transition>
  </main>
</template>

<script lang="ts">
import * as THREE from 'three';
export default { name:'BuildingExplorer', components:{} };
</script>

<style scoped>
.explorer-shell{min-height:100vh;background:#e9e6dc;color:#28352d;padding-bottom:56px;font-family:'DM Sans','Noto Sans SC',sans-serif}
.explorer-topbar{height:70px;padding:0 5.5%;display:flex;align-items:center;justify-content:space-between;background:#f5f2e9;border-bottom:1px solid #d9d4c7}
.brand-lockup{display:flex;align-items:center;gap:10px;text-decoration:none;color:inherit}.brand-stamp{width:34px;height:34px;display:grid;place-items:center;border-radius:50%;background:#304637;color:#f1d9b2;font:21px serif}.brand-lockup b,.brand-lockup small{display:block}.brand-lockup b{font-size:14px;letter-spacing:1px}.brand-lockup small{font-size:9px;color:#929080;margin-top:3px}
.community-switcher{display:flex;align-items:center;gap:6px}.switch-caption{font-size:10px;color:#979383;margin-right:7px}.community-switcher button{border:1px solid transparent;background:transparent;color:#777b70;border-radius:22px;padding:8px 13px;font-size:11px}.community-switcher button.active{background:#304637;color:#f7f0e3}.top-agent{display:flex;align-items:center;gap:7px;background:#e9e4d7;border:1px solid #d7d0c0;color:#3d5141;border-radius:22px;padding:8px 13px;font-size:11px}.top-agent i{width:6px;height:6px;border-radius:50%;background:#8b9b70}
.explorer-intro{padding:35px 5.5% 26px;display:flex;justify-content:space-between;align-items:flex-end}.eyebrow{font-size:9px;letter-spacing:2px;color:#aa8b62}.explorer-intro h1{font:600 clamp(28px,3.5vw,43px)/1.2 'Noto Serif SC',serif;letter-spacing:-1px;margin:11px 0 8px;color:#2d3d31}.explorer-intro h1 em{font-style:normal;color:#b77d54}.explorer-intro p{margin:0;color:#838477;font-size:11px}.intro-stats{display:flex;align-items:center;gap:22px;padding-bottom:4px}.intro-stats span{text-align:right}.intro-stats b,.intro-stats small{display:block}.intro-stats b{font:24px Georgia;color:#405743}.intro-stats small{font-size:9px;color:#989586;margin-top:3px}.intro-stats i{height:27px;width:1px;background:#d3cdbf}
.world-frame{height:min(690px,70vw);min-height:520px;margin:0 5.5%;position:relative;overflow:hidden;border-radius:5px;background:#cdd8d4;box-shadow:0 22px 55px #3a443322;isolation:isolate}.world-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;outline:none;touch-action:pan-y}.scene-vignette{position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 0 100px #28372a1b;z-index:1}.scene-topline{position:absolute;z-index:2;left:22px;right:22px;top:19px;display:flex;justify-content:space-between;align-items:center;pointer-events:none}.scene-location,.scene-hint{display:flex;align-items:center;gap:8px;color:#34483a;font-size:10px;background:#f5f2e4d9;padding:9px 12px;border:1px solid #fff8;border-radius:3px;box-shadow:0 4px 14px #33412b12}.scene-location span{color:#a8a28e}.scene-hint{background:#34483be8;color:#f3eddf}.live-pip{width:6px;height:6px;border-radius:50%;background:#b4c68b;box-shadow:0 0 0 4px #b4c68b2b}.scene-bottomline{position:absolute;z-index:2;bottom:18px;left:22px;right:22px;display:flex;align-items:center;justify-content:space-between;pointer-events:none}.scene-legend{display:flex;gap:14px;background:#f5f2e4dd;padding:10px 13px;border-radius:3px}.scene-legend span{display:flex;align-items:center;gap:6px;font-size:9px;color:#697264}.scene-legend i{width:7px;height:7px;border-radius:50%;display:block}.legend-building{background:#8b9c8c}.legend-listing{background:#c17d4f}.legend-want{background:#7f91a1}.scene-controls{display:flex;gap:7px;pointer-events:auto}.scene-controls button{width:35px;height:35px;border:1px solid #f5f2e4aa;background:#34483be8;color:#f5f0e5;border-radius:50%;display:grid;place-items:center}.scene-controls button:hover{background:#b47c53}
.hover-card{position:fixed;z-index:10;min-width:185px;padding:12px 14px;background:#f6f1e5f2;color:#354637;border:1px solid #fff;box-shadow:0 12px 30px #26352933;pointer-events:none;display:flex;flex-direction:column;gap:5px;border-radius:3px}.hover-card small{font-size:8px;letter-spacing:1.3px;color:#a28a66}.hover-card b{font:600 17px 'Noto Serif SC',serif}.hover-card span{font-size:10px;color:#73796d}.hover-card i{font-size:9px;color:#b47b50;font-style:normal;margin-top:2px}
.building-panel,.product-panel{position:absolute;z-index:4;right:16px;top:75px;bottom:68px;width:310px;max-width:calc(100% - 32px);background:#f5f1e7f4;backdrop-filter:blur(16px);border:1px solid #fff9;box-shadow:0 16px 45px #26352930;padding:20px 18px;overflow:auto}.panel-kicker{display:flex;align-items:center;gap:7px;font-size:8px;letter-spacing:1.4px;color:#9c865f}.panel-title-row{display:flex;justify-content:space-between;align-items:flex-start;margin-top:12px}.panel-title-row h2{font:600 27px 'Noto Serif SC',serif;margin:0;color:#2e4133}.panel-title-row p{font-size:10px;color:#898878;margin:5px 0 0}.panel-title-row button,.guide-head>button{border:0;background:transparent;color:#6c7668;padding:4px}.building-metrics{display:flex;gap:0;margin:19px 0;padding:14px 0;border-block:1px solid #ded8ca}.building-metrics span{flex:1;text-align:center;border-right:1px solid #ded8ca}.building-metrics span:last-child{border:0}.building-metrics b,.building-metrics small{display:block}.building-metrics b{font:22px Georgia;color:#3f5b45}.building-metrics small{font-size:9px;color:#928d7e;margin-top:4px}.floor-heading{display:flex;align-items:center;gap:7px;color:#445646;font-size:11px}.floor-heading small{margin-left:auto;font-size:8px;color:#9c9889}.listing-list{margin-top:12px}.listing-row{width:100%;display:flex;align-items:center;gap:10px;text-align:left;border:0;border-bottom:1px solid #e0dacc;background:transparent;padding:10px 0;color:#354437}.listing-row:hover{background:#e9e4d8}.listing-row img{width:55px;height:52px;object-fit:cover;border-radius:2px}.listing-row span{flex:1;min-width:0}.listing-row small,.listing-row b,.listing-row strong{display:block}.listing-row small{font-size:8px;color:#9b8b70}.listing-row b{font-size:10px;margin:4px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.listing-row strong{font-size:11px;color:#b36e47}.listing-row>svg{color:#9a988b}.empty-list{padding:22px 0;font-size:10px;color:#989383}.panel-back{display:flex;align-items:center;gap:7px;border:1px solid #d8d1c2;background:transparent;color:#596a59;padding:9px 12px;margin-top:17px;font-size:10px}
.product-panel{width:340px;padding:14px}.product-close{display:flex;align-items:center;gap:7px;border:0;background:transparent;color:#566754;font-size:10px;padding:4px 0 12px}.product-image{height:190px;position:relative;background:#e2ded3}.product-image img{width:100%;height:100%;object-fit:cover}.product-image span{position:absolute;left:10px;bottom:10px;background:#f4eddf;color:#4a5c49;padding:5px 8px;font-size:9px}.product-info{padding:15px 3px}.product-info>small{font-size:9px;color:#9b8b70}.product-info h2{font:600 21px 'Noto Serif SC',serif;margin:8px 0;color:#2d4133}.product-price{font:24px Georgia;color:#b36e47}.product-price del{font:10px sans-serif;color:#a7a18f;margin-left:8px}.product-info p{font-size:10px;line-height:1.8;color:#777b70;margin:13px 0}.seller-line{display:flex;align-items:center;gap:9px;border-top:1px solid #ded8ca;border-bottom:1px solid #ded8ca;padding:12px 0}.seller-avatar{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:#d9dfd1;color:#455c46;font:16px serif}.seller-line b,.seller-line small{display:block}.seller-line b{font-size:10px}.seller-line small{font-size:8px;color:#999383;margin-top:3px}.product-actions{display:flex;gap:8px;margin-top:14px}.product-actions button{flex:1;display:flex;align-items:center;justify-content:center;gap:7px;padding:11px;border:1px solid #d4cdbc;background:transparent;color:#536450;font-size:10px}.product-actions button.saved{color:#ae6749}.product-actions .contact-button{background:#344c3a;color:#f5eedf;border-color:#344c3a}
.scene-loading{position:absolute;z-index:8;inset:0;background:#dce3dc;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:#405544}.scene-loading span{width:24px;height:24px;border:2px solid #a7b49f;border-top-color:#415b46;border-radius:50%;animation:spin 1s linear infinite}.scene-loading b{font:16px 'Noto Serif SC',serif}.scene-loading small{font-size:9px;color:#858d7e}@keyframes spin{to{transform:rotate(360deg)}}.scene-credit{position:absolute;z-index:2;right:22px;top:63px;font-size:7px;letter-spacing:1.4px;color:#eff0e5a8;pointer-events:none}.scene-credit span{padding:0 4px}
.below-world{padding:48px 5.5% 0;display:grid;grid-template-columns:.8fr 1.2fr;gap:7%}.below-heading h2{font:600 27px 'Noto Serif SC',serif;color:#344638;margin:9px 0}.below-heading p{font-size:10px;color:#888a7c}.want-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.want-card{padding:15px;background:#f3efe5;border:1px solid #ded8ca}.want-tag{font-size:8px;color:#b07851;border:1px solid #d8bda2;padding:4px 7px}.want-card h3{font:600 13px 'Noto Serif SC',serif;color:#405342;margin:12px 0 7px}.want-card p{font-size:9px;line-height:1.6;color:#828577}.want-card small{font-size:8px;color:#a09b8b}
.guide-backdrop{position:fixed;inset:0;z-index:20;background:#1f2c2466;display:flex;justify-content:flex-end}.guide-drawer{width:350px;max-width:90vw;background:#f5f1e7;padding:22px;box-shadow:-15px 0 45px #1e2b2433}.guide-head{display:flex;align-items:center;gap:10px;border-bottom:1px solid #ddd6c7;padding-bottom:15px}.guide-bot{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:#dfe6d9;color:#425c48}.guide-head>div{flex:1}.guide-head b,.guide-head small{display:block}.guide-head b{font-size:12px;color:#354b3a}.guide-head small{font-size:9px;color:#969382;margin-top:3px}.guide-message{margin-top:22px;padding:15px;background:#e9e7dc;color:#596653;font-size:11px;line-height:1.9}.guide-status{margin-top:15px;display:flex;align-items:center;gap:8px;font-size:9px;color:#918d7e}.guide-shortcuts{display:flex;flex-direction:column;gap:8px;margin-top:22px}.guide-shortcuts button{padding:11px;border:1px solid #d8d1c2;background:transparent;color:#4b604c;text-align:left;font-size:10px}.guide-shortcuts button:hover{background:#e6e6d9}
.slide-in-enter-active,.slide-in-leave-active{transition:all .3s ease}.slide-in-enter-from,.slide-in-leave-to{opacity:0;transform:translateX(16px)}.guide-fade-enter-active,.guide-fade-leave-active{transition:opacity .2s}.guide-fade-enter-from,.guide-fade-leave-to{opacity:0}
@media(max-width:800px){.explorer-topbar{padding:0 16px;height:62px}.community-switcher{gap:2px}.switch-caption{display:none}.community-switcher button{font-size:9px;padding:7px 8px}.top-agent{padding:7px 9px;font-size:0}.top-agent svg{width:17px}.explorer-intro{padding:25px 18px 18px;display:block}.explorer-intro h1{font-size:29px}.explorer-intro p{font-size:10px}.intro-stats{margin-top:18px;justify-content:flex-start;gap:17px}.intro-stats span{text-align:left}.intro-stats b{font-size:18px}.world-frame{margin:0 10px;height:610px;min-height:0;border-radius:3px}.scene-topline{left:10px;right:10px;top:10px;align-items:flex-start;gap:6px}.scene-location{font-size:8px;padding:8px}.scene-hint{font-size:0;padding:9px}.scene-hint .live-pip{width:7px;height:7px}.scene-bottomline{left:10px;right:10px;bottom:10px}.scene-legend{gap:8px;padding:8px}.scene-legend span{font-size:7px}.scene-controls button{width:32px;height:32px}.building-panel,.product-panel{top:auto;bottom:54px;left:8px;right:8px;width:auto;max-width:none;max-height:48%;padding:13px}.panel-title-row h2{font-size:21px}.building-metrics{margin:10px 0;padding:9px 0}.listing-row{padding:7px 0}.listing-row img{width:44px;height:42px}.product-image{height:110px}.product-info{padding:8px 3px}.product-info h2{font-size:17px;margin:4px 0}.product-info p{margin:7px 0}.seller-line{padding:7px 0}.product-actions{margin-top:8px}.hover-card{display:none}.below-world{padding:30px 16px 0;display:block}.below-heading h2{font-size:22px}.want-grid{margin-top:16px;grid-template-columns:1fr}.scene-credit{right:12px;top:50px;font-size:6px}}
</style>
