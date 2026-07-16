# 成长轨迹

一个只属于个人、数据优先保存在本机的游戏化学习系统。

## 已实现

- 领域—目标—事项三级学习地图
- 支持暂停、休眠和异常恢复的自由正计时
- 专注成果、困难和下一步复盘
- 日复盘、周统计与 OpenAI 结构化学习报告
- 经验等级、一次性完成奖励、九项成就
- SQLite 本地数据、Windows DPAPI 加密 API Key
- Windows 系统托盘、90 分钟温和提醒

## 使用

直接运行 `dist/成长轨迹 Setup 0.1.0.exe` 安装。

开发模式：

```powershell
npm run dev
```

测试与构建：

```powershell
npm test
npm run build
npm run dist
```

OpenAI 报告为可选能力。请在设置页填写独立的 OpenAI API Key；ChatGPT 或 Codex 订阅不能代替 API Key。没有 Key 时，专注、计划、统计、日复盘和成长系统仍可完整使用。

数据目录可从应用设置页直接打开。首版不会上传、同步或自动备份数据库。
