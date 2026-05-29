# Minimal Clock

작업하는 동안 현재 시각을 항상 확인할 수 있게 해 주는, Windows 데스크톱용 소형 항상 위 표시 시계 앱입니다. 반투명 시계를 다른 창 위에 유지하고, 필요에 따라 표시 내용을 전환할 수 있으며, 시스템 트레이에 상주하므로 명시적으로 종료할 때까지 계속 실행됩니다.

- 반투명·테두리 없음·제목 표시줄 없는 소형 창
- "항상 위에 표시"(Always on Top) 전환
- 디지털 및 아날로그(심플 / 숫자 / 눈금) 표시 모드
- 12 / 24시간 표기, 초 표시, 콜론 깜빡임, 선택적 날짜 표시
- 시스템 트레이 상주 — 창을 닫아도 앱은 계속 실행
- 설정은 로컬에 저장되어 다음 실행 시 복원

## 다른 언어로 읽기

- [English (영어)](../README.md)
- [日本語 (일본어)](README.ja.md)
- [Español (스페인어)](README.es.md)
- [Italiano (이탈리아어)](README.it.md)
- [Français (프랑스어)](README.fr.md)
- [Русский (러시아어)](README.ru.md)
- [中文 (중국어)](README.zh.md)

## 기술 스택

| 레이어 | 기술 |
| --- | --- |
| 데스크톱 셸 | [Tauri 2](https://tauri.app/) (Rust) |
| 프런트엔드 | React 19 + TypeScript |
| 빌드 / 개발 서버 | Vite 7 |
| 테스트 | Vitest + Testing Library (프런트엔드), `cargo test` (Rust) |
| 설정 영속화 | `tauri-plugin-store` |
| 태스크 러너 | [mise](https://mise.jdx.dev/) |

시계 창(`index.html`)과 설정 창(`settings.html`)이라는 두 개의 WebView 엔트리를 가진 다중 창 구성입니다.

## 요구 사항

- Node.js (`npm`이 포함된 버전)
- Rust 툴체인(`cargo`) — Tauri 빌드에 필요
- Windows (이 앱의 대상 플랫폼)
- [Tauri 2 사전 요구 사항](https://tauri.app/start/prerequisites/) (WebView2 등)

## 설정

```bash
npm install
```

## 개발

mise를 사용하는 경우:

```bash
mise run dev             # Tauri 데스크톱 앱 실행
mise run frontend:dev    # 프런트엔드만 (Vite 개발 서버)
```

npm 스크립트를 직접 실행하는 경우:

```bash
npm run tauri:dev   # Tauri 데스크톱 앱 실행
npm run dev         # Vite 개발 서버만 (http://localhost:1420)
```

## 빌드

```bash
mise run build        # Tauri 데스크톱 앱 빌드
# 또는
npm run tauri:build   # 위와 동일
npm run build         # 프런트엔드만 (타입 검사 + Vite 빌드)
```

## 테스트 및 타입 검사

```bash
npm test          # Vitest (프런트엔드)
npm run typecheck # tsc를 통한 타입 검사
cargo test        # Rust 측 테스트 (src-tauri 디렉터리에서 실행)
```

## 디렉터리 구조

```
.
├── index.html              # 시계 창 엔트리
├── settings.html           # 설정 창 엔트리
├── src/                    # 프런트엔드 (React + TypeScript)
│   ├── clock-entry.tsx     # 시계 창 마운트
│   ├── settings-entry.tsx  # 설정 창 마운트
│   ├── clock/              # 시계 표시 컴포넌트 (디지털/아날로그/메뉴)
│   ├── settings/           # 설정 UI
│   ├── domain/             # 도메인 모델 (설정 스키마, 이벤트)
│   ├── services/           # 네이티브 연동·스케줄러·이벤트 구독 훅
│   └── styles/             # clock.css / settings.css
├── src-tauri/              # Tauri (Rust) 백엔드
│   ├── src/
│   │   ├── commands.rs         # 프런트엔드에서 호출되는 Tauri 명령
│   │   ├── desktop_runtime.rs  # 창 / 트레이 / 런타임 상태
│   │   ├── settings_store.rs   # 설정 영속화
│   │   └── lib.rs              # 앱 초기화 및 명령 등록
│   └── tauri.conf.json     # 창 정의 및 번들 설정
└── .kiro/                  # Spec-Driven Development 사양 및 steering
```

## 아키텍처 개요

프런트엔드(React)와 백엔드(Rust/Tauri)는 Tauri 명령과 이벤트를 통해 통신합니다.

- **Tauri 명령**: `initialize_clock_window`, `open_settings_window`, `apply_settings`, `get_applied_settings`, `retry_settings_persistence`, `quit_application`, `native_runtime_capabilities`
- **이벤트**: 설정 변경(`settings-changed`)과 시계 창의 표시 상태(visibility)가 창 간에 브로드캐스트되어, 설정 창에서 변경한 내용이 즉시 시계 창에 반영됩니다.
- **영속화**: `apply_settings`가 설정을 스토어에 저장하며, 저장에 실패하면 설정은 휘발 상태(`volatile`)로 유지되고 `retry_settings_persistence`로 재시도할 수 있습니다.
- **트레이 상주**: 시계 창을 닫아도 숨겨질 뿐 프로세스는 계속 실행되며, 트레이에서 "설정", "복원", "종료"를 사용할 수 있습니다.

자세한 요구 사항과 설계는 `.kiro/specs/minimal-always-on-top-clock/`를 참조하세요.

## 라이선스

[MIT License](../LICENSE) 하에 배포됩니다.
