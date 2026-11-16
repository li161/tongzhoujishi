# 次渠·拾光集市

多社区二手交易网络（MVP）。首期开放次渠嘉园、次渠锦园；中关村仅作为待开放社区配置。

## 技术栈

- Vue 3 + TypeScript + Vite
- Pinia + Vue Router
- Three.js-ready community scene layer (CSS 3D scene in MVP)
- PostgreSQL schema and API contract under `database/` and `docs/`

## 本地运行

```bash
npm install
npm run dev
npm run typecheck
npm run build
```

## 当前边界

前端使用明确标记的演示数据；交易、身份、消息和 LLM Agent 后端需要接入真实 API 后才可用于真实交易。跨社区检索会保留 `community_id` 和来源社区，不会把演示数据伪装成真实库存。
