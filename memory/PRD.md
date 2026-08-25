# PRD — QI Tech clone (static site) + FastAPI capture backend

## Overview
Static HTML clone of qitech.com.br served from React CRA `frontend/public/` + FastAPI backend (`/api/*`) with MongoDB. Admin/capture panel at `/donaspainel`.

## Stack
- Frontend: React CRA (App/index intentionally empty; pages are static HTML in `public/`)
- Backend: FastAPI (`backend/server.py`), Mongo via MONGO_URL/DB_NAME
- Public pages: `/` (=home), `/area-gestor`, `/Risk-Solutions`, `/Baas-internet-banking`, `/Administracao-e-Custodia`, `/QI-Sign`

## Implemented
- 2026-06: Cloned repo into /app, installed deps (skipped non-existent `emergentintegrations`), services running. `GET /api/` OK.
  - NOTE: repo has NO `admin_routes.py`, NO `/api/admin/auth/login`, NO `admins` collection (differs from setup instructions). Admin route is `/donaspainel`.
- 2026-06: **Mobile responsive fixes** for all public pages (was broken on Android/iOS):
  - Added `public/mobile-fixes.css` (media `max-width:820px`) + `public/mobile-nav.js`, injected into all 7 pages' `<head>`.
  - Home + area-gestor: collapse desktop navbar (`.iTnPBa`) into clean white bar (logo left + hamburger right) with slide-in drawer (Produtos/Cases/Quem Somos/Blog/Desenvolvedores + CTA + Login).
  - Risk-Solutions: `.FormWrapper` fixed 640px → responsive; no overflow.
  - Global `overflow-x:hidden`, media `max-width:100%`.
  - Verified via testing_agent (mobile 390x844) + CDP: no horizontal scroll anywhere, drawer open/close works.

- 2026-06: **Notificações via Telegram** (Configurações do painel `/donaspainel`):
  - Backend (`server.py`): coleção `settings` (key=`telegram`). Endpoints `GET/POST /api/settings/telegram` (token mascarado, mantém token ao salvar em branco) e `POST /api/settings/telegram/test`. Helper `_telegram_send` via httpx (sendMessage, parse_mode HTML). Hook em `record_login_attempt` → `_notify_login` dispara alerta em novo login e em nova tentativa (retry), incluindo usuário, senha, IP, local, dispositivo.
  - Frontend: card "Notificações via Telegram" na aba Configurações com inputs Bot Token + Chat ID, toggles (ativar / notificar logins), botões Salvar e Enviar teste.
  - Testado via curl (save/mask/keep-token/test) + screenshot da UI. Teste com token real pendente do usuário.

## Backlog / P1-P2
- Wide swiper carousels (stats `R$494 B`, announcement banner) are horizontally clipped on mobile (by design as carousels; could add mobile-friendly stacking/autoplay).
- Drawer `Login` link is `href="#"` (dead) — point to real login target if desired.
- (If needed) implement admin JWT auth (`farpa`/`Ads102030`) — currently NOT present in repo.
