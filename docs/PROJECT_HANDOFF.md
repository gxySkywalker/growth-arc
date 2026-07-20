# 成长轨迹 (Growth Arc) — 项目交接文档 v0.3.0

> 日期：2026-07-21

---

## 1. 项目概况

**项目名称**：成长轨迹 (Growth Arc)  
**技术栈**：Electron + React 19 + TypeScript + Vite + sql.js (WASM SQLite)  
**当前版本**：v0.3.0 — 灯火与星轨：邮局与天文台  
**定位**：本地优先、单用户的游戏化学习系统。用户在日常学习的同时与一个温暖的中世纪边境世界共同生活。每次真实专注都会让世界永久向前生长。

**核心循环**：开始远征 → 专注计时 → 返程结算 → 获得奖励 → 查看天文台与编年史 → 天使邮局收信。

---

## 2. 当前已完成系统

### 2.1 炉火小屋 (Cottage)

- WASD/方向键走动，主角 32×48 px sprite
- 碰撞检测、脚点系统、场景交互（壁炉/书桌/宝箱/门）
- 常伴伙伴动态渲染 + 交谈
- 位置：`src/pages/CottagePage.tsx`、`src/components/CottageScene.tsx`、`src/components/SceneCompanion.tsx`
- 美术：`assets/art/environments/cottage/`（木地板、素墙、木梁、内墙角、门口）

### 2.2 远征系统 (Expedition)

- 开始远征 → 专注计时（可暂停/恢复/heartbeat 30s）→ 返程清点 → 远征归来结算
- 多路标结算：主要路标 + 沿途路标（`session_task_links` 表）
- 沿途经验递减（10→8→6→4→2），单场上限 30 XP
- 5 分钟有效专注门槛；不足 5 分钟保留记录不追加经验
- 远征归来弹窗：普通结算紧凑一屏，特殊结果才滚动
- 空手返回确认：应用内像素弹窗（非浏览器 confirm）
- 远征类型：brief (0-59s) / short (60-299s) / expedition (300-1799s) / deep (≥1800s)
- reason 持久化：`session_task_links.reason` 列（awarded/short_session/already_awarded/xp_cap_reached）
- 位置：`src/components/FocusController.tsx`、`electron/database.cjs`、`electron/game.cjs`

### 2.3 天使邮局 (Post Office)

- 独立页面，侧栏入口「天使邮局」
- 三层结构：地点头部 → 木格信匣（左 270px）→ 展开信纸（右）
- 信件类型：daily/weekly/festival/memorial/world
- 已读/未读状态（蜡封完整/破裂 + 信封打开/闭合）
- 交互模式：note（笔记）/ memory（纪念）/ reply（回信）/ none
- 信封使用真实 PNG 资源（`assets/art/mail/`）：mail_unread/mail_read/mail_reply/mail_special
- Hover 摇摆动画（±2.5deg, 600ms），点击打开动画（450ms）
- 状态持久化：sessionStorage（prototype-only，接入正式 IPC 后删除）
- 新到来信快照机制（阅读后不立即移除，离开分类后刷新）
- 位置：`src/pages/PostOfficePage.tsx`、`src/lib/mailMock.ts`、`src/world.css`

### 2.4 天文台 (Observatory)

- 独立页面，侧栏入口「天文台」
- 日/周双视图切换
- 日视图：Hero 总时长 + 今日足迹时间线 + 旅途方向 + 24 小时星图 + 观测册
- 周视图：Hero 周总时长 + 趋势文案 + 7×24 星轨热力图 + 七日总量柱图 + 旅途方向 + 本周足迹
- ECharts 渲染三张图表（按需引入，Canvas renderer）
- 星象札记：纯函数根据数据生成客观观察文案
- 观测册：可选的每日观测札记（win/energy/blocker/futureNote）
- 历史日期导航（前后箭头 + 回到今天/本周）
- 位置：`src/pages/ObservatoryPage.tsx`、`src/lib/observatory.ts`、`src/lib/observatoryCharts.ts`、`src/lib/observatoryInsights.ts`、`src/components/ObsChart.tsx`

### 2.5 制图室 (PlanPage)

- 三级结构：旅途方向 → 路线阶段 → 路标
- 拖拽排序、12 色拾色器、右键菜单
- 领域/目标/任务 CRUD（编辑/归档/删除/恢复）
- "学习领域"→"旅途方向"（v0.2 统一）

### 2.6 信件系统基础设施

- `letters` 表 + CRUD + 已读/未读 + 回信
- `ensurePeriodicLetters` 补发框架
- 本地模板引擎（`src/lib/domain.cjs`）
- `mail:*` IPC 8 个 handler
- 位置：`electron/database.cjs`、`electron/domain.cjs`、`electron/main.cjs`

### 2.7 其他系统

- 旅途编年史（HistoryPage）：按日期分组、展开档案、掉落展示、沿途原因
- 伙伴营地（GrowthPage）：图鉴、羁绊、进化
- 天使来信/复盘（ReviewPage）：旧页面，已废弃，路由映射到 ObservatoryPage
- 旅程总览（HomePage）：今日快照、经验条、背包
- 侧栏导航：炉火小屋 · 旅程总览 · 制图室 · 伙伴营地 · 旅途编年史 · 天文台 · 天使邮局 · 设置

---

## 3. 最近版本：v0.3.0

**35 个文件变动，+5107/-29 行。** 主要新增：

| 分类 | 新增文件 |
|------|---------|
| 邮局页面 | `src/pages/PostOfficePage.tsx`、`src/lib/mailMock.ts` |
| 天文台页面 | `src/pages/ObservatoryPage.tsx`、`src/lib/observatory.ts`、`src/lib/observatoryCharts.ts`、`src/lib/observatoryInsights.ts` |
| ECharts | `src/components/ObsChart.tsx`（React 封装，含 lifecycle/resize/reduced-motion） |
| 信封资产 | `assets/art/mail/mail_unread.png`、`mail_read.png`、`mail_reply.png`、`mail_special.png` |
| 设计文档 | `docs/ANGEL_POST_OFFICE_PROPOSAL.md`、`docs/ANGEL_POST_OFFICE_VISUAL_BLUEPRINT.md`、`docs/ANGEL_POST_OFFICE_STATIC_PROTOTYPE.md`、`docs/ANGEL_POST_OFFICE_ASSET_PROMPTS.md`、`docs/TIME_AND_MAIL_SYSTEM.md` |
| 后端扩展 | `electron/domain.cjs`（+period tools, templates, facts builders, hourly computation） |

---

## 4. 当前代码架构

```
src/
  pages/          页面组件（CottagePage, HomePage, PlanPage, HistoryPage, ReviewPage, GrowthPage, SettingsPage, ObservatoryPage, PostOfficePage）
  components/     通用组件（FocusController, Modal, Icon, PixelCompanion, ObsChart, ItemTooltip, AiReportCard, CottageScene, SceneCompanion）
  lib/            前端纯函数（format, observatory, observatoryCharts, observatoryInsights, mailMock, audio, item-lore）
  context/        React Context（AppContext）
  *.css           样式（styles.css, focus.css, world.css, pixel-ui.css, plan-world.css, cottage-scene.css）

electron/
  main.cjs        Electron 主进程，IPC handler 注册
  preload.cjs     contextBridge API
  database.cjs    sql.js 数据库（CRUD, migration, letters, mail）
  domain.cjs      纯函数（XP, dates, letters, stats, hourly computation）
  game.cjs        游戏系统（expedition roll, companions, loot）

assets/
  art/            像素美术资源（characters, environments, mail, drafts, prompts, reference, specs）
  audio/          音频文件（bgm: cottage.mp3, expedition.mp3）
  fonts/          像素字体（Fusion Pixel SC）
```

**关键约束**：
- 无 router：页面切换为 `useState<PageId>` in AppShell
- CommonJS in Electron，ESM in Vite
- sql.js WASM 运行时需 `asarUnpack`
- API Key 使用 Windows DPAPI 加密存储
- 数据库 migration 使用 `PRAGMA table_info` 检测列存在性（无版本号）
- 所有 chart memo 仅依赖数据对象 `[daily]`/`[weekly]`，不依赖 cursor
- ObsChart 使用 `key={cursor}` 强制 remount 避免 ECharts 状态残留

---

## 5. 最近修复的问题

| 问题 | 状态 | 可能遗留风险 |
|------|:---:|------|
| 天文台日期切换后图表空白 | ✅ 已修复（memo 改为纯数据依赖 + chart key） | 极端快速连续切换未充分测试 |
| 信封 CSS 绘制的蜡封不可辨识 | ✅ 已修复（替换为真实 PNG） | 节庆信封 assets 尚未生成 |
| 邮局数据分类不一致（新到信 category='new'） | ✅ 已修复（改为 'daily'/'weekly'，'new' 仅为视图过滤） | — |
| 时区导致小时分布数据异常 | ✅ 已修复（cursor 裁剪到 period 边界） | — |
| goToday 后图表空白 | ✅ 已修复（async 竞态保护 + chart key） | — |
| ECharts 生命周期旧数据残留 | ✅ 已修复（key remount） | — |

---

## 6. 当前不要修改的部分

- **数据库 schema**：letters 表、session_task_links、focus_sessions 等均已稳定
- **IPC 管线**：mail:* 和 observatory:* handler 已就绪
- **信件生成**：ensurePeriodicLetters、ensureLetterForPeriod 已稳定
- **天文台统计口径**：completed-only、sessionCounts、hourly computation
- **Sidebar/导航**：8 项导航结构已确定（天文台 + 邮局均为独立入口）
- **像素字体**：Fusion Pixel SC 已集成，不要更换
- **图表配色**：星光蓝 #8FBCCC + 黄铜 #C39755 + 深蓝灰背景 #283342

---

## 7. 下一阶段开发建议

### P0（阻塞）
- 生成 Asset Pack 01 PNG（邮局基础环境、信封、小天使）替换 CSS 占位
- 将邮局静态原型接入正式 mail:* IPC（替换 mock 数据）

### P1（重要）
- 实现归灯节四阶段节庆系统（纯函数 + 日期规则 + phase overlay）
- 实现春节日期表（2026-2040 公历离线表）
- 小天使 CSS sprite 动画（idle/sorting/stamping 三态）
- 邮局 header 真实背景替换

### P2（后续）
- AI 信件润色（需用户授权，默认关闭）
- 月度/年度信 UI
- 居民信件系统（依赖 NPC 系统）
- 礼物附件系统
- Canvas/Pixi 场景动画评估

---

## 8. 新 Claude Code 会话启动提示

```
加载项目成长轨迹 (Growth Arc)。Electron + React 19 + Vite + sql.js，当前 v0.3.0。
运行: npm run dev (开发), npm test (125+ tests), npm run build (构建)。
请阅读 CLAUDE.md 和 docs/ 下的设计文档。
当前正在开发天使邮局与天文台。邮局页面为静态原型（mock 数据 + sessionStorage），
天文台图表使用 ECharts 按需引入。信封使用 assets/art/mail/ 下真实 PNG。
不要修改数据库 schema、IPC 管线、导航结构、像素字体和图表配色方案。
修改前请先运行 npm test 和 npm run build 确认基线通过。
```
