# Minimal Clock

Une petite application horloge toujours au premier plan pour le bureau Windows qui vous permet de garder un œil sur l'heure actuelle pendant que vous travaillez. Elle maintient une horloge translucide au-dessus de vos autres fenêtres, vous permet de changer ce qu'elle affiche selon vos besoins et réside dans la zone de notification du système, de sorte qu'elle continue de fonctionner jusqu'à ce que vous la fermiez explicitement.

- Fenêtre compacte translucide, sans bordure ni barre de titre
- Bascule « toujours au premier plan » (Always on Top)
- Modes d'affichage numérique et analogique (simple / avec chiffres / avec repères)
- Format 12 / 24 heures, affichage des secondes, deux-points clignotants et date facultative
- Résidente dans la zone de notification : fermer la fenêtre maintient l'application en cours d'exécution
- Les paramètres sont enregistrés localement et restaurés au prochain démarrage

## Lire dans d'autres langues

- [English (Anglais)](../README.md)
- [日本語 (Japonais)](README.ja.md)
- [Español (Espagnol)](README.es.md)
- [Italiano (Italien)](README.it.md)
- [Русский (Russe)](README.ru.md)
- [中文 (Chinois)](README.zh.md)
- [한국어 (Coréen)](README.ko.md)

## Pile technologique

| Couche | Technologie |
| --- | --- |
| Coquille de bureau | [Tauri 2](https://tauri.app/) (Rust) |
| Frontend | React 19 + TypeScript |
| Build / serveur de développement | Vite 7 |
| Tests | Vitest + Testing Library (frontend), `cargo test` (Rust) |
| Persistance des paramètres | `tauri-plugin-store` |
| Lanceur de tâches | [mise](https://mise.jdx.dev/) |

Il s'agit d'une configuration multifenêtre avec deux entrées WebView : la fenêtre de l'horloge (`index.html`) et la fenêtre des paramètres (`settings.html`).

## Prérequis

- Node.js (une version fournie avec `npm`)
- Chaîne d'outils Rust (`cargo`) — nécessaire pour compiler Tauri
- Windows (la plateforme cible de cette application)
- [Prérequis de Tauri 2](https://tauri.app/start/prerequisites/) (WebView2, etc.)

## Installation

```bash
npm install
```

## Développement

Avec mise :

```bash
mise run dev             # Lance l'application de bureau Tauri
mise run frontend:dev    # Frontend uniquement (serveur de développement Vite)
```

En exécutant directement les scripts npm :

```bash
npm run tauri:dev   # Lance l'application de bureau Tauri
npm run dev         # Serveur de développement Vite uniquement (http://localhost:1420)
```

## Build

```bash
mise run build        # Compile l'application de bureau Tauri
# ou
npm run tauri:build   # Identique à ci-dessus
npm run build         # Frontend uniquement (vérification des types + build Vite)
```

## Tests et vérification des types

```bash
npm test          # Vitest (frontend)
npm run typecheck # Vérification des types avec tsc
cargo test        # Tests côté Rust (à exécuter dans le répertoire src-tauri)
```

## Structure des répertoires

```
.
├── index.html              # Entrée de la fenêtre de l'horloge
├── settings.html           # Entrée de la fenêtre des paramètres
├── src/                    # Frontend (React + TypeScript)
│   ├── clock-entry.tsx     # Monte la fenêtre de l'horloge
│   ├── settings-entry.tsx  # Monte la fenêtre des paramètres
│   ├── clock/              # Composants d'affichage de l'horloge (numérique/analogique/menu)
│   ├── settings/           # Interface des paramètres
│   ├── domain/             # Modèles de domaine (schéma des paramètres, événements)
│   ├── services/           # Intégration native, planificateur, hooks d'abonnement aux événements
│   └── styles/             # clock.css / settings.css
├── src-tauri/              # Backend Tauri (Rust)
│   ├── src/
│   │   ├── commands.rs         # Commandes Tauri appelées depuis le frontend
│   │   ├── desktop_runtime.rs  # État fenêtre / zone de notification / runtime
│   │   ├── settings_store.rs   # Persistance des paramètres
│   │   └── lib.rs              # Initialisation de l'app et enregistrement des commandes
│   └── tauri.conf.json     # Définitions des fenêtres et configuration du paquet
└── .kiro/                  # Spécifications et steering du Spec-Driven Development
```

## Vue d'ensemble de l'architecture

Le frontend (React) et le backend (Rust/Tauri) communiquent via des commandes et des événements Tauri.

- **Commandes Tauri** : `initialize_clock_window`, `open_settings_window`, `apply_settings`, `get_applied_settings`, `retry_settings_persistence`, `quit_application`, `native_runtime_capabilities`
- **Événements** : les changements de paramètres (`settings-changed`) et l'état de visibilité de la fenêtre de l'horloge sont diffusés entre les fenêtres, de sorte que les modifications effectuées dans la fenêtre des paramètres se reflètent immédiatement dans la fenêtre de l'horloge.
- **Persistance** : `apply_settings` enregistre les paramètres dans le magasin ; si l'enregistrement échoue, les paramètres sont conservés dans un état volatil (`volatile`) et peuvent être réessayés via `retry_settings_persistence`.
- **Résidence dans la zone de notification** : fermer la fenêtre de l'horloge ne fait que la masquer ; le processus continue de s'exécuter et vous pouvez utiliser « Paramètres », « Restaurer » et « Quitter » depuis la zone de notification.

Consultez `.kiro/specs/minimal-always-on-top-clock/` pour les exigences et la conception détaillées.

## Licence

Distribué sous la [licence MIT](../LICENSE).
