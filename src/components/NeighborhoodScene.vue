<script setup lang="ts">
import type { Product } from '../data/market';

defineProps<{
  products: Product[];
  communityName: string;
  scene: string;
  accent: string;
}>();

const emit = defineEmits<{ select: [product: Product] }>();
const photo = 'https://commons.wikimedia.org/wiki/Special:FilePath/%E4%B9%8C%E9%95%87%E5%B0%8F%E5%B7%B7.JPG?width=2400';
</script>

<template>
  <section class="oldtown-market" aria-label="古镇小街邻里旧物集市">
    <img class="oldtown-photo" :src="photo" alt="乌镇传统石板巷道实景，白墙黛瓦与木质沿街店铺" />
    <div class="photo-shade"></div>
    <div class="oldtown-topline">
      <span class="location-stamp">拾光集 · 今日开街</span>
      <span class="street-name">{{ communityName }} · 巷口旧物街</span>
    </div>
    <div class="hanging-sign">
      <span>邻里旧物</span>
      <small>好物寻新主</small>
    </div>
    <div class="market-story">
      <span class="story-kicker">A LITTLE STREET, A SECOND LIFE</span>
      <strong>慢慢逛，<br />总能遇见<br /><em>合适的旧物。</em></strong>
      <small>街坊自发摆摊 · 同社区优先面交</small>
    </div>
    <div class="street-products">
      <button
        v-for="(product, index) in products.slice(0, 4)"
        :key="product.id"
        class="street-product"
        :class="'product-' + index"
        @click="emit('select', product)"
      >
        <span class="product-photo"><img :src="product.image" :alt="product.title" /></span>
        <span class="product-paper">
          <small>{{ product.category }}</small>
          <b>{{ product.title }}</b>
          <strong>¥{{ product.price }}</strong>
        </span>
      </button>
      <div v-if="!products.length" class="empty-stall">这条巷子还在等第一位邻居来摆摊</div>
    </div>
    <div class="street-caption">
      <span class="caption-dot"></span>
      <b>正在逛：{{ communityName }}</b>
      <i></i>
      <small>点击巷边旧物，查看邻居发布详情</small>
    </div>
    <a class="photo-credit" href="https://commons.wikimedia.org/wiki/File:%E4%B9%8C%E9%95%87%E5%B0%8F%E5%B7%B7.JPG" target="_blank" rel="noreferrer">场景实景照片：乌镇小巷 · Gisling / Wikimedia Commons · CC BY-SA 3.0</a>
  </section>
</template>

<style scoped>
.oldtown-market{height:570px;position:relative;overflow:hidden;isolation:isolate;background:#5c5141;border:1px solid #b9aa8e;box-shadow:0 24px 60px #30271935;color:#fff8e9}
.oldtown-photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 53%;filter:saturate(.78) contrast(1.04) brightness(.82);transform:scale(1.015)}
.photo-shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(23,25,21,.78) 0%,rgba(29,28,23,.43) 31%,rgba(35,29,21,.04) 64%),linear-gradient(0deg,rgba(25,22,18,.68),transparent 35%,rgba(25,22,18,.14));pointer-events:none}
.oldtown-topline{position:absolute;left:24px;right:24px;top:20px;display:flex;justify-content:space-between;align-items:center;z-index:2;font-size:10px;letter-spacing:1px}
.location-stamp{padding:8px 12px;background:#382d24d9;border:1px solid #d9c7a266;color:#f2dfbb}
.street-name{color:#f7ead4;text-shadow:0 1px 5px #201a14}
.hanging-sign{position:absolute;top:100px;right:7%;width:76px;padding:14px 8px 12px;background:#883f2d;border:4px double #d9b77f;box-shadow:5px 8px 12px #21180f55;display:flex;flex-direction:column;align-items:center;gap:8px;transform:rotate(2deg);z-index:2}
.hanging-sign:before{content:'';position:absolute;width:2px;height:48px;background:#453226;top:-48px;left:50%}
.hanging-sign span{font-family:serif;font-size:22px;writing-mode:vertical-rl;letter-spacing:4px}
.hanging-sign small{font-size:8px;letter-spacing:1px;color:#f2d8a8}
.market-story{position:absolute;z-index:2;left:5.2%;top:112px;display:flex;flex-direction:column;align-items:flex-start;text-shadow:0 2px 12px #17140f}
.story-kicker{font-size:8px;letter-spacing:2.2px;color:#e5c99b;margin-bottom:17px}
.market-story strong{font-family:'Noto Serif SC','Songti SC',serif;font-size:clamp(30px,4vw,49px);line-height:1.2;letter-spacing:2px;font-weight:600}
.market-story em{font-style:normal;color:#e9bd83}
.market-story>small{font-size:10px;color:#eadfc9;margin-top:19px;letter-spacing:1px}
.street-products{position:absolute;z-index:3;left:30%;right:7%;bottom:65px;height:190px;display:flex;align-items:flex-end;justify-content:center;gap:clamp(8px,2vw,24px);perspective:900px}
.street-product{width:clamp(112px,14vw,164px);min-width:0;padding:0;border:0;background:transparent;color:#382d22;text-align:left;display:flex;flex-direction:column;align-items:center;filter:drop-shadow(4px 10px 8px #1c171144);transition:transform .28s ease,filter .28s ease;cursor:pointer}
.street-product:hover{transform:translateY(-13px) rotate(-1.5deg) scale(1.04);filter:drop-shadow(8px 18px 12px #1c171166);z-index:5}
.product-photo{height:100px;width:100%;padding:6px 6px 0;background:#a17b51;border:1px solid #ddc49b;box-shadow:inset 0 0 0 2px #715237;display:block}
.product-photo img{width:100%;height:100%;object-fit:cover;display:block;filter:saturate(.78) sepia(.08)}
.product-paper{width:100%;min-height:72px;padding:8px 9px;background:#eee0c2;border:1px solid #c5a77b;box-shadow:inset 0 0 0 2px #f8edda;display:flex;flex-direction:column;gap:3px}
.product-paper small{font-size:8px;color:#8a6b47}
.product-paper b{font-family:'Noto Serif SC','Songti SC',serif;font-size:11px;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.product-paper strong{font-family:serif;font-size:16px;color:#9c422c}
.product-1{transform:translateY(-13px) rotate(1.4deg)}
.product-2{transform:translateY(-3px) rotate(-1deg)}
.product-3{transform:translateY(-18px) rotate(1deg)}
.product-1:hover,.product-2:hover,.product-3:hover{transform:translateY(-26px) rotate(0) scale(1.04)}
.empty-stall{align-self:center;padding:14px 18px;background:#eee0c2;color:#5e4b35;font-size:11px;border:1px solid #c5a77b}
.street-caption{position:absolute;z-index:3;left:24px;right:24px;bottom:20px;display:flex;align-items:center;gap:9px;font-size:10px;color:#f7eddb}
.street-caption b{font-size:11px}
.street-caption i{height:13px;width:1px;background:#e9d9bd88;margin:0 4px}
.street-caption small{color:#e3d6c2}
.caption-dot{width:7px;height:7px;background:#b6c18b;border-radius:50%;box-shadow:0 0 0 4px #b6c18b2b}
.photo-credit{position:absolute;z-index:4;right:12px;top:62px;font-size:8px;color:#f6e7cfaa;text-decoration:none;text-shadow:0 1px 4px #21170f;max-width:190px;text-align:right}
.photo-credit:hover{color:#fff}
@media(max-width:760px){.oldtown-market{height:520px}.oldtown-photo{object-position:48% center}.photo-shade{background:linear-gradient(90deg,#1d1b17b8,transparent 95%),linear-gradient(0deg,#211b16b8,transparent 55%)}.oldtown-topline{left:12px;right:12px;top:12px}.street-name{font-size:9px}.market-story{left:6%;top:88px}.market-story strong{font-size:32px}.market-story>small{font-size:9px}.hanging-sign{right:5%;top:90px;transform:scale(.82)}.street-products{left:4%;right:4%;bottom:68px;height:145px;gap:7px}.street-product{width:24%;}.product-photo{height:74px;padding:4px 4px 0}.product-paper{min-height:62px;padding:6px}.product-paper b{font-size:9px}.product-paper strong{font-size:13px}.street-caption{left:12px;right:12px;bottom:12px;gap:6px}.street-caption small{font-size:8px}.photo-credit{right:10px;top:auto;bottom:47px;max-width:150px;font-size:7px}}
</style>