# Self-hosting Vardag

Vardag is designed for one independently operated family per deployment. Every installation uses its own Supabase project, Google OAuth application, VAPID keys, and optional Vercel project. The repository contains no hosted backend, shared tenant, production URL, or usable credentials.

## Prerequisites

- Node.js 20 or newer
- A Supabase account and a new project
- A Google Cloud project
- A hosting provider for the Vite frontend, such as Vercel
- Supabase CLI: `npx supabase --version`

## 1. Install locally

```powershell
git clone https://github.com/Roinur/Vardag.git
cd Vardag
npm install
Copy-Item .env.example .env.local
```

Do not commit `.env.local`.

## 2. Create and migrate Supabase

Create a new project in Supabase, then copy its project ref from **Project Settings > General**.

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

The migrations create profiles, isolated family households, personal and targeted record policies, atomic completion/voting functions, realtime records, and push subscriptions.

## 3. Configure Google OAuth

In Google Cloud Console:

1. Configure the OAuth consent screen.
2. Create an **OAuth client ID** for a Web application.
3. Add `http://localhost:5173` as an authorized JavaScript origin for local development.
4. Add `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback` as an authorized redirect URI.

In Supabase:

1. Open **Authentication > Providers > Google**.
2. Enable Google and enter the client ID and client secret.
3. Under **Authentication > URL Configuration**, set your deployed site URL.
4. Add `http://localhost:5173/**` and your deployed domain with `/**` to Redirect URLs.

## 4. Configure environment variables

Find the project URL and publishable key under **Project Settings > API**.

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
VITE_VAPID_PUBLIC_KEY=YOUR_PUBLIC_VAPID_KEY
```

Only the publishable Supabase key belongs in the frontend. Never expose the service-role key or VAPID private key through a `VITE_` variable.

## 5. Enable background push

Generate one VAPID pair:

```powershell
npx web-push generate-vapid-keys
```

Store both keys in Supabase and deploy the function:

```powershell
npx supabase secrets set VAPID_PUBLIC_KEY="YOUR_PUBLIC_KEY" VAPID_PRIVATE_KEY="YOUR_PRIVATE_KEY" VAPID_SUBJECT="mailto:you@example.com"
npx supabase functions deploy notify-task-assignment
```

Put the same public key in `.env.local` and in the hosting provider. The private key stays only in Supabase Secrets.

Each family member must open the installed PWA once and allow notifications before that device can receive assignments in the background.

## 6. Run and deploy

```powershell
npm run dev:lan
```

For a production build:

```powershell
npm run build
```

Deploy the repository to a static Vite-compatible host. For Vercel, import the GitHub repository, add the three `VITE_` variables, and deploy. Add the resulting domain to the Google authorized origins and Supabase redirect URLs.

## Updating an installation

```powershell
git pull
npm install
npx supabase db push
npx supabase functions deploy notify-task-assignment
```

Redeploy the frontend when source code or public environment variables change.
