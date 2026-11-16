<script setup lang="ts">
import { computed, ref } from 'vue';
import { useCommunityStore } from './stores/community';
import NeighborhoodScene from './components/NeighborhoodScene.vue';
import { communities, communityById, wants, type Product } from './data/market';
import { MapPin, Sparkles, ArrowUpRight, X, Heart, MessageCircle, ChevronRight, Bot, MoveHorizontal, Plus } from 'lucide-vue-next';

const store = useCommunityStore();
const selected = ref<Product | null>(null);
const guideOpen = ref(false);
const query = ref('');
const answer = ref('');
const activeCategory = ref('全部');
const dragging = ref(false);
const dragStart = ref(0);
const dragOffset = ref(0);
const pointerX = ref(0);
const pointerY = ref(0);
const categories = ['全部', '家具家居', '家用电器', '母婴玩具', '运动户外'];
const visibleProducts = computed(() => store.recommendedProducts.filter(p => activeCategory.value === '全部' || p.category === activeCategory.value));
const grouped = computed(() => {
  const map = new Map<string, Product[]>();
  visibleProducts.value.forEach(p => map.set(p.category, [...(map.get(p.category) || []), p]));
  return [...map.entries()].map(([name, items]) => ({ name, items }));
});
const currentWants = computed(() => wants.filter(w => w.community_id === store.activeId));
const otherCommunities = computed(() => communities.filter(c => c.status === 'open' && c.id !== store.activeId));
const sourceName = (id: string) => communityById(id).name;
function setMode(mode: 'local'|'nearby'|'all') { store.mode = mode; }
function chooseCommunity(id: string) { store.switchCommunity(id); selected.value = null; answer.value = ''; }
function onPointerDown(e: PointerEvent) { dragging.value = true; dragStart.value = e.clientX - dragOffset.value; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }
function onPointerMove(e: PointerEvent) { pointerX.value = (e.clientX / window.innerWidth - .5) * 2; pointerY.value = (e.clientY / window.innerHeight - .5) * 2; if (dragging.value) dragOffset.value = Math.max(-180, Math.min(180, e.clientX - dragStart.value)); }
function onPointerUp() { dragging.value = false; }
function askGuide() {
  const q = query.value.trim(); if (!q) return;
  const hits = store.recommendedProducts.filter(p => p.title.includes(q) || p.category.includes(q) || (q.includes('冰箱') && p.title.includes('冰箱')));
  answer.value = hits.length ? '我帮你问到了：' + hits.map(p => p.title + '，' + sourceName(p.community_id) + '，' + p.price + '元').join('；') : '这附近暂时没找到完全匹配的。我先记下你的需求，附近有邻居发布时再帮你留意。';
}
</script>

<template>
<div class="market-world" :class="['scene-'+store.active.scene, {'is-switching':store.switching}]" @pointermove="onPointerMove" @pointerup="onPointerUp" @pointercancel="onPointerUp">
  <div class="world-grain"></div>
  <header class="world-top">
    <a class="wordmark" href="#"><span class="seal">拾</span><span><b>次渠·拾光集市</b><small>把好物，留在邻里之间</small></span></a>
    <div class="top-location"><span class="pulse"></span>正在营业 <i></i><MapPin :size="13"/>{{store.active.name}}</div>
    <button class="publish-entry" @click="guideOpen=true"><Plus :size="16"/>把闲置带来</button>
  </header>

  <main class="world-main">
    <section class="street-intro">
      <div class="intro-kicker"><span>NEIGHBORHOOD · SECOND LIFE</span><span>北京 / 通州 / 次渠</span></div>
      <h1>今天，<em>逛点</em><br/>不一样的。</h1>
      <p>街坊的好物正在等下一位主人。<br/>慢慢逛，遇见喜欢的就带走。</p>
      <div class="intro-bottom"><span class="weather-mark">☀</span><span>邻里好物循环中</span><b>{{store.localProducts.length + 18}} 件</b><small>正在这个社区流转</small></div>
    </section>

    <NeighborhoodScene :key="store.activeId" :products="visibleProducts" :community-name="store.active.name" :scene="store.active.scene" :accent="store.active.accent" @select="selected=$event" />

    <div class="explore-bar">
      <div class="explore-copy"><span class="live-dot"></span><b>今天的邻里摊位</b><small>点一件物品，看看它的故事</small></div>
      <div class="category-orbit"><button v-for="c in categories" :key="c" :class="{chosen:activeCategory===c}" @click="activeCategory=c">{{c}}</button></div>
    </div>

    <section class="discovery-strip">
      <div class="discovery-title"><span>GOOD THINGS, CLOSE BY</span><h2>附近正在发生的事</h2><p>不是推荐算法里的陌生商品，是隔壁楼里真实的生活。</p></div>
      <div class="discovery-items">
        <button v-for="p in visibleProducts.slice(0,3)" :key="p.id" class="discovery-item" @click="selected=p">
          <img :src="p.image" :alt="p.title"/><span><small>{{sourceName(p.community_id)}} · {{p.postedAt}}</small><b>{{p.title}}</b><strong>¥{{p.price}}</strong></span><ArrowUpRight :size="17"/>
        </button>
      </div>
    </section>
  </main>

  <footer class="world-footer">
    <div><span class="footer-seal">拾</span><b>把好物留在邻里之间</b></div>
    <div class="community-portals"><span>去另一个社区看看</span><button v-for="c in otherCommunities" :key="c.id" @click="chooseCommunity(c.id)"><i :style="{background:c.accent}"></i>{{c.name}}<ArrowUpRight :size="13"/></button><span class="coming">中关村 · 敬请期待</span></div>
    <button class="guide-float" @click="guideOpen=!guideOpen"><span class="guide-avatar"><Bot :size="22"/></span><span><b>小拾在这儿</b><small>帮你找、帮你问、帮你牵线</small></span><Sparkles :size="17"/></button>
  </footer>

  <Transition name="detail">
    <div v-if="selected" class="detail-backdrop" @click.self="selected=null">
      <article class="detail-panel"><button class="close-detail" @click="selected=null"><X :size="19"/></button><div class="detail-photo"><img :src="selected.image" :alt="selected.title"/><span>{{selected.condition}}</span></div><div class="detail-content"><small>{{sourceName(selected.community_id)}} · {{selected.seller}}</small><h2>{{selected.title}}</h2><div class="detail-price">¥{{selected.price}} <del v-if="selected.originalPrice">原价 ¥{{selected.originalPrice}}</del></div><p>{{selected.description}}</p><div class="detail-note"><MapPin :size="15"/>同小区优先当面看货，交易更安心</div><button class="contact-neighbor" @click="guideOpen=true;selected=null"><MessageCircle :size="17"/>让小拾帮我联系邻居</button></div></article>
    </div>
  </Transition>

  <Transition name="guide">
    <aside v-if="guideOpen" class="guide-panel"><div class="guide-head"><span class="guide-avatar"><Bot :size="20"/></span><div><b>小拾 · 邻里向导</b><small><span class="live-dot"></span> 正在集市里帮忙</small></div><button @click="guideOpen=false"><X :size="18"/></button></div><div class="guide-welcome">嗨，我在{{store.active.name}}逛着呢。<br/>你想找什么，或者想把什么转给邻居？</div><div class="guide-scopes"><button v-for="m in [{id:'local',name:'本社区'},{id:'nearby',name:'附近社区'},{id:'all',name:'全部开放社区'}]" :key="m.id" :class="{active:store.mode===m.id}" @click="setMode(m.id as 'local'|'nearby'|'all')">{{m.name}}</button></div><div v-if="answer" class="guide-answer">{{answer}}</div><div class="guide-input"><input v-model="query" placeholder="比如：帮我找个小冰箱" @keydown.enter="askGuide"/><button @click="askGuide"><ArrowUpRight :size="18"/></button></div><small class="guide-disclaimer">AI 演示助手 · 当前展示模拟数据</small></aside>
  </Transition>
</div>
</template>