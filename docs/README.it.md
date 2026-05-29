# Minimal Clock

Una piccola app orologio sempre in primo piano per il desktop Windows che ti permette di tenere d'occhio l'ora corrente mentre lavori. Mantiene un orologio traslucido sopra le altre finestre, ti consente di cambiare ciò che mostra in base alle tue esigenze e risiede nella barra delle applicazioni di sistema, quindi continua a funzionare finché non lo chiudi esplicitamente.

- Finestra compatta traslucida, senza bordi né barra del titolo
- Interruttore «sempre in primo piano» (Always on Top)
- Modalità di visualizzazione digitale e analogica (semplice / con numeri / con tacche)
- Formato 12 / 24 ore, visualizzazione dei secondi, due punti lampeggianti e data opzionale
- Residente nella barra di sistema: chiudere la finestra mantiene l'app in esecuzione
- Le impostazioni vengono salvate localmente e ripristinate al successivo avvio

## Leggilo in altre lingue

- [English (Inglese)](../README.md)
- [日本語 (Giapponese)](README.ja.md)
- [Español (Spagnolo)](README.es.md)
- [Français (Francese)](README.fr.md)
- [Русский (Russo)](README.ru.md)
- [中文 (Cinese)](README.zh.md)
- [한국어 (Coreano)](README.ko.md)

## Stack tecnologico

| Livello | Tecnologia |
| --- | --- |
| Shell desktop | [Tauri 2](https://tauri.app/) (Rust) |
| Frontend | React 19 + TypeScript |
| Build / server di sviluppo | Vite 7 |
| Test | Vitest + Testing Library (frontend), `cargo test` (Rust) |
| Persistenza delle impostazioni | `tauri-plugin-store` |
| Task runner | [mise](https://mise.jdx.dev/) |

È una configurazione multi-finestra con due voci WebView: la finestra dell'orologio (`index.html`) e la finestra delle impostazioni (`settings.html`).

## Requisiti

- Node.js (una versione che include `npm`)
- Toolchain di Rust (`cargo`): necessaria per compilare Tauri
- Windows (la piattaforma di destinazione di questa app)
- [Prerequisiti di Tauri 2](https://tauri.app/start/prerequisites/) (WebView2, ecc.)

## Configurazione

```bash
npm install
```

## Sviluppo

Con mise:

```bash
mise run dev             # Avvia l'app desktop Tauri
mise run frontend:dev    # Solo frontend (server di sviluppo Vite)
```

Eseguendo direttamente gli script npm:

```bash
npm run tauri:dev   # Avvia l'app desktop Tauri
npm run dev         # Solo server di sviluppo Vite (http://localhost:1420)
```

## Build

```bash
mise run build        # Compila l'app desktop Tauri
# oppure
npm run tauri:build   # Come sopra
npm run build         # Solo frontend (controllo dei tipi + build Vite)
```

## Test e controllo dei tipi

```bash
npm test          # Vitest (frontend)
npm run typecheck # Controllo dei tipi con tsc
cargo test        # Test lato Rust (eseguire nella directory src-tauri)
```

## Struttura delle directory

```
.
├── index.html              # Entry della finestra dell'orologio
├── settings.html           # Entry della finestra delle impostazioni
├── src/                    # Frontend (React + TypeScript)
│   ├── clock-entry.tsx     # Monta la finestra dell'orologio
│   ├── settings-entry.tsx  # Monta la finestra delle impostazioni
│   ├── clock/              # Componenti di visualizzazione dell'orologio (digitale/analogico/menu)
│   ├── settings/           # Interfaccia delle impostazioni
│   ├── domain/             # Modelli di dominio (schema delle impostazioni, eventi)
│   ├── services/           # Integrazione nativa, scheduler, hook di sottoscrizione agli eventi
│   └── styles/             # clock.css / settings.css
├── src-tauri/              # Backend Tauri (Rust)
│   ├── src/
│   │   ├── commands.rs         # Comandi Tauri invocati dal frontend
│   │   ├── desktop_runtime.rs  # Stato finestra / barra di sistema / runtime
│   │   ├── settings_store.rs   # Persistenza delle impostazioni
│   │   └── lib.rs              # Inizializzazione dell'app e registrazione dei comandi
│   └── tauri.conf.json     # Definizioni delle finestre e configurazione del pacchetto
└── .kiro/                  # Specifiche e steering dello Spec-Driven Development
```

## Panoramica dell'architettura

Il frontend (React) e il backend (Rust/Tauri) comunicano tramite comandi ed eventi di Tauri.

- **Comandi Tauri**: `initialize_clock_window`, `open_settings_window`, `apply_settings`, `get_applied_settings`, `retry_settings_persistence`, `quit_application`, `native_runtime_capabilities`
- **Eventi**: le modifiche alle impostazioni (`settings-changed`) e lo stato di visibilità della finestra dell'orologio vengono trasmessi tra le finestre, in modo che le modifiche apportate nella finestra delle impostazioni si riflettano immediatamente nella finestra dell'orologio.
- **Persistenza**: `apply_settings` salva le impostazioni nello store; se il salvataggio fallisce, le impostazioni vengono mantenute in uno stato volatile (`volatile`) e possono essere riprovate tramite `retry_settings_persistence`.
- **Residenza nella barra di sistema**: chiudere la finestra dell'orologio la nasconde soltanto; il processo continua a funzionare e puoi usare «Impostazioni», «Ripristina» e «Esci» dalla barra di sistema.

Consulta `.kiro/specs/minimal-always-on-top-clock/` per i requisiti e il design dettagliati.

## Licenza

Rilasciato sotto la [Licenza MIT](../LICENSE).
