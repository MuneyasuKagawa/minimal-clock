# Minimal Clock

Una pequeña aplicación de reloj siempre visible para el escritorio de Windows que te permite vigilar la hora actual mientras trabajas. Mantiene un reloj translúcido por encima de las demás ventanas, te permite cambiar lo que muestra según tus necesidades y reside en la bandeja del sistema, por lo que sigue funcionando hasta que lo cierras de forma explícita.

- Ventana compacta translúcida, sin marco ni barra de título
- Conmutador de «siempre visible» (Always on Top)
- Modos de visualización digital y analógico (simple / con números / con marcas)
- Formato de 12 / 24 horas, visualización de segundos, dos puntos parpadeantes y fecha opcional
- Residente en la bandeja del sistema: cerrar la ventana mantiene la aplicación en ejecución
- La configuración se guarda localmente y se restaura en el siguiente inicio

## Léelo en otros idiomas

- [English (Inglés)](../README.md)
- [日本語 (Japonés)](README.ja.md)
- [Italiano (Italiano)](README.it.md)
- [Français (Francés)](README.fr.md)
- [Русский (Ruso)](README.ru.md)
- [中文 (Chino)](README.zh.md)
- [한국어 (Coreano)](README.ko.md)

## Pila tecnológica

| Capa | Tecnología |
| --- | --- |
| Capa de escritorio | [Tauri 2](https://tauri.app/) (Rust) |
| Frontend | React 19 + TypeScript |
| Compilación / servidor de desarrollo | Vite 7 |
| Pruebas | Vitest + Testing Library (frontend), `cargo test` (Rust) |
| Persistencia de la configuración | `tauri-plugin-store` |
| Ejecutor de tareas | [mise](https://mise.jdx.dev/) |

Es una configuración multiventana con dos entradas WebView: la ventana del reloj (`index.html`) y la ventana de configuración (`settings.html`).

## Requisitos

- Node.js (una versión que incluya `npm`)
- Cadena de herramientas de Rust (`cargo`): necesaria para compilar Tauri
- Windows (la plataforma de destino de esta aplicación)
- [Requisitos previos de Tauri 2](https://tauri.app/start/prerequisites/) (WebView2, etc.)

## Configuración

```bash
npm install
```

## Desarrollo

Con mise:

```bash
mise run dev             # Inicia la aplicación de escritorio Tauri
mise run frontend:dev    # Solo el frontend (servidor de desarrollo de Vite)
```

Ejecutando los scripts de npm directamente:

```bash
npm run tauri:dev   # Inicia la aplicación de escritorio Tauri
npm run dev         # Solo el servidor de desarrollo de Vite (http://localhost:1420)
```

## Compilación

```bash
mise run build        # Compila la aplicación de escritorio Tauri
# o
npm run tauri:build   # Igual que arriba
npm run build         # Solo el frontend (comprobación de tipos + compilación de Vite)
```

## Pruebas y comprobación de tipos

```bash
npm test          # Vitest (frontend)
npm run typecheck # Comprobación de tipos con tsc
cargo test        # Pruebas del lado de Rust (ejecutar dentro del directorio src-tauri)
```

## Estructura de directorios

```
.
├── index.html              # Entrada de la ventana del reloj
├── settings.html           # Entrada de la ventana de configuración
├── src/                    # Frontend (React + TypeScript)
│   ├── clock-entry.tsx     # Monta la ventana del reloj
│   ├── settings-entry.tsx  # Monta la ventana de configuración
│   ├── clock/              # Componentes de visualización del reloj (digital/analógico/menú)
│   ├── settings/           # Interfaz de configuración
│   ├── domain/             # Modelos de dominio (esquema de configuración, eventos)
│   ├── services/           # Integración nativa, planificador, hooks de suscripción a eventos
│   └── styles/             # clock.css / settings.css
├── src-tauri/              # Backend de Tauri (Rust)
│   ├── src/
│   │   ├── commands.rs         # Comandos de Tauri invocados desde el frontend
│   │   ├── desktop_runtime.rs  # Estado de ventana / bandeja / tiempo de ejecución
│   │   ├── settings_store.rs   # Persistencia de la configuración
│   │   └── lib.rs              # Inicialización de la app y registro de comandos
│   └── tauri.conf.json     # Definiciones de ventana y configuración del paquete
└── .kiro/                  # Especificaciones y guía de Spec-Driven Development
```

## Resumen de la arquitectura

El frontend (React) y el backend (Rust/Tauri) se comunican mediante comandos y eventos de Tauri.

- **Comandos de Tauri**: `initialize_clock_window`, `open_settings_window`, `apply_settings`, `get_applied_settings`, `retry_settings_persistence`, `quit_application`, `native_runtime_capabilities`
- **Eventos**: los cambios de configuración (`settings-changed`) y el estado de visibilidad de la ventana del reloj se difunden entre las ventanas, de modo que los cambios realizados en la ventana de configuración se reflejan de inmediato en la ventana del reloj.
- **Persistencia**: `apply_settings` guarda la configuración en el almacén; si el guardado falla, la configuración se mantiene en un estado volátil (`volatile`) y se puede reintentar mediante `retry_settings_persistence`.
- **Residencia en la bandeja**: cerrar la ventana del reloj solo la oculta; el proceso sigue ejecutándose y puedes usar «Configuración», «Restaurar» y «Salir» desde la bandeja.

Consulta `.kiro/specs/minimal-always-on-top-clock/` para ver los requisitos y el diseño detallados.

## Licencia

Publicado bajo la [Licencia MIT](../LICENSE).
