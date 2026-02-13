# Deploying the Web App (Vercel + Railway)

The web app runs the Next.js frontend on **Vercel** and the compression API (FastAPI + Ghostscript + qpdf) on **Railway**. The frontend calls the API using `NEXT_PUBLIC_COMPRESS_API_URL`.

## 1. Deploy the compression server to Railway

1. Go to [railway.app](https://railway.app) and sign in (e.g. with GitHub).
2. **New Project** → **Deploy from GitHub repo** → select `thoughtform-co/pdf-compressor`.
3. **Use the Dockerfile (required).** The repo includes a `railway.toml` that forces the **Dockerfile** builder and path `server/Dockerfile`. Do **not** set a **Root Directory** in the service — the build must run from the repo root so the Dockerfile can `COPY server/` and `COPY src/`. If you see "No start command was found", Railway is still using Railpack: in **Settings** → **Build** → **Builder**, choose **Dockerfile** (and ensure Root Directory is empty).
4. Add a **Public Domain**: **Settings** → **Networking** → **Public Networking** → **Generate Domain** so the app gets a URL like `https://<name>.up.railway.app`.
5. **Variables**: add `ALLOWED_ORIGINS` with your Vercel app URL (e.g. `https://your-app.vercel.app`). For multiple origins use a comma-separated list. Leave unset or set to `*` to allow all.
6. Deploy. Once the build finishes, note the public URL.

## 2. Vercel frontend (pdf-compressor project)

The frontend is a Next.js app in the `web/` directory. Vercel must build from that folder.

1. **Root Directory:** In **Settings** → **Source** (or **General**), set **Root Directory** to `web`. Leave **Custom Start Command** empty — Vercel’s Next.js preset handles build and run. If Root Directory was wrong, you’ll have seen “There is no start command found” until this is set.
2. **Environment Variables:** **Settings** → **Environment Variables**.
3. Add:
   - **Name**: `NEXT_PUBLIC_COMPRESS_API_URL`
   - **Value**: your Railway URL, e.g. `https://pdf-compressor-api.up.railway.app` (no trailing slash).
   - Apply to **Production** (and Preview if you want).
4. **Redeploy** the project (Deployments → ⋮ on latest → Redeploy) so the new variable is used.

After redeploy, the Vercel app will use the Railway server for "Server (best)" mode. Users will see "Server connected" when the API is reachable.

## Local development

- **Frontend**: `cd web && npm run dev` (uses `NEXT_PUBLIC_COMPRESS_API_URL=http://localhost:8080` from `.env.local`).
- **API**: `cd server && python -m uvicorn main:app --port 8080` (with Ghostscript and qpdf installed). No `ALLOWED_ORIGINS` needed (defaults to `*`).

## Railway notes

- Free tier: 500 hours/month; service may sleep after inactivity. First request after sleep can take a few seconds (cold start).
- The Dockerfile installs Ghostscript and qpdf in the image; no extra setup required on Railway.
