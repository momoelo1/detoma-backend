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

### Five resources, one shape

When adding a resource, mirror an existing one rather than inventing a pattern.

| Model | Controller | Route |
|---|---|---|
| `Wine` | `controllers/wines.js` | `/api/wines` |
| `Distillato` | `controllers/distillati.js` | `/api/distillati` |
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

`Wine.annate` is a subdocument array of `{ anno, formati }`, where each **formato** is
`{ ml, prezzo }` — the bottle that vintage is sold in, with its own price. The same year can
have several (750 and magnum at different prices), which is why the price hangs off the
formato and not off the annata.

`ml` is optional and its absence is meaningful: **empty `ml` means the standard bottle**
(nobody types 750 onto five hundred wines), and a checkbox on each row of the admin form
turns it on, offering the known sizes as a `<select>` that starts on Bottiglia (750).
`prezzo` is optional too but **defaults to `0`** rather than staying absent — a price left
blank in the form means "we stock it, the price isn't in yet", and `0` is what the site
already reads as no price (`utils/prezzo.js` tests `prezzo > 0`). There is no "price on
request" flag: zero *is* that state. A row the admin never touched — no format, no price —
is dropped by the form, so a wine with no price at all stores the annata without `formati`.

`anno` is still required for every category **except champagne**, via a `required` function
reading `this.parent().category` — if another category stops asking for the year in the
admin form, it must be added there too or saving will fail.

`Distillato` copies the `Wine` shape (same `annate[].formati`, multi-photo `img`,
`consigliato`) with two differences: `anno` is **never required** (most spirits carry no
vintage), and `paese` is free text, since the wine country list has no Scotland or Jamaica.
It has no legacy `annate[].prezzo`. Stored in the `distillati` collection.

`annate[].prezzo` is **legacy and still in the schema on purpose.** Mongoose only returns
paths it knows, so deleting it would blank the price of every un-migrated wine — i.e. the
whole catalogue. Readers try `formati` first and fall back to it (`utils/prezzo.js` →
`formatiAnnata` on the frontend). `scripts/migraPrezziInFormati.js` converts the old shape;
only once it has run can the field go.

### Images

Photos arrive as **base64 data URIs inside the JSON body** (the admin form encodes the
file). The controller passes `req.body.img` through `utils/cloudinary.js` `uploadImage()`,
which uploads and stores the resulting URL. This is why `express.json()` carries a 15mb
limit app-wide — a known bandwidth trade-off, since bodies are parsed before auth can
return 401.

**Wine and distillato photos are cut out server-side at upload** (`uploadImage(…, { scontorna: true })`,
wines and distillati controllers only). `utils/scontorno.js` uploads the raw photo, hands its URL to an
engine, hardens the returned mask, encodes the result as **webp** with `sharp` (no PNG at
any step — the shop's own format is webp) and swaps it in for the raw asset. A photo that
already arrives cut out (transparent corners, >30% transparent) is left alone, so the
engine is never billed for the shop's hand-made cut-outs. If the engine fails, the raw
photo is kept and a line is logged — a save must never fail because of the cut-out.

The engine is chosen by env: `PIXELCUT_API_KEY` set → Pixelcut's API (5 credits/photo;
**never call it from the browser** — their docs forbid it and the key would ship in the
bundle); unset → Cloudinary's `e_background_removal`, included in the plan. Cloudinary's
mask is soft (a wide alpha 201–254 band that reads as a pale halo on cards); the
hardening step in `scontorno.js` is what makes it usable, and its thresholds were
measured, not guessed — read the header comment before changing them.

`scripts/scontornaFotoVini.js --dry-run` applies the same treatment to photos uploaded
before this existed. `sharp` is a native dependency: it ships a prebuilt binary per
platform, which is why `npm install` on Vercel works without a build step.

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

`scripts/` holds only live, runnable scripts. Spent migrations are **deleted**, not kept
with their data stripped out — `importRossi.js` and `importBirre.js` went that way on
2026-08-11, once their 207 reds and 37 beers were in production.

What is left, and why:

- `createAdmin.js` — the only way to create the single account, since `POST /api/users`
  refuses a second one. Needed again only if the database is ever rebuilt.
- `importAlimentari.js` — its import is done, but `imgFile` is still the map from each
  `IMG_xxxx.jpg` in `scripts/import-assets/` to the product it belongs to, and 41 of the
  46 food products still have no photo. Delete it when they all do.

These connect to the **production** Atlas database via `.env`. `importAlimentari.js`
supports `--dry-run`; add the same flag to any new script and run it first.

`scripts/import-assets/` is gitignored (8.4MB of photos) and currently orphaned — the
Cloudinary upload block was removed from the import script, so products are created with
`img: ""` and photos are attached by hand from the admin panel.

## Language

User-facing error messages and code comments are in **Italian** (the admin panel is
Italian-only). Match it, and keep domain terms as the shop uses them (`annate`,
`sottocategoria`, `formato`, `prezzo`).
