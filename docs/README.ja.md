# Minimal Clock

Windows デスクトップで作業を続けながら現在時刻を常時参照できる、小型の常駐時計アプリです。画面を占有しない半透明の時計を最前面に保ち、用途に応じて表示内容を切り替え、システムトレイに常駐して明示的に終了するまで利用を継続できます。

- 半透明・枠なし・タイトルバーなしの小型ウィンドウ
- 常に最前面（Always on Top）表示の切り替え
- デジタル / アナログ（シンプル・数字・目盛り）の表示モード
- 12 / 24 時間表記、秒表示、コロン点滅、日付の併記
- システムトレイ常駐、ウィンドウを閉じても実行継続
- 設定はローカルに永続化され、次回起動時に復元

## 他の言語で読む

- [English（英語）](../README.md)
- [Español（スペイン語）](README.es.md)
- [Italiano（イタリア語）](README.it.md)
- [Français（フランス語）](README.fr.md)
- [Русский（ロシア語）](README.ru.md)
- [中文（中国語）](README.zh.md)
- [한국어（韓国語）](README.ko.md)

## 技術スタック

| レイヤー | 技術 |
| --- | --- |
| デスクトップシェル | [Tauri 2](https://tauri.app/)（Rust） |
| フロントエンド | React 19 + TypeScript |
| ビルド/開発サーバー | Vite 7 |
| テスト | Vitest + Testing Library（フロント）、`cargo test`（Rust） |
| 設定の永続化 | `tauri-plugin-store` |
| タスクランナー | [mise](https://mise.jdx.dev/) |

時計ウィンドウ（`index.html`）と設定ウィンドウ（`settings.html`）の 2 つの WebView エントリを持つマルチウィンドウ構成です。

## 必要要件

- Node.js（`npm` が利用可能なバージョン）
- Rust ツールチェーン（`cargo`） — Tauri のビルドに必要
- Windows（本アプリの対象プラットフォーム）
- [Tauri 2 の前提条件](https://tauri.app/start/prerequisites/)（WebView2 など）

## セットアップ

```bash
npm install
```

## 開発

mise を利用する場合:

```bash
mise run dev             # Tauri デスクトップアプリを起動
mise run frontend:dev    # フロントエンドのみ（Vite 開発サーバー）
```

npm スクリプトを直接実行する場合:

```bash
npm run tauri:dev   # Tauri デスクトップアプリを起動
npm run dev         # Vite 開発サーバーのみ（http://localhost:1420）
```

## ビルド

```bash
mise run build        # Tauri デスクトップアプリをビルド
# または
npm run tauri:build   # 同上
npm run build         # フロントエンドのみ（型チェック + Vite ビルド）
```

## テスト・型チェック

```bash
npm test          # Vitest（フロントエンド）
npm run typecheck # tsc による型チェック
cargo test        # Rust 側のテスト（src-tauri ディレクトリで実行）
```

## ディレクトリ構成

```
.
├── index.html              # 時計ウィンドウのエントリ
├── settings.html           # 設定ウィンドウのエントリ
├── src/                    # フロントエンド（React + TypeScript）
│   ├── clock-entry.tsx     # 時計ウィンドウのマウント
│   ├── settings-entry.tsx  # 設定ウィンドウのマウント
│   ├── clock/              # 時計表示コンポーネント（デジタル/アナログ/メニュー）
│   ├── settings/           # 設定 UI
│   ├── domain/             # ドメインモデル（設定スキーマ、イベント）
│   ├── services/           # ネイティブ連携・スケジューラ・イベント購読フック
│   └── styles/             # clock.css / settings.css
├── src-tauri/              # Tauri（Rust）バックエンド
│   ├── src/
│   │   ├── commands.rs         # フロントから呼ばれる Tauri コマンド
│   │   ├── desktop_runtime.rs  # ウィンドウ/トレイ/ランタイム状態
│   │   ├── settings_store.rs   # 設定の永続化
│   │   └── lib.rs              # アプリ初期化・コマンド登録
│   └── tauri.conf.json     # ウィンドウ定義・バンドル設定
└── .kiro/                  # Spec-Driven Development の仕様・ステアリング
```

## アーキテクチャ概要

フロントエンド（React）とバックエンド（Rust/Tauri）が、Tauri コマンドとイベントで連携します。

- **Tauri コマンド**: `initialize_clock_window` / `open_settings_window` / `apply_settings` / `get_applied_settings` / `retry_settings_persistence` / `quit_application` / `native_runtime_capabilities`
- **イベント**: 設定変更（`settings-changed`）と時計ウィンドウの表示状態（visibility）をウィンドウ間に通知し、設定ウィンドウでの変更を時計ウィンドウへ即時反映します。
- **永続化**: `apply_settings` で設定をストアへ保存し、保存に失敗した場合は揮発状態（`volatile`）として保持し、`retry_settings_persistence` で再試行できます。
- **トレイ常駐**: 時計ウィンドウを閉じても非表示になるだけでプロセスは継続し、トレイから「設定」「復帰」「終了」を操作できます。

詳細な要件・設計は `.kiro/specs/minimal-always-on-top-clock/` を参照してください。

## ライセンス

[MIT License](../LICENSE) の下で公開しています。
