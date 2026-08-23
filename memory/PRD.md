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

## Backlog / P1-P2
- Wide swiper carousels (stats `R$494 B`, announcement banner) are horizontally clipped on mobile (by design as carousels; could add mobile-friendly stacking/autoplay).
- Drawer `Login` link is `href="#"` (dead) — point to real login target if desired.
- (If needed) implement admin JWT auth (`farpa`/`Ads102030`) — currently NOT present in repo.
