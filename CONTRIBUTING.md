# Contributing

## Development

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Use your own disposable Supabase project for integration work. Never commit credentials, production project refs, real family data, screenshots containing invite codes, or exported browser storage.

## Before a pull request

```powershell
npm run build
npm run test:parser
npm run test:i18n
npm run test:scope
```

Keep migrations additive and timestamped. When changing record visibility, update both the TypeScript visibility contract and the matching Supabase RLS/RPC migration. Include Swedish and English text for new visible labels.

## Scope

Good contributions include bug fixes, accessibility, translations, parser scenarios, privacy hardening, offline behavior, and setup documentation. Keep the product mobile-first and avoid adding a dependency when the existing stack already solves the problem.
