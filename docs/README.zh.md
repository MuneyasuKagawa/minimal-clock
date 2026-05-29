# Minimal Clock

一款适用于 Windows 桌面的小巧的置顶时钟应用，让你在工作时随时关注当前时间。它将一个半透明的时钟保持在其他窗口之上，可以根据需要切换显示内容，并常驻系统托盘，因此在你明确退出之前会一直运行。

- 半透明、无边框、无标题栏的紧凑窗口
- “置顶”（Always on Top）开关
- 数字与模拟（简洁 / 数字 / 刻度）显示模式
- 12 / 24 小时制、秒数显示、闪烁冒号以及可选的日期
- 常驻系统托盘——关闭窗口后应用仍继续运行
- 设置会保存在本地，并在下次启动时恢复

## 其他语言版本

- [English（英语）](../README.md)
- [日本語（日语）](README.ja.md)
- [Español（西班牙语）](README.es.md)
- [Italiano（意大利语）](README.it.md)
- [Français（法语）](README.fr.md)
- [Русский（俄语）](README.ru.md)
- [한국어（韩语）](README.ko.md)

## 技术栈

| 层 | 技术 |
| --- | --- |
| 桌面外壳 | [Tauri 2](https://tauri.app/)（Rust） |
| 前端 | React 19 + TypeScript |
| 构建 / 开发服务器 | Vite 7 |
| 测试 | Vitest + Testing Library（前端）、`cargo test`（Rust） |
| 设置持久化 | `tauri-plugin-store` |
| 任务运行器 | [mise](https://mise.jdx.dev/) |

它是一个多窗口结构，包含两个 WebView 入口：时钟窗口（`index.html`）和设置窗口（`settings.html`）。

## 环境要求

- Node.js（自带 `npm` 的版本）
- Rust 工具链（`cargo`）——构建 Tauri 所需
- Windows（本应用的目标平台）
- [Tauri 2 的前置条件](https://tauri.app/start/prerequisites/)（WebView2 等）

## 安装

```bash
npm install
```

## 开发

使用 mise：

```bash
mise run dev             # 启动 Tauri 桌面应用
mise run frontend:dev    # 仅前端（Vite 开发服务器）
```

直接运行 npm 脚本：

```bash
npm run tauri:dev   # 启动 Tauri 桌面应用
npm run dev         # 仅 Vite 开发服务器（http://localhost:1420）
```

## 构建

```bash
mise run build        # 构建 Tauri 桌面应用
# 或
npm run tauri:build   # 同上
npm run build         # 仅前端（类型检查 + Vite 构建）
```

## 测试与类型检查

```bash
npm test          # Vitest（前端）
npm run typecheck # 使用 tsc 进行类型检查
cargo test        # Rust 端测试（在 src-tauri 目录下运行）
```

## 目录结构

```
.
├── index.html              # 时钟窗口入口
├── settings.html           # 设置窗口入口
├── src/                    # 前端（React + TypeScript）
│   ├── clock-entry.tsx     # 挂载时钟窗口
│   ├── settings-entry.tsx  # 挂载设置窗口
│   ├── clock/              # 时钟显示组件（数字/模拟/菜单）
│   ├── settings/           # 设置界面
│   ├── domain/             # 领域模型（设置架构、事件）
│   ├── services/           # 原生集成、调度器、事件订阅 hooks
│   └── styles/             # clock.css / settings.css
├── src-tauri/              # Tauri（Rust）后端
│   ├── src/
│   │   ├── commands.rs         # 从前端调用的 Tauri 命令
│   │   ├── desktop_runtime.rs  # 窗口 / 托盘 / 运行时状态
│   │   ├── settings_store.rs   # 设置持久化
│   │   └── lib.rs              # 应用初始化与命令注册
│   └── tauri.conf.json     # 窗口定义与打包配置
└── .kiro/                  # Spec-Driven Development 的规格与 steering
```

## 架构概览

前端（React）与后端（Rust/Tauri）通过 Tauri 命令和事件进行通信。

- **Tauri 命令**：`initialize_clock_window`、`open_settings_window`、`apply_settings`、`get_applied_settings`、`retry_settings_persistence`、`quit_application`、`native_runtime_capabilities`
- **事件**：设置变更（`settings-changed`）和时钟窗口的可见性状态会在各窗口之间广播，因此在设置窗口中所做的更改会立即反映到时钟窗口。
- **持久化**：`apply_settings` 会将设置保存到存储中；若保存失败，设置会保持在易失状态（`volatile`），并可通过 `retry_settings_persistence` 重试。
- **托盘常驻**：关闭时钟窗口只是将其隐藏——进程会继续运行，你可以从托盘使用“设置”“恢复”和“退出”。

详细的需求与设计请参阅 `.kiro/specs/minimal-always-on-top-clock/`。

## 许可证

基于 [MIT 许可证](../LICENSE) 发布。
