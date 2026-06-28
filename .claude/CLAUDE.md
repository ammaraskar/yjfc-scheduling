# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start Vite dev server
pnpm build        # TypeScript check + production build
pnpm lint         # Run ESLint
pnpm test         # Run Vitest tests
pnpm test -- --run src/api/auth.test.ts  # Run a single test file
```

## Architecture

This is a React 19 + TypeScript SPA (Vite, Tailwind CSS 4, shadcn/ui) that acts as a custom frontend for the **Yellow Jacket Flying Club** at KPDK. It wraps the third-party **Schedule Master** service, which has no public API — all data is scraped from HTML responses via a Cloudflare Worker CORS proxy (`sm-cors-proxy.ammar-askar.workers.dev`).

### Data Flow

```
User → React UI → src/api/ → Cloudflare Worker (CORS proxy) → schedulemaster.com
```

Authentication is form-based; the session cookie is stored in `localStorage` and replayed on each request. User info (name, email) is cached in `localStorage` after first login.

### Key Modules

- **[src/api/](src/api/)** — All Schedule Master integration. `auth.ts` handles login, `schedule.ts` fetches and parses the schedule XML/HTML, `aircraft.ts` scrapes live maintenance data (TTAF, TSMOH, squawks, inspections). Parsing is brittle HTML scraping — handle with care.
- **[src/pages/](src/pages/)** — Four route views: `Login`, `Schedule` (main timeline grid), `Aircraft` (fleet list), `AircraftDetail` (per-tail maintenance status).
- **[src/data/aircraft.ts](src/data/aircraft.ts)** — Static aircraft catalog with specs, photos, and tail numbers for the 5 club planes + 1 simulator.
- **[src/auth.tsx](src/auth.tsx)** / **[src/theme.tsx](src/theme.tsx)** — React contexts for auth state and light/dark theme. Theme respects system preference with manual override.
- **[src/App.tsx](src/App.tsx)** — Router setup using **Wouter** with hash-based routing (`#/route`).

### Schedule View

The schedule grid (`src/pages/Schedule.tsx`) renders a 6am–9pm timeline. Events are color-coded by class names returned from Schedule Master: `maint`, `predone` (pre-check done), `ovly` (overlay/conflict), and default (regular reservation). Multi-day events are handled specially — see the `handleSupersededSchedules` logic.

### Routing

Uses **Wouter** with hash-based routing for GitHub Pages compatibility. Routes: `/login`, `/schedule`, `/aircraft`, `/aircraft/:tail`.

### Deployment

GitHub Actions deploys the `dist/` folder to GitHub Pages on push to `main`. The app is also a PWA (vite-plugin-pwa + Workbox service worker).

### Schedule Master Date Format

Schedule Master expects dates as `MM/DD/YYYY`. The API layer converts to/from this format — don't bypass it with raw ISO strings.
