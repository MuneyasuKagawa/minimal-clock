# 調査記録と設計判断

## Summary

- **Feature**: `minimal-always-on-top-clock`
- **Discovery Scope**: New Feature / Full Discovery
- **Key Findings**:
  - 現在の作業ディレクトリには仕様資料、要求元資料、および未追跡の空 `package-lock.json` metadata があり、ルートの `package.json`、再利用対象となるアプリ実装、既存アーキテクチャは存在しない。
  - Tauri v2 は React テンプレート、Rust 側のシステムトレイ、ウィンドウ構成、イベント API、Store プラグインと capability 制御を公式に提供しており、要件をプラットフォーム機能の組合せで満たせる。
  - 複数ウィンドウ間の設定共有は、Rust ランタイムへ変更入口と実行中の適用済み状態を集約し、型付き設定データを永続ストアへ保存してから両ウィンドウへ型付きイベント通知を発行する方式が一貫する。

## Research Log

### 既存コードベースとプロジェクト境界
- **Context**: 新規設計か既存機能拡張かを分類し、変更対象ファイルを特定する必要がある。
- **Sources Consulted**: リポジトリ直下、`.kiro/specs/minimal-always-on-top-clock/requirements.md`、`draft.md`
- **Findings**:
  - 実行可能な Tauri または React ソースはまだ存在しない。
  - `.kiro/steering/` にプロジェクト固有の方針文書は存在しない。
  - `draft.md` は Tauri v2、TypeScript + React、Rust、Windows 優先、Store プラグインを明示する。
- **Implications**:
  - 本機能は新規アプリの基盤を含む full discovery 対象である。
  - 設計は既存実装との互換制約ではなく、要件と指定技術に対する最小構成を定義する。
  - ステアリング不在のため、後日ステアリングが追加された場合は設計の再確認が必要となる。

### Tauri v2 のウィンドウとフロントエンド構成
- **Context**: 枠なし半透明時計、設定用別画面、React/Vite 構成がサポートされることを確認する。
- **Sources Consulted**:
  - [Create a Project | Tauri](https://v2.tauri.app/start/create-project/)
  - [Configuration | Tauri](https://v2.tauri.app/reference/config/)
  - [Window Customization | Tauri](https://v2.tauri.app/learn/window-customization/)
- **Findings**:
  - Tauri v2 の公式セットアップは TypeScript と React のテンプレート、および Vite を用いた手動初期化を扱う。
  - ウィンドウ構成は `decorations`、`transparent`、`alwaysOnTop`、`skipTaskbar`、`resizable` 等を提供する。
  - 枠なしウィンドウではカスタムドラッグ領域が必要であり、Windows の透過表示は実機確認対象となる。
- **Implications**:
  - 時計ページと設定ページを持つ React + Vite のマルチエントリ構成を採用する。
  - 時計ウィンドウの固定属性は Tauri 設定に置き、保存設定に依存する属性は起動初期化時に適用する。

### トレイ、イベント、権限制御
- **Context**: 常駐、終了、ウィンドウ間同期を安全に実現するランタイム境界が必要である。
- **Sources Consulted**:
  - [System Tray | Tauri](https://v2.tauri.app/learn/system-tray/)
  - [Event API | Tauri](https://v2.tauri.app/reference/javascript/api/namespaceevent/)
  - [Capabilities | Tauri](https://v2.tauri.app/security/capabilities/)
  - [Core Permissions | Tauri](https://v2.tauri.app/reference/acl/core-permissions/)
- **Findings**:
  - Rust の `TrayIconBuilder` はトレイメニューとメニューイベントを扱え、`tray-icon` feature が必要である。
  - `emitTo<T>` と `listen<T>` はラベル付きウィンドウへの型付き通知に利用でき、不要になった listener は解除する必要がある。
  - capability はウィンドウ単位で core/plugin コマンド露出を制約する。
- **Implications**:
  - プロセス寿命とネイティブ操作は Rust の DesktopRuntime が所有し、React は必要なコマンドのみを呼び出す。
  - 設定変更イベントは `clock-settings://changed` の単一契約に集約し、ランタイムで適用した `saved` または `volatile` 状態を時計ウィンドウと設定ウィンドウの双方が購読する。
  - capability は時計ページと設定ページに必要な Event と限定コマンドだけを許可し、Store の直接操作は Rust 側に閉じる。

### 設定永続化
- **Context**: 再起動後の設定復元と障害時の初期値復帰を満たす永続化方法が必要である。
- **Sources Consulted**:
  - [Store | Tauri](https://v2.tauri.app/plugin/store/)
- **Findings**:
  - `tauri-plugin-store` はファイルベースの永続 key-value store を提供し、Rust ランタイムからも設定永続化境界として利用できる。
  - Store を WebView へ公開する場合は capability 許可が必要だが、本設計では設定 authority を Rust に集約するため直接公開しない。
- **Implications**:
  - 保存単位は `ClockSettings` 一件とし、Rust 側の保存境界で読み込み時に型検証して不正値を初期値へフォールバックする。
  - 設定画面と時計メニューの変更は Rust ランタイムの共通適用境界で扱い、保存成功時は `saved`、ネイティブ適用後の保存失敗時は `volatile` として通知する。

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| React 単独でネイティブ機能を管理 | WebView がウィンドウとトレイを直接制御 | UI コードへ集約できる | capability 範囲とプロセス寿命の責任が UI に混在する | 不採用 |
| Rust desktop shell + typed React UI | Rust がネイティブ寿命を管理し、React が表示と設定を管理 | 権限境界が明確で、UI テストとネイティブ検証を分離可能 | コマンドとイベント契約が必要 | 採用 |
| 汎用状態管理レイヤ追加 | 共有状態ライブラリで複数画面を統合 | 拡張性が高い | MVP の 1 設定オブジェクトには過剰 | 不採用 |

## Design Decisions

### Decision: デスクトップシェルと UI の責任分離
- **Context**: トレイ、非表示化、終了、最前面、画面配置は OS と結びつき、表示形式設定は UI と結びつく。
- **Alternatives Considered**:
  1. React から Tauri API を広く直接利用する。
  2. Rust が OS ライフサイクルを所有し、React が型付き UI 状態を所有する。
- **Selected Approach**: `DesktopRuntime` がトレイ、ウィンドウ管理、終了、最前面適用、初期配置、実行中の適用済み設定を所有する。Rust 側 `SettingsStore` が永続設定を所有し、React 表示コンポーネントは通知された設定で時計描画を行う。
- **Rationale**: OS 権限の露出を限定し、要件 1、4、7 と要件 2、3、5、6、8 の責任を混在させない。
- **Trade-offs**: 少数のコマンド境界が必要となるが、ランタイム動作を統合テストしやすい。
- **Follow-up**: Windows 上で close request、透明ウィンドウ、tray 操作のスモーク検証を行う。

### Decision: 型付き設定スナップショットとイベント通知
- **Context**: 時計ページと設定ページは React state を共有しないが、変更は即時反映かつ永続化されなければならない。
- **Alternatives Considered**:
  1. 各ページが一定間隔で Store を読み直す。
  2. 設定保存後に完全な設定スナップショットをイベント送信する。
- **Selected Approach**: `ClockSettings` を Store の単一永続データとし、Rust ランタイムが設定画面と時計メニューの変更、および実行中の `saved/volatile` 適用済み状態を所有する。状態変更後に `SettingsChangedPayload` として時計ページと設定ページの双方へ送信する。
- **Rationale**: ポーリングを避け、保存状態と表示状態を同一の型付きデータで同期できる。
- **Trade-offs**: リスナー登録解除とイベント欠落時の再読込処理が必要である。
- **Follow-up**: 時計画面の復帰および設定画面の再表示時はランタイムの applied snapshot を取得し、非表示中のイベント欠落を吸収する。設定画面を開いた状態で時計メニューから最前面を切り替えても、後続保存で値が巻き戻らないことを検証する。

### Decision: 非表示起動からの初期化完了表示
- **Context**: 保存済み `alwaysOnTop: false` の利用者へ、デフォルトの最前面状態を一瞬表示することは設定復元として不適切である。
- **Alternatives Considered**:
  1. 時計を表示してから設定を適用する。
  2. 時計を非表示で作成し、設定ロード、位置決定、最前面適用後に表示する。
- **Selected Approach**: 時計ウィンドウは起動時に非表示で生成し、`DesktopRuntime` が `SettingsStore` から設定を読み込み、applied snapshot を確立してから配置・表示する。
- **Rationale**: ランタイムを適用設定の単一所有者として維持し、復元途中の誤表示を防ぐ。
- **Trade-offs**: 起動処理に初期化ハンドシェイクが加わる。
- **Follow-up**: 初回表示までの所要時間を Windows スモークテストで確認する。

## Risks & Mitigations

- Windows の透明かつ枠なしウィンドウの描画差異により外観が崩れる可能性がある。時計ウィンドウの影を無効化し、Windows 実機で透明度・ドラッグ・右クリックを検証する。
- Store 読み込み失敗または不正 JSON により起動が停止する可能性がある。型検証結果を `Result` として扱い、初期設定へ復旧して実行を継続する。
- トレイ経由の非表示中に設定イベントを受信しない可能性がある。再表示時にランタイムの applied snapshot を取得して表示を再同期する。
- 時計メニューと設定画面が個別に設定を書き込むと、最前面値が古いフォーム状態で巻き戻る可能性がある。設定変更を Rust ランタイムの適用境界へ集約し、適用済みスナップショットを両画面へ通知する。
- 最前面状態のネイティブ適用と保存の片方だけが成功すると状態が不整合になる可能性がある。Rust ランタイムが実行中の applied snapshot を所有し、ネイティブ適用成功後の保存失敗時は適用中状態を `volatile` として両画面へ同期する。同一プロセスの復帰や設定再表示では Store よりランタイム状態を優先し、永続化再試行を提供する。
- `.kiro/steering/` が未作成であり、今後のプロジェクト標準と設計が衝突する可能性がある。ステアリング追加時に依存、テスト、ファイル構造を再検証する。

## References

- [Create a Project | Tauri](https://v2.tauri.app/start/create-project/) - React と Vite を含む Tauri v2 プロジェクト構成。
- [Configuration | Tauri](https://v2.tauri.app/reference/config/) - ウィンドウ構成属性。
- [Window Customization | Tauri](https://v2.tauri.app/learn/window-customization/) - 枠なし表示とドラッグ領域。
- [System Tray | Tauri](https://v2.tauri.app/learn/system-tray/) - tray feature と Rust トレイメニュー。
- [Store | Tauri](https://v2.tauri.app/plugin/store/) - 永続 Store と permission。
- [Event API | Tauri](https://v2.tauri.app/reference/javascript/api/namespaceevent/) - 型付きイベント通知。
- [Capabilities | Tauri](https://v2.tauri.app/security/capabilities/) - WebView の権限境界。
