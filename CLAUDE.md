# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project context

This is the **backend** of the Enoteca de Toma site. The project is two independent git
repos with separate remotes and separate deploy pipelines:

- `backend/` (this repo) → `momoelo1/detoma-backend`, deployed to **Vercel**
- `frontend/` (sibling folder) → `momoelo1/enoteca-detoma`, deployed to **GitHub Pages**

A change is never "committed" project-wide — check `git status` in each repo separately.

**Pushing is deploying.** There is no workflow file here because Vercel auto-deploys
`main` on push. There is no staging environment: the database is **production** Mongo
Atlas and images go to production Cloudinary. Never push without an explicit go-ahead.

## Commands

```bash
npm run dev        # nodemon server.js
npm start          # node server.js
node scripts/importAlimentari.js --dry-run
```

**There is no test suite** — no test runner is installed and no test files exist.
Verification is done by probing the running API directly (curl, `requests/*.rest`, throwaway
node scripts). Don't claim a change is "tested"; say what you actually ran.

`utils/config.js` validates `MONGODB_URI`, `SECRET` and `CLIENT_URL` at boot and throws a
clear error if any is missing, so a misconfigured env fails fast instead of crashing later.

`PORT` defaults to **3002** here, but the frontend's fallback API URL is hardcoded to
**3001**; the local `.env` sets `PORT=3001` to reconcile them. If local API calls 404 from
the frontend, check that first.

## Architecture

`server.js` only calls `app.listen`. All wiring lives in `app.js`, which **exports the
app** so Vercel can use it as a serverless handler — don't move `listen` into `app.js`.

### Four resources, one shape

When adding a resource, mirror an existing one rather than inventing a pattern.

| Model | Controller | Route |
|---|---|---|
| `Wine` | `controllers/wines.js` | `/api/wines` |
| `Beer` | `controllers/beers.js` | `/api/beers` |
| `Alimentare` | `controllers/alimentari.js` | `/api/alimentari` |
| `User` | `controllers/users.js`, `login.js` | `/api/users`, `/api/login` |

The shared contract:

- `GET /` and `GET /:id` are **public and unauthenticated by design.** The shop's static
  site is an anonymous client, so the whole catalogue is world-readable. An API key in the
  frontend bundle would be theatre. Don't "fix" this.
- All writes are guarded by `tokenExtractor`.
- `DELETE /:id/image` removes **only** the photo (Cloudinary asset + the `img` field),
  leaving the product. Distinct from `DELETE /:id`.
- Category enums live as a `CATEGORIES` static on the model and are re-validated in the
  controller before saving, so the client gets a readable message rather than a Mongoose one.
- Every schema has a `toJSON` transform mapping `_id` → `id` and dropping `__v`. Client code
  always uses `item.id`.

Two deliberate departures in `Alimentare`, both requested by the client: `sottocategoria` is
**free text with no enum** (the admin form offers existing values via `<datalist>` but
accepts new ones, and the Alimentari page derives its groups from whatever values exist),
and `formato` is a **Number in grams**, not the `cl` used for beer.

`Wine.annate` is a subdocument array of `{ anno, prezzo }`. `anno` is required for every
category **except champagne**, via a `required` function reading `this.parent().category` —
if another category stops asking for the year in the admin form, it must be added there too
or saving will fail.

### Images

Photos arrive as **base64 data URIs inside the JSON body** (the admin form encodes the
file). The controller passes `req.body.img` through `utils/cloudinary.js` `uploadImage()`,
which uploads and stores the resulting URL. This is why `express.json()` carries a 15mb
limit app-wide — a known bandwidth trade-off, since bodies are parsed before auth can
return 401.

### Auth is single-account

There is exactly one user; being authenticated *is* being the owner. There are no roles or
permissions — don't add a role check. `controllers/users.js` returns 403 on an attempt to
create a second account.

`utils/middleware.js` accepts the token from **either** an httpOnly cookie **or** an
`Authorization: Bearer` header. Both exist on purpose: the cookie is cross-site between
GitHub Pages and Vercel, and Safari's ITP drops it even with `SameSite=None`, so login also
returns the raw token for the client to send as a header. Don't remove either path.

`app.js` rate-limits `/api/login` (10 attempts / 15 min, successful ones skipped). Note that
`express-rate-limit` is **in-memory and Vercel is multi-instance**, so the real limit is
weaker than it looks; a shared store (e.g. Upstash) would be the proper fix.

### Friendly errors

`errorHandler` in `utils/middleware.js` translates Mongoose errors into plain Italian
sentences via `FRIENDLY_FIELD_MESSAGES` — the admin is a shopkeeper, not a developer. Raw
Mongoose text ("Wine validation failed: annate.0.anno: Path `anno` is required.") means
nothing to them. **Add an entry there whenever you add a required field.**

### Mongo connection on serverless

`app.js` keeps the `mongoose.connect()` **promise** and awaits it in a middleware placed
ahead of the DB routes, instead of relying on Mongoose's internal 10s buffering — a Vercel
cold start can exceed it. `/health` is registered *before* that middleware so it answers
even when the DB isn't ready. **Preserve this ordering.**

### CORS

`app.js` allows the origins of `CLIENT_URL` / `CLIENT_URL_ALT`, plus any `localhost` and
LAN `192.168/10./172.16-31` origins on port 5173 — the last one so the site can be tested
from a real phone against a local backend.

## One-off scripts

`scripts/` holds only live, runnable scripts (`createAdmin.js`, `importBirre.js`,
`importRossi.js`, `importAlimentari.js`). Spent migrations are **deleted**, not kept with
their data stripped out.

These connect to the **production** Atlas database via `.env`. `importAlimentari.js`
supports `--dry-run`; add the same flag to any new script and run it first.

`scripts/import-assets/` is gitignored (8.4MB of photos) and currently orphaned — the
Cloudinary upload block was removed from the import script, so products are created with
`img: ""` and photos are attached by hand from the admin panel.

## Language

User-facing error messages and code comments are in **Italian** (the admin panel is
Italian-only). Match it, and keep domain terms as the shop uses them (`annate`,
`sottocategoria`, `formato`, `prezzo`).
