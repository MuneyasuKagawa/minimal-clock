# Minimal Clock

A small, always-on-top clock app for the Windows desktop that lets you keep an eye on the current time while you work. It keeps a translucent clock on top of your other windows, lets you switch what it shows depending on your needs, and lives in the system tray so it keeps running until you explicitly quit.

- Translucent, frameless, title-bar-less compact window
- Always-on-top toggle
- Digital and analog (simple / numbers / markers) display modes
- 12 / 24-hour format, seconds display, blinking colon, and an optional date
- System tray resident — closing the window keeps the app running
- Settings are persisted locally and restored on the next launch

## Read this in other languages

- [日本語 (Japanese)](docs/README.ja.md)
- [Español (Spanish)](docs/README.es.md)
- [Italiano (Italian)](docs/README.it.md)
- [Français (French)](docs/README.fr.md)
- [Русский (Russian)](docs/README.ru.md)
- [中文 (Chinese)](docs/README.zh.md)
- [한국어 (Korean)](docs/README.ko.md)

## Tech Stack

| Layer | Technology |
| --- | --- |
| Desktop shell | [Tauri 2](https://tauri.app/) (Rust) |
| Frontend | React 19 + TypeScript |
| Build / dev server | Vite 7 |
| Tests | Vitest + Testing Library (frontend), `cargo test` (Rust) |
| Settings persistence | `tauri-plugin-store` |
| Task runner | [mise](https://mise.jdx.dev/) |

It is a multi-window setup with two WebView entries: the clock window (`index.html`) and the settings window (`settings.html`).

## Requirements

- Node.js (a version that ships with `npm`)
- Rust toolchain (`cargo`) — required to build Tauri
- Windows (the target platform of this app)
- [Tauri 2 prerequisites](https://tauri.app/start/prerequisites/) (WebView2, etc.)

## Setup

```bash
npm install
```

## Development

Using mise:

```bash
mise run dev             # Launch the Tauri desktop app
mise run frontend:dev    # Frontend only (Vite dev server)
```

Running the npm scripts directly:

```bash
npm run tauri:dev   # Launch the Tauri desktop app
npm run dev         # Vite dev server only (http://localhost:1420)
```

## Build

```bash
mise run build        # Build the Tauri desktop app
# or
npm run tauri:build   # Same as above
npm run build         # Frontend only (type check + Vite build)
```

## Tests & Type Checking

```bash
npm test          # Vitest (frontend)
npm run typecheck # Type checking with tsc
cargo test        # Rust-side tests (run inside the src-tauri directory)
```

## Directory Layout

```
.
├── index.html              # Clock window entry
├── settings.html           # Settings window entry
├── src/                    # Frontend (React + TypeScript)
│   ├── clock-entry.tsx     # Mounts the clock window
│   ├── settings-entry.tsx  # Mounts the settings window
│   ├── clock/              # Clock display components (digital/analog/menu)
│   ├── settings/           # Settings UI
│   ├── domain/             # Domain models (settings schema, events)
│   ├── services/           # Native integration, scheduler, event subscription hooks
│   └── styles/             # clock.css / settings.css
├── src-tauri/              # Tauri (Rust) backend
│   ├── src/
│   │   ├── commands.rs         # Tauri commands invoked from the frontend
│   │   ├── desktop_runtime.rs  # Window / tray / runtime state
│   │   ├── settings_store.rs   # Settings persistence
│   │   └── lib.rs              # App initialization & command registration
│   └── tauri.conf.json     # Window definitions & bundle config
└── .kiro/                  # Spec-Driven Development specs & steering
```

## Architecture Overview

The frontend (React) and the backend (Rust/Tauri) communicate through Tauri commands and events.

- **Tauri commands**: `initialize_clock_window`, `open_settings_window`, `apply_settings`, `get_applied_settings`, `retry_settings_persistence`, `quit_application`, `native_runtime_capabilities`
- **Events**: Settings changes (`settings-changed`) and the clock window's visibility state are broadcast between windows, so changes made in the settings window are reflected in the clock window immediately.
- **Persistence**: `apply_settings` saves settings to the store; if saving fails the settings are kept in a volatile state (`volatile`) and can be retried via `retry_settings_persistence`.
- **Tray residency**: Closing the clock window only hides it — the process keeps running, and you can use "Settings", "Restore", and "Quit" from the tray.

See `.kiro/specs/minimal-always-on-top-clock/` for detailed requirements and design.

## License

Released under the [MIT License](LICENSE).
