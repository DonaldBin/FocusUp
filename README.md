# FocusUp

**Focus areas + weekly decide.**

Stop juggling endless todos. Pick a few meaningful focuses, invest real time, and once a week make one clear decision: continue, adjust, pause, or end.

**Live demo:** [https://focusup.base-db.com](https://focusup.base-db.com)

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%2B%20Postgres-3FCF8E?logo=supabase)](https://supabase.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

---

## Why FocusUp?

Most productivity apps reward *adding more*. FocusUp rewards **choosing less**.

| Pain | What FocusUp does |
|------|-------------------|
| Too many goals, no progress | Cap active focuses (**Standard 3** / **Intense 7**) |
| Time disappears without a trace | Start/Pause timers + manual time + outcomes |
| Weekly reviews feel heavy | One account-level decision for *all* focuses |
| Apps die when offline | Queue Start / time / outcomes and sync later |
| “Another dashboard” | Mobile-first PWA — add to your home screen |

Built for people who care about **depth over noise**.

---

## Try it in 60 seconds

1. Open **[focusup.base-db.com](https://focusup.base-db.com)**
2. Sign in with Google
3. Create a focus (name + why)
4. Hit **Start** — or add a manual time entry
5. When the week turns, open **Review** and decide once

No install required. Works in the browser; installable as a PWA on phone or desktop.

---

## Screenshots (mental model)

```
Home          →  timing, recent focuses, pending review
Focus detail  →  total invested · weekly breakdown · editable summary
Review        →  one decision for every focus
Settings      →  plan · review day · timezone · export · delete
```

English UI throughout. Designed mobile-first.

---

## Features

- **Google sign-in** (Supabase Auth)
- **Focus quotas** with paused focuses still counting toward the limit
- **One active timer** at a time (last-write-wins offline)
- **Manual time & outcomes** (text / number / link)
- **Weekly review window** in *your* timezone + review weekday
- **Investment summary** you can edit; append a week when ready
- **CSV export** and **delete account**
- **Offline sync queue** (simulate offline in the UI for testing)
- **PWA** — Add to Home Screen

---

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS 4** + **daisyUI 5**
- **Supabase** (Auth, Postgres, RLS)
- **Vitest** domain/TDD tests
- Deployed example: Hetzner Arm64 + Caddy + Cloudflare DNS

---

## Quick start (local)

### Prerequisites

- Node.js 20+ (22 recommended)
- A [Supabase](https://supabase.com/) project
- Google OAuth enabled in Supabase Auth

### 1. Clone & install

```bash
git clone https://github.com/DonaldBin/FocusUp.git
cd FocusUp
npm install
```

### 2. Environment

```bash
cp .env.example .env.local
```

Fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Production OAuth callback origin (optional locally)
# NEXT_PUBLIC_APP_URL=https://your-domain.com
```

> Never commit `.env.local`. Only `.env.example` is in the repo.

### 3. Database

In the Supabase SQL Editor, run in order:

1. `supabase/migrations/001_init.sql`
2. `supabase/migrations/002_delete_own_account.sql`

### 4. Auth URLs (Supabase → Authentication → URL Configuration)

| Setting | Local | Production example |
|---------|--------|--------------------|
| Site URL | `http://localhost:3000` | `https://your-domain.com` |
| Redirect URLs | `http://localhost:3000/auth/callback` | `https://your-domain.com/auth/callback` |

Google Cloud OAuth client **Authorized redirect URI** should remain:

`https://YOUR_PROJECT.supabase.co/auth/v1/callback`

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Tests

```bash
npm test
```

---

## Project layout

```
app/           # Next.js App Router (pages + API routes)
lib/domain/    # Pure business rules (TDD-friendly)
lib/db/        # Supabase access
lib/sync/      # Offline queue
supabase/      # SQL migrations
tests/         # Vitest
plans/         # Product notes live in the parent monorepo (optional)
```

---

## Privacy & data

- Your focuses, time, and outcomes are **private to your account** (RLS).
- You can **export CSV** or **delete your account** in Settings.
- Placeholder Privacy / Terms pages ship with the app — review before a commercial launch.

---

## Contributing

Ideas, bugs, and PRs are welcome.

1. Fork & branch
2. Keep UI English; keep domain logic tested
3. Open a PR with a short “why”

---

## License

[MIT](./LICENSE) — use it, fork it, build on it.

---

## 中文简介

**FocusUp** = 少数焦点 + 每周一次决定。

- 在线试用：[https://focusup.base-db.com](https://focusup.base-db.com)
- Google 登录后即可创建焦点、计时、补记、周回顾
- 适合想减少目标噪音、认真投入少数方向的人

欢迎 Star、试用反馈与 PR。
