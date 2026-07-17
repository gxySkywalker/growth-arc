# 更新日志

## v0.0.2 — 2026-07-17

### 🎨 视觉修复

**掉落物图标**
- 新增 8 个 SVG 物品图标：coin、map、herb、bread、gem、star、bell、scale
- HomePage 小屋收藏、GrowthPage 远征收藏、FocusController 远征结算三处硬编码文本（✦/◆/▰）替换为 `<Icon>` 组件
- 稀有物品图标使用金色（`--gold`），普通物品使用铜色，视觉区分
- 涉及文件：`src/components/Icon.tsx`、`src/pages/HomePage.tsx`、`src/pages/GrowthPage.tsx`、`src/components/FocusController.tsx`

**精力选择器修复**
- `.energy-picker` 新增 CSS：5 个按钮横向排列，60×52px 可点击区域
- hover 浮起变亮，选中态使用 `--accent` 强调色带按压阴影
- 涉及文件：`src/world.css`

**伙伴气泡左移**
- 气泡从伙伴右侧移至左侧（`left: -215px`），与远征面板物理隔离
- 气泡尾巴箭头方向翻转指向右边伙伴
- 涉及文件：`src/styles.css`

### 🎮 功能新增

**AI 日报 — 代理支持 + 双提供商**
- 新增代理设置：`main.cjs` 使用 `undici.ProxyAgent` 支持 HTTP 代理
- 新增 API 提供商选择：OpenAI / DeepSeek
  - OpenAI 路径：Responses API + json_schema 结构化输出
  - DeepSeek 路径：Chat Completions API + json_object 模式
- 切换提供商时自动更新默认模型
- 涉及文件：`electron/main.cjs`、`electron/database.cjs`、`src/pages/SettingsPage.tsx`

**伙伴消息队列**
- 伙伴对白从 2 行硬编码改为动态消息生成
- 消息分三级：P1 重要事件（进化提示、稀有掉落）→ P2 今日状态（专注时长、待办数量）→ P3 时段闲话
- 8 秒自动切换，点击气泡手动翻页
- 涉及文件：`src/pages/HomePage.tsx`

**背包物品使用系统**
- 点击背包/小屋收藏物品可消耗使用：
  - 莓果旅行面包：同行伙伴羁绊 +10
  - 旧王朝铜币：经验 +5
  - 手绘地图碎片：下次远征稀有概率 +10%
  - 山野药草束：暂不可用（等待精力系统）
- 新增 `inventory:use` IPC 通道
- `game.cjs` 的 `rollExpedition()` 新增 `rareBoost` 参数
- 涉及文件：`electron/database.cjs`、`electron/game.cjs`、`electron/main.cjs`、`electron/preload.cjs`、`src/types.ts`、`src/pages/GrowthPage.tsx`、`src/pages/HomePage.tsx`

### ⚡ 性能优化

**计时器卡顿修复**
- `setInterval(1000ms)` 替换为 `requestAnimationFrame` 循环（~60fps）
- 时间显示丝滑无跳跃，不再出现 "54s → 停顿 → 56s" 的卡顿
- 涉及文件：`src/components/FocusController.tsx`

### 🗄️ 数据库变更

- `settings` 表白名单新增：`proxy_url`、`api_provider`
- `settings` 表默认值新增：`api_provider: 'openai'`、`proxy_url: ''`

---

## 改动文件统计

| 文件 | 改动类型 |
|------|---------|
| `src/components/Icon.tsx` | 新增 8 个 SVG 图标 |
| `src/components/FocusController.tsx` | requestAnimationFrame + 物品图标 |
| `src/pages/HomePage.tsx` | 伙伴消息队列 + 物品图标 + 物品点击 |
| `src/pages/GrowthPage.tsx` | 物品图标 + 物品点击 |
| `src/pages/SettingsPage.tsx` | 提供商下拉框 + 代理地址输入 |
| `src/world.css` | 精力选择器 CSS |
| `src/styles.css` | 伙伴气泡左移 + z-index |
| `src/types.ts` | inventory.use 类型 |
| `electron/main.cjs` | ProxyAgent + 双提供商 + inventory:use |
| `electron/database.cjs` | useItem() + 白名单 + 默认值 |
| `electron/game.cjs` | rareBoost 参数 |
| `electron/preload.cjs` | inventory.use 桥接 |
