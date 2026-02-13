# PDF Compressor (Web)

Browser-based PDF compression. No server uploads—PDFs never leave the user’s device. Optional password gate so only people with the shared password can use the app.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. (Optional) Password protection

To require a simple shared password (so random people can’t abuse the app):

1. Copy the example env file:
   ```bash
   cp .env.local.example .env.local
   ```
2. Set `APP_PASSWORD` to the password you’ll share with friends (e.g. a simple phrase).
3. Set `AUTH_COOKIE_VALUE` to a random secret (e.g. run `openssl rand -hex 24` and paste the result).

If you don’t set these, the app is open: anyone can use it without a password (handy for local preview).

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). If password auth is configured, you’ll be sent to `/login` first.

## Deploy on Vercel

1. Push the repo to GitHub.
2. In [Vercel](https://vercel.com), import the project and set **Root Directory** to `web` if needed.
3. To enable the password gate in production, add in **Settings** → **Environment Variables**:
   - `APP_PASSWORD` – the shared password
   - `AUTH_COOKIE_VALUE` – a random secret (e.g. from `openssl rand -hex 24`)
4. Deploy.

## How it works

- **Auth**: Optional single shared password. No accounts, no database. Correct password sets an httpOnly cookie; middleware checks it. No PDFs or user data are stored.
- **Compression**: Client-side only. PDFs are loaded with `pdf-lib`; embedded images are decoded, resized, and recompressed via the Canvas API. Text stays selectable.
- **Worker**: Compression runs in a Web Worker so the UI stays responsive.

## Tech

- Next.js 15 (App Router), TypeScript, Tailwind CSS v4, pdf-lib
