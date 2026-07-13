<h1 align="center">Vardag</h1>

<p align="center"><strong>A calm, self-hosted family organizer for everyday life.</strong></p>
<p align="center">Tasks · Events · Shopping · Meals · Family</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-early_beta-F59E0B" alt="Project status: Early beta">
  <img src="https://img.shields.io/badge/PWA-installable-3DA8FF" alt="Installable PWA">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-65D995" alt="MIT License"></a>
  <a href="https://github.com/Roinur/Vardag/actions/workflows/ci.yml"><img src="https://github.com/Roinur/Vardag/actions/workflows/ci.yml/badge.svg" alt="CI status"></a>
</p>

Vardag is a mobile-first family organizer for tasks, events, shopping, meals, leftovers, and shared food votes. It combines local-first storage with Google accounts, realtime family sync, database-enforced privacy, and background assignment notifications.

<p align="center"><sub><strong>Project status: Early beta.</strong> Usable and actively developed; self-hosters should expect occasional schema and setup changes before a stable release.</sub></p>

Each family deploys and owns its own instance. This repository does not connect to a shared Vardag service and does not include a hosted demo, production URL, Supabase project, or credentials.

## Overview

<p align="center">
  <img src="docs/screenshots/vardag-today-light.png" alt="Vardag Today overview in light mode" width="540">
</p>
<p align="center"><strong>Today</strong> brings the family's tasks, events, shopping, and quick capture into one calm overview.</p>

## Feature highlights

<table align="center" width="720">
  <tr>
    <td width="300" valign="middle">
      <h3>Plan the day</h3>
      Capture tasks quickly, set priorities and repeats, then focus on what matters now.
    </td>
    <td width="420" align="center"><img src="docs/screenshots/vardag-tasks-light.png" alt="Tasks, priorities, and daily planning in Vardag" width="270"></td>
  </tr>
  <tr>
    <td width="300" valign="middle">
      <h3>Keep everyone in sync</h3>
      Share events and assignments with the whole family or the people they concern.
    </td>
    <td width="420" align="center"><img src="docs/screenshots/vardag-events-light.png" alt="Shared family calendar in Vardag" width="270"></td>
  </tr>
  <tr>
    <td width="300" valign="middle">
      <h3>Run the household</h3>
      Keep shopping, meal decisions, family votes, and leftovers in the same shared flow.
    </td>
    <td width="420" align="center">
      <img src="docs/screenshots/vardag-shopping-light.png" alt="Shared shopping in Vardag" width="190">
      <img src="docs/screenshots/vardag-food-light.png" alt="Meals and family food votes in Vardag" width="190">
    </td>
  </tr>
</table>

<details>
<summary><strong>View all screenshots</strong></summary>

<br>

<table align="center" width="600">
  <tr>
    <th width="300">Light</th>
    <th width="300">Dark</th>
  </tr>
  <tr>
    <td align="center"><img src="docs/screenshots/vardag-today-light.png" alt="Today in light mode" width="230"><br><strong>Today</strong></td>
    <td align="center"><img src="docs/screenshots/vardag-today-dark.png" alt="Today in dark mode" width="230"><br><strong>Today</strong></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/screenshots/vardag-tasks-light.png" alt="Tasks in light mode" width="230"><br><strong>Tasks</strong></td>
    <td align="center"><img src="docs/screenshots/vardag-tasks-dark.png" alt="Tasks in dark mode" width="230"><br><strong>Tasks</strong></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/screenshots/vardag-events-light.png" alt="Events in light mode" width="230"><br><strong>Events</strong></td>
    <td align="center"><img src="docs/screenshots/vardag-events-dark.png" alt="Events in dark mode" width="230"><br><strong>Events</strong></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/screenshots/vardag-shopping-light.png" alt="Shopping in light mode" width="230"><br><strong>Shopping</strong></td>
    <td align="center"><img src="docs/screenshots/vardag-shopping-dark.png" alt="Shopping in dark mode" width="230"><br><strong>Shopping</strong></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/screenshots/vardag-food-light.png" alt="Food in light mode" width="230"><br><strong>Food and votes</strong></td>
    <td align="center"><img src="docs/screenshots/vardag-food-dark.png" alt="Food in dark mode" width="230"><br><strong>Food and votes</strong></td>
  </tr>
</table>

</details>

<p align="center"><sub>Screenshots use synthetic local data. No real family account or hosted instance is included.</sub></p>

## Features

- Family and personal views across Today, Tasks, Events, Shopping, and Food.
- Google sign-in with family invite codes and member profiles.
- Assign records to the whole family, one person, or selected family members.
- Supabase RLS for personal and targeted records.
- Realtime sync and atomic completion, shopping, and food-vote operations.
- Natural-language **Detect cards** composer for Swedish and English entries.
- Recurring tasks and events with daily, weekly, biweekly, and monthly rules.
- Barcode/product-photo support for shopping items.
- Meal decisions, restricted family votes, random tie-break animation, and leftovers.
- Installable PWA with dark/light/system themes, offline shell caching, and Android/iOS icons.
- Web Push for new assignments after a device opts into notifications.

## Deploy Your Own

Vardag is intentionally a do-it-yourself project. A complete installation needs:

1. A fresh Supabase project.
2. A Google OAuth web application.
3. Your own frontend deployment.
4. Your own VAPID keys for Web Push.

Follow [SUPABASE_SETUP.md](SUPABASE_SETUP.md) for the complete step-by-step tutorial.

## Quick Local Start

<table>
  <tr>
    <th width="50%">PowerShell · Windows</th>
    <th width="50%">Bash · Linux/macOS</th>
  </tr>
  <tr>
    <td valign="top"><pre><code>git clone https://github.com/Roinur/Vardag.git
cd Vardag
npm install
Copy-Item .env.example .env.local
npm run dev</code></pre></td>
    <td valign="top"><pre><code>git clone https://github.com/Roinur/Vardag.git
cd Vardag
npm install
cp .env.example .env.local
npm run dev</code></pre></td>
  </tr>
</table>

Fill `.env.local` with credentials from your own Supabase project before testing account and family features.

## Architecture

- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Local data:** Dexie/IndexedDB
- **Authentication and sync:** Supabase Auth, Postgres, Realtime, and RLS
- **Server logic:** Postgres RPC functions and a Supabase Edge Function
- **Notifications:** Web Push with per-installation VAPID keys
- **Hosting:** Any static Vite-compatible provider

Records store the creator separately from recipients. Personal records are readable only by their owner. Targeted family records are readable by their creator and selected recipients. Unassigned family records remain collaborative for the whole household.

## Commands

```powershell
npm run dev          # Local Vite development server
npm run dev:lan      # Development server available on the LAN
npm run build        # Type-check and production build
npm run preview      # Preview the production build
npm run test:parser  # Detect Cards parser scenarios
npm run test:i18n    # Swedish/English and UTF-8 checks
npm run test:scope   # Sharing and RLS contract checks
```

## Security Notes

- Never commit `.env.local`, Supabase service-role keys, Google client secrets, access tokens, or VAPID private keys.
- The Supabase publishable key and VAPID public key are intentionally public browser values.
- Run every migration in filename order through `npx supabase db push`.
- Treat family invite codes as invitations, not passwords.

See [SECURITY.md](SECURITY.md) for reporting guidance.

## Contributing

Bug fixes, translations, accessibility improvements, and self-hosting documentation are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## Third-Party Software

Vardag uses React, Vite, Supabase JS, Dexie, Lucide, Tailwind CSS, and other open-source packages. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## License

Vardag is licensed under the MIT License. See [LICENSE](LICENSE).
