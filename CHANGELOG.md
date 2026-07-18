# 更新日志

## v0.3.0 — 2026-07-18

### 🏠 炉火小屋：可行走的像素世界

**世界基础架构（World Foundation）**
- 新增 `world-content.cjs`：4 个区域、8 个节点、5 条边界的起始世界地图
  - 边境城镇（小屋 → 城镇广场 → 制图室）
  - 松风林（入口 → 倒下路牌 → 林间岔路）
  - 白石河谷（白石旧桥）
  - 旧望丘陵（旧望哨塔）
- 三层发现状态：`hidden` → `rumored` → `discovered`
- 数据库新增 6 张表：`player_profiles`、`content_versions`、`world_regions`、`world_nodes`、`world_edges`、`world_events`
- 老用户自动兼容：首次升级时自动创建玩家档案（`created_from_legacy` 标记）

**可走动的像素小屋（CottageScene）**
- WASD / 方向键移动主角，4 方向朝向
- PNG 精灵图渲染：主角 32×48、场景 320×180
- 物件碰撞检测 + 脚点系统（`cottage-scene.ts`）
- 靠近伙伴按 E/空格/回车交谈
- 交互热点：壁炉、书桌、宝箱、门
- 壁炉火光动画 + 场景暗角
- 常伴伙伴动态渲染，支持走近对话
- `SceneCompanion` 组件：根据主角位置转向

**页面重构**
- `App.tsx`：新增 `CottagePage`（炉火小屋）和 `HomePage`（旅程总览）分离
- 导航栏新增「旅程总览」入口
- `FocusController` 新增 `showLauncher` prop，小屋模式隐藏浮动按钮

### 🎨 美术体系初始化

**像素美术规范（ART_BIBLE.md）**
- 锁定 32×48 主角、32×32 伙伴、320×180 视口
- 32-40 色共享调色板
- 禁止抗锯齿，整数倍缩放
- GPT-Image 2 → 手工清理 → 资产检查的生产管线
- 首批生产切片：木地板、素墙、木梁、内墙角、门口

**临时资产**
- `player_idle_front_provisional_v1.png`：32×48 主角占位
- `cottage_room_backdrop_provisional_v1.png`：320×180 小屋背景
- `companion_chestnut_idle.png`：炉边小猎犬临时精灵

**资产工具链**
- 新增 `npm run art:validate` 命令
- 7 个构建脚本（tileset 草稿、结构测试、资产验证）
- `assets/art/manifest.json` 区分参考图与生产资产

### 📊 经验条

- 旅程总览页新增经验等级展示：圆形等级徽章 + 金色渐变进度条
- 数据来源已有 `dashboard.xp`，纯前端展示

### 📖 产品文档

- `docs/WORLD_BIBLE.md` — 世界圣经 v0.2（20 章完整设定）
- `docs/VERTICAL_SLICE.md` — 第一次远征垂直切片
- `docs/ART_BIBLE.md` — 像素美术规范 v0.2
- `docs/README.md` — 设计索引入口

### 🔧 其他改动

- `AiReportCard.tsx`：组件支持更多展示场景
- `HistoryPage.tsx`：时间线样式微调
- `PlanPage.tsx`：地图页交互优化
- 新增 `plan-world.css`、`pixel-ui.css`：模块化 CSS
- 测试扩增至 4 个文件 17 个用例（新增 `cottage-scene.test.ts`）
- `package.json`：新增 `art:validate` 脚本、`pixelorama` 相关脚本

---

## v0.0.2 — 2026-07-17

### 🎨 视觉修复
- 掉落物新增 8 个 SVG 图标，三处硬编码替换为 Icon 组件
- 精力选择器 CSS 修复，5 个按钮可正常点击
- 伙伴气泡移至左侧，不再被远征面板遮挡

### 🎮 功能新增
- AI 日报：支持 HTTP 代理 + OpenAI / DeepSeek 双提供商
- 伙伴消息队列：动态生成消息，8 秒自动切换
- 背包物品使用：面包 +10 羁绊、铜币 +5 XP、地图碎片 +10% 稀有概率

### ⚡ 性能优化
- 计时器 `requestAnimationFrame` 替代 `setInterval`，60fps 丝滑

### 🗄️ 数据库
- `settings` 表新增 `proxy_url`、`api_provider` 字段

---

## v0.0.1 — 2026-07-16

首次内测版本发布。Electron + React 19 + Vite + sql.js 本地优先架构，包含专注计时、三级学习地图、远征掉落、伙伴羁绊进化、日周复盘、9 项成就和 Windows DPAPI 加密。
