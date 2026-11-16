<script setup lang="ts">
import type { Product } from '../data/market';

defineProps<{
  products: Product[];
  communityName: string;
  scene: string;
  accent: string;
}>();

const emit = defineEmits<{ select: [product: Product] }>();
const streetPhoto = 'https://commons.wikimedia.org/wiki/Special:FilePath/Hutong_2021.jpg?width=2200';
</script>

<template>
  <section class="lane-market" aria-label="邻里老街旧物集市">
    <img class="lane-photo" :src="streetPhoto" alt="北京胡同日常街巷实景，一位居民骑电动车经过" />
    <div class="lane-atmosphere"></div>

    <div class="lane-header">
      <span class="lane-brand"><b>拾光集</b><i>邻里旧物交换日</i></span>
      <span class="lane-location">{{ communityName }} · 巷口这一段</span>
    </div>

    <div class="lane-side-note">
      <span>今天有人拿来了</span>
      <strong>一些用得上的旧东西</strong>
      <small>不赶时间，路过可以看看</small>
    </div>

    <div class="stall-front">
      <div class="stall-awning"><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
      <div class="stall-table">
        <div class="table-edge"></div>
        <button
          v-for="(product, index) in products.slice(0, 4)"
          :key="product.id"
          class="loose-good"
          :class="'good-' + index"
          @click="emit('select', product)"
        >
          <span class="good-image"><img :src="product.image" :alt="product.title" /></span>
          <span class="good-tag"><b>{{ product.title }}</b><i>¥{{ product.price }}</i></span>
        </button>
        <div v-if="!products.length" class="stall-empty">今天还没有邻居来摆摊</div>
      </div>
      <div class="stall-crates"><i></i><i></i><i></i></div>
      <div class="stall-ground-note">街坊自用闲置 · 看中可当面聊</div>
    </div>

    <div class="lane-footer">
      <span class="green-dot"></span>
      <b>{{ communityName }}</b>
      <span>今天的邻里小集</span>
      <small>点选桌上的物品，查看发布信息</small>
    </div>

    <a class="photo-source" href="https://commons.wikimedia.org/wiki/File:Hutong_2021.jpg" target="_blank" rel="noreferrer">街巷实景：Sandykkzk / Wikimedia Commons · CC BY-SA 4.0</a>
  </section>
</template>

<style scoped>
.lane-market{height:570px;position:relative;overflow:hidden;isolation:isolate;background:#777064;color:#f6f0e4;border:1px solid #b9b09e;box-shadow:0 22px 52px #3c352822}
.lane-photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 52%;filter:brightness(.86) saturate(.78) contrast(1.04);transform:scale(1.01)}
.lane-atmosphere{position:absolute;inset:0;background:linear-gradient(90deg,#171a17b8 0%,#22241d55 33%,transparent 68%),linear-gradient(0deg,#171915d9 0%,#17191518 34%,#17191520 100%);pointer-events:none}
.lane-header{position:absolute;z-index:2;top:18px;left:22px;right:22px;display:flex;justify-content:space-between;align-items:center}
.lane-brand{display:flex;align-items:center;gap:10px;text-shadow:0 1px 5px #17130e}
.lane-brand b{font-family:'Noto Serif SC','Songti SC',serif;font-size:18px;letter-spacing:2px}
.lane-brand i{font-style:normal;font-size:10px;color:#e4d8c2;border-left:1px solid #eee0c277;padding-left:10px}
.lane-location{font-size:10px;letter-spacing:1px;color:#f1e7d5;text-shadow:0 1px 5px #17130e}
.lane-side-note{position:absolute;z-index:2;left:5%;top:110px;display:flex;flex-direction:column;gap:9px;text-shadow:0 2px 9px #181510}
.lane-side-note span{font-size:10px;letter-spacing:2px;color:#e2cba4}
.lane-side-note strong{font-family:'Noto Serif SC','Songti SC',serif;font-size:clamp(22px,3vw,36px);font-weight:600;letter-spacing:1px}
.lane-side-note small{font-size:10px;color:#e6ddcc}
.stall-front{position:absolute;z-index:3;left:31%;right:7%;bottom:53px;height:255px;filter:drop-shadow(3px 12px 12px #19150f55)}
.stall-awning{position:absolute;left:-2%;right:-2%;top:0;height:36px;background:#6c4937;border:1px solid #b08a62;display:flex;overflow:hidden;box-shadow:0 5px 10px #1b171255}
.stall-awning span{flex:1;border-right:1px solid #d4b58b55;background:repeating-linear-gradient(135deg,#8b6046 0 12px,#744c39 12px 24px)}
.stall-awning span:nth-child(2n){background:repeating-linear-gradient(135deg,#d0b58a 0 12px,#b99a70 12px 24px)}
.stall-table{position:absolute;top:36px;left:0;right:0;height:173px;background:linear-gradient(180deg,#75543b,#4b382b);border:1px solid #a17a53;display:flex;align-items:flex-end;justify-content:space-evenly;padding:16px 10px 18px;gap:10px}
.table-edge{position:absolute;left:0;right:0;bottom:0;height:13px;background:repeating-linear-gradient(90deg,#523c2c 0 45px,#694a34 45px 48px);border-top:2px solid #a17a53}
.loose-good{position:relative;z-index:1;flex:1;max-width:155px;min-width:0;height:140px;padding:0;border:0;background:transparent;display:flex;flex-direction:column;justify-content:flex-end;align-items:stretch;cursor:pointer;transition:transform .22s ease}
.loose-good:hover{transform:translateY(-9px) rotate(-1deg)}
.good-image{height:103px;padding:4px;background:#d8c9aa;border:1px solid #8d7454;box-shadow:0 3px 7px #1d160f55;display:block}
.good-image img{width:100%;height:100%;display:block;object-fit:cover;filter:saturate(.78) contrast(1.02)}
.good-tag{min-height:31px;background:#eee2c9;color:#47372a;display:flex;align-items:center;justify-content:space-between;gap:4px;padding:5px 7px;text-align:left}
.good-tag b{font-family:'Noto Serif SC','Songti SC',serif;font-size:9px;font-weight:600;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.good-tag i{font-style:normal;font-size:11px;font-weight:700;color:#a04c32;white-space:nowrap}
.good-1{transform:translateY(-8px) rotate(2deg)}
.good-2{transform:translateY(-2px) rotate(-2deg)}
.good-3{transform:translateY(-11px) rotate(1deg)}
.stall-crates{position:absolute;left:8%;right:7%;bottom:0;height:42px;display:flex;gap:8px;align-items:flex-end}
.stall-crates i{display:block;flex:1;height:36px;border:3px solid #76563a;background:repeating-linear-gradient(0deg,#a77b4e 0 8px,#805b3b 8px 11px);box-shadow:inset 0 0 0 2px #c29a6d}
.stall-crates i:nth-child(2){height:27px;flex:.8}
.stall-ground-note{position:absolute;right:0;bottom:-23px;font-size:9px;color:#f1e7d7;text-shadow:0 1px 4px #17130e}
.stall-empty{align-self:center;margin:auto;padding:12px 18px;background:#e8dcc2;color:#584631;font-size:11px}
.lane-footer{position:absolute;z-index:4;left:22px;bottom:18px;display:flex;align-items:center;gap:9px;color:#f3e9d8;font-size:10px;text-shadow:0 1px 4px #17130e}
.lane-footer b{font-size:11px}
.lane-footer>span:nth-of-type(2){padding-left:9px;border-left:1px solid #f0e5d077}
.lane-footer small{color:#e0d4c1}
.green-dot{width:7px;height:7px;border-radius:50%;background:#b8c38d;box-shadow:0 0 0 4px #b8c38d33}
.photo-source{position:absolute;z-index:5;right:12px;bottom:18px;font-size:8px;color:#e8ddc9;text-decoration:none;text-shadow:0 1px 4px #17130e}
.photo-source:hover{color:white}
@media(max-width:760px){.lane-market{height:510px}.lane-photo{object-position:52% center}.lane-atmosphere{background:linear-gradient(90deg,#171a17a8,transparent 100%),linear-gradient(0deg,#171915ed 0%,transparent 58%)}.lane-header{left:12px;right:12px;top:12px}.lane-brand b{font-size:15px}.lane-brand i{font-size:8px}.lane-location{font-size:8px}.lane-side-note{left:5%;top:82px}.lane-side-note strong{font-size:23px}.stall-front{left:4%;right:4%;bottom:62px;height:205px}.stall-awning{height:27px}.stall-table{top:27px;height:143px;padding:12px 5px 15px;gap:5px}.loose-good{height:115px}.good-image{height:82px;padding:3px}.good-tag{padding:4px;min-height:29px}.good-tag b{font-size:8px}.good-tag i{font-size:10px}.stall-crates{height:34px}.stall-crates i{height:30px}.stall-crates i:nth-child(2){height:23px}.lane-footer{left:12px;bottom:12px;gap:6px}.lane-footer small{font-size:8px}.photo-source{right:10px;bottom:13px;font-size:7px;max-width:120px;text-align:right}}
</style>