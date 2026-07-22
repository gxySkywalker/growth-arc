# 成长轨迹 (Growth Arc) — 项目交接文档 v0.4.0

> 日期：2026-07-22
> 状态：邮件模块已冻结，进入 NPC/伙伴系统开发阶段

---

## 1. 项目简介

| 项目 | 值 |
|------|-----|
| **项目名称** | 成长轨迹 (Growth Arc) |
| **当前版本** | v0.4.0 — 小天使与旅途记忆：写给旅人的信 |
| **技术栈** | Electron + React 19 + TypeScript + Vite + sql.js (WASM SQLite) |
| **定位** | 本地优先、单用户的像素RPG生活记录软件。玩家在学习的同时与一个温暖的中世纪边境世界共同生活。 |
| **核心体验** | 每次远征后，住在邮局二楼的小天使会整理当天的旅途，写下一封温暖的信。 |

**核心循环**：开始远征 → 专注计时 → 返程结算 → 第二天打开App → 收到小天使的信

---

## 2. 当前版本状态

| 项目 | 值 |
|------|-----|
| Git 分支 | `master` |
| 最新 commit | `588e8e1` |
| 最新 Release | `v0.4.0` on GitHub |
| 已完成模块 | 天使邮局（完整生命周期）、小天使叙事系统、AI信件系统、键盘导航系统、世界状态系统 |

---

## 3. 技术架构

```
项目目录:
  src/                React 前端 (Vite + TypeScript)
    pages/            页面组件
    components/       通用组件 (FocusController, LetterViewer, Icon, ...)
    lib/              纯函数 (audio, navState, inputContext, mailMock, observatory, ...)
    context/          React Context (AppContext)
    hooks/            (已删除，useRosterNav 废弃)
    *.css             样式文件
  electron/           Electron 主进程 (CommonJS)
    main.cjs          主进程入口，IPC handler 注册，AI 调用
    preload.cjs       contextBridge → window.growthArc
    database.cjs      sql.js 数据库 (CRUD, migration, seed, mail lifecycle)
    domain.cjs        纯函数 (XP, dates, letter templates, world state, festivals)
    game.cjs          游戏系统 (expedition roll, companions, loot)
    prompts/          AI prompt 资源文件
  public/             静态资源 (音频、字体)
  assets/             美术资源 (像素图、参考图)
  docs/               设计文档
  scripts/            开发脚本 (test-mail-lifecycle, test-ai-narrative)

关键约束:
  - 无 router: 页面切换为 useState<PageId>
  - CommonJS (electron/) + ESM (src/)
  - sql.js WASM 需 asarUnpack
  - API Key 使用 Windows DPAPI 加密存储 (secret.bin)，不进 SQLite
  - 数据库 migration 使用 schema_version 版本控制 + PRAGMA table_info
  - 像素字体: Fusion Pixel SC
  - 图表配色: 星光蓝 #8FBCCC + 黄铜 #C39755
```

---

## 4. 核心业务设计

### 4.1 天使邮局 — 邮件生命周期

**所有邮件由 App 启动时自动生成，不依赖 UI 触发。**

```
App 启动
  ├─ database.init() → migration → seed
  ├─ ensureWelcomeLetter()         welcome:first_visit (幂等)
  ├─ ensurePeriodicLetters(now)    daily + weekly 扫描
  ├─ ensureEventLetters(now)       归灯节节点检查
  ├─ ensureBirthdayLetter(now)     生日检查
  └─ ensureAiNarratives()          AI叙事 (后台异步, 不阻塞窗口)
```

**PostOfficePage 只读取数据 (mail:list → mail:get)，不触发生成。**

#### Daily (每日星笺)
- 触发: App 启动时扫描 lastDaily+1 至 yesterday
- 条件: shouldGenerateDailyLetter — 有效远征 (short/expedition/deep) 或有复盘记录
- 空白日不生成，离线回来自动补发
- 幂等: UNIQUE(letter_type, period_key)
- 标题: "7月20日的星页"
- 正文: 小天使人格叙事模板 (无数据报告语言)

#### Weekly (旅途札记)
- 周期: 周一 00:00 ~ 周日 23:59
- 条件: 完整周结束 + 该周有有效远征
- 标题: "旅途札记" (列表) / "7月13日—7月20日的旅途札记" (详情)
- 寄出日期: periodEnd (下周一)

#### Festival (归灯节)
- 日期: 每年 11/7-11/16
- 节点: Day1 opening (灯火初燃) / Day5 midway (旧灯回响) / Day10 climax (归灯夜)
- 过滤: playerStartYear ≥ firstYear，不生成玩家进入世界之前的节庆
- 幂等: letter_events.event_key UNIQUE

#### Birthday (生日信)
- 条件: birthday_date ≥ world_entered_at AND birthday_date ≤ now
- event_key: birthday:{year}，每年一封
- 迟到送达: 生日当天未登录，之后首次启动补发 (同年内)

#### Welcome Letter (欢迎信)
- 触发: 首次启动时生成 (welcome:first_visit)
- 发件人: 小天使
- 日期: world_entered_at (玩家进入世界当天)
- 分类: 纪念来信

### 4.2 小天使叙事系统

**小天使人格**：住在邮局二楼朝西的小房间，窗台上有一盆莉娅送的花。每天傍晚整理信件、盖邮戳、封蜡。邮袋有点大，拖在地上的时候比背起来多。灯油是奥伦每月分给她的。

**世界状态系统** (`getWorldState(periodKey)`)：纯函数，根据日期确定性计算世界状态。窗框会响→艾达来修→修好；花会发芽→开花→凋谢；归灯节期间镇上挂灯。未来可扩展 NPC、地点、事件。

**模板信**：无 AI Key 时使用。60-100字叙事风格，不提数据统计。季节感知 (春夏秋冬)，天气变化，小天使动作细节 (盖邮戳、拖邮袋、整理木格)。

**AI 信**：有 Key 时使用。同一套小天使人格 prompt，用真实 API 生成。失败自动降级为模板信。

---

## 5. AI 系统

```
用户填写钥匙 → safeStorage.encryptString → secret.bin
App 启动 → readApiKey() → safeStorage.decryptString
  → ensureAiNarratives() (后台异步)
    → generateLetterNarrative(letter)
      → fetch API (OpenAI/DeepSeek 兼容接口)
      → 成功: body_source='ai', ai_status='success'
      → 失败: ai_status='failed', retry++, 3次后放弃
      → 无Key: 跳过，使用模板信
```

**状态机**: pending → success/failed/template/skipped/quota_exceeded
**失败策略**: 最多重试3次，每次启动重试，不阻塞窗口创建
**默认**: 无 Key 时完全不调用 AI，模板信正常工作

---

## 6. 数据库设计

### letters
| 字段 | 说明 |
|------|------|
| letter_type | daily/weekly/festival/memorial/world |
| period_key | 周期标识 (UNIQUE with letter_type) |
| fact_json | 事实层 (不可变，schemaVersion=2) |
| template_body | 模板正文 (始终存在) |
| ai_body | AI 正文 (可选) |
| body_source | 'template' / 'ai' |
| ai_status | pending/success/failed/template/skipped/quota_exceeded |
| ai_retry_count | 重试次数 |

### letter_events
| 字段 | 说明 |
|------|------|
| event_key | UNIQUE, 如 returning_lights:2026:opening |
| letter_id | FK → letters(id) ON DELETE SET NULL |

### settings (邮件相关)
- `world_entered_at_ms` — 玩家进入世界时间
- `schema_version` — 迁移版本号 (当前 V3)
- `last_daily_period_checked` / `last_weekly_period_checked` — 扫描游标
- `birthday_month` / `birthday_day` / `birthday_updated_at` — 生日设置

---

## 7. 已完成版本决策 (不可重新讨论)

以下设计已经过反复迭代确认，**不要重新设计**:

1. 邮件由 App 启动时自动生成，不是 UI 触发生成
2. AI 失败不能影响游戏正常运行 (降级模板信)
3. 模板信必须保持世界观 (不提数据统计、不用现代词汇)
4. 技术词不能进入游戏文本 (API、token、模型等词禁止)
5. 空分类永远显示，不根据内容隐藏 (邮局分类是固定格子)
6. 小天使是叙事角色，不是系统通知 (第一人称，手写信风格)
7. 世界状态是纯函数 (不依赖数据库，确定性)
8. AI Key 使用 DPAPI 加密存储，不进入 SQLite
9. 邮件模块已冻结，修改需要明确原因记录在 `docs/mail-system-v0.7.md`

---

## 8. 当前待办 (未来模块)

- **NPC 系统**: 友人来信分类 (letter_type='world')，居民关系，商队事件
- **成就系统**: 纪念来信扩展
- **年度回顾信**: fact_json memory 字段已预留
- **更多节庆**: FESTIVALS 配置扩展 (春节、冬星节等)
- **小天使 CSS sprite**: 美术资产
- **邮局 header 背景**: 美术资产
- **月光/节日信封 PNG**: 美术资产

---

## 9. 开发规范

### 修改前
1. 阅读 `CLAUDE.md` 和本文件
2. 运行 `npm test` 确认基线通过 (188 tests)
3. 理解当前架构后再动手

### 代码风格
- 保持世界观语言 (游戏文本不使用技术词)
- 不随意重构 (优先增量修改)
- 优先用户体验而非技术实现
- 新功能必须有自动化测试

### 发布前
```bash
npx tsc --noEmit   # TypeScript 检查
npm test           # 188 tests
npm run build      # 生产构建
```

### 新会话启动提示

```
加载项目成长轨迹 (Growth Arc)。Electron + React 19 + Vite + sql.js，当前 v0.4.0。
运行: npm run dev, npm test (188 tests), npm run build。
请阅读 CLAUDE.md 和 docs/PROJECT_HANDOFF.md。
邮件模块 (天使邮局) 已冻结，详见 docs/mail-system-v0.7.md。
当前可开发: NPC系统、成就系统、伙伴扩展、美术资产、年度回顾信。
不要修改邮件生成逻辑、AI调用链、世界状态系统。
保持世界观语言，禁止技术词进入游戏文本。
修改前先运行 npm test 确认基线。
```
