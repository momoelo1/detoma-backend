---
name: run-enoteca-detoma-backend
description: Build, run and drive the Enoteca de Toma backend API. Use when asked to start the server, run or test the API, exercise login/auth, do CRUD on wines/beers/alimentari, rehearse an import script, or check the deployed API on Vercel — without touching the production database.
---

Express 4 + Mongoose, deployed on Vercel. An agent drives it with
`.claude/skills/run-enoteca-detoma-backend/driver.mjs`, which boots a **throwaway
in-memory MongoDB**, launches `node server.js` against it, and then executes HTTP commands
read from stdin (`get`, `post`, `login`, `expect`, `save`, …).

All paths below are relative to `backend/` (this repo's root). Commands are PowerShell —
the shell on this machine. **Never `git push`: Vercel auto-deploys `main`, and the DB it
talks to is the shop's real one.**

## The one thing to get right

`.env` in this checkout points at the **production** Atlas cluster and the **production**
Cloudinary account. There is no staging. So:

- `npm run dev` / `npm start` = the live database. Reads are fine, writes are not.
- The driver overrides `MONGODB_URI`, `SECRET` and `CLOUDINARY_URL` in the child process's
  env. `dotenv` does **not** overwrite variables that are already set, so those overrides
  win over `.env` and the server never sees Atlas. Verified: `server.log` starts with
  `connecting to mongodb://127.0.0.1:<porta>/enoteca-driver`.

That is why the agent path below is the driver and not `npm run dev`.

## Prerequisites

Node 22 (verified with v22.13.0). One-time install of the harness. It has its **own**
`package.json` on purpose — the backend's is what Vercel installs, and
`mongodb-memory-server` must never end up in it:

```powershell
Set-Location .claude/skills/run-enoteca-detoma-backend
npm install --no-audit --no-fund
Set-Location ../../..
```

App deps, if `node_modules/` is missing:

```powershell
npm install
```

First driver run downloads a `mongod` binary into `~/.cache/mongodb-binaries`
(`mongod-x64-win32-8.2.6.exe`): **~2 min the first time, ~10 s every run after.**

## Run (agent path)

One command. It starts everything, runs the committed end-to-end script, tears everything
down, and exits non-zero if any line failed:

```powershell
Get-Content .claude/skills/run-enoteca-detoma-backend/smoke.txt | node .claude/skills/run-enoteca-detoma-backend/driver.mjs
```

Verified output ends with `ESITO: tutto ok`, exit code 0, in ~10 s warm. `smoke.txt`
covers: public reads, 401 on an unauthenticated write, the single-account rule (403 on a
second user), login over both token channels, wine/beer/alimentare CRUD, the category
enums, the Italian validation messages, the champagne-has-no-year exception,
`DELETE /:id/image` leaving the product alive, session revocation on logout, and
`unknown endpoint`.

For a one-off check, pipe a here-string instead:

```powershell
@'
seed-admin
login
post /api/wines {"name":"Prova","category":"rossi","annate":[{"anno":"2020","prezzo":12}]}
expect 201
save wineId id
get /api/wines/$wineId
show
del /api/wines/$wineId
expect 204
'@ | node .claude/skills/run-enoteca-detoma-backend/driver.mjs
```

The server's own stdout/stderr goes to `.claude/skills/run-enoteca-detoma-backend/server.log`
(gitignored), not to the console — use the `server-log` command, or `--verbose` to see it
inline.

### Driver flags

| flag | effect |
|---|---|
| *(none)* | mongo effimero + `node server.js` on port 3011, then teardown |
| `--port N` | use another port (3011 by default, so it never collides with the local 3001) |
| `--hold` | after the commands, keep mongo + server up and print the URI — see below |
| `--verbose` | echo the server log inline as `[srv] …` |
| `--base <url>` | **don't start anything**, talk to a server that already exists |
| `--read-only` | refuse POST/PUT/DELETE before sending them. Always pair it with `--base` when the base is production |

### Driver commands

Any failure (a `FAIL` line) makes the process exit 1. `$name` is substituted everywhere,
path and JSON body included.

| command | what it does |
|---|---|
| `get <path>` | GET |
| `post <path> <json>` / `put` / `del` | write requests; the JSON body is one line |
| `seed-admin [user pass email]` | POST `/api/users` — default `admin` / `Password1!` |
| `login [user pass]` | POST `/api/login`, keeps both the cookie and the raw token |
| `logout` | POST `/api/login/logout` and drops the local credentials |
| `auth both\|cookie\|bearer\|none` | which of the two token channels to send (default `both`) |
| `token <jwt>\|none\|bad` | force a specific Bearer token |
| `save-token <name>` | stash the current token in a variable — how you prove revocation |
| `expect <status>` | assert the last status code |
| `expect-body <substring>` | assert a substring is in the last JSON body |
| `save <name> [dotted.path]` | capture a value from the last body (default `id`) |
| `show [path]` / `count [path]` | print the body / an array's length |
| `server-log [n]` | last n lines the server printed (default 30) |
| `sleep <ms>`, `# comment`, `quit` | |

## Probing the deployed API

`--base` skips mongo and the child process entirely. On production, always add
`--read-only`:

```powershell
@'
get /health
show
get /api/wines
count
get /api/alimentari
count
'@ | node .claude/skills/run-enoteca-detoma-backend/driver.mjs --base https://detoma-backend.vercel.app --read-only
```

Verified 2026-08-10: 534 wines, 46 alimentari, 37 beers. Note `--read-only` counts a
blocked write as a failure, so a script that deliberately tries one exits 1.

## Rehearsing a script from `scripts/`

The scripts in `scripts/` read `process.env.MONGODB_URI` and connect to **production**.
`--hold` gives you a disposable database to run them against first. Because `Start-Process`
inherits the console's stdin and the driver would sit there waiting for commands, redirect
stdin from an empty file:

```powershell
$out="$env:TEMP\hold.log"; $nul="$env:TEMP\empty.txt"; Set-Content $nul ''
Remove-Item $out -ErrorAction SilentlyContinue
$p = Start-Process node -ArgumentList '.claude/skills/run-enoteca-detoma-backend/driver.mjs','--hold' -RedirectStandardOutput $out -RedirectStandardInput $nul -PassThru -WindowStyle Hidden
for($i=0;$i -lt 80;$i++){ if ((Test-Path $out) -and (Select-String -Path $out -Pattern 'HOLD MONGODB_URI=' -Quiet)) { break }; Start-Sleep -Milliseconds 500 }
$uri = (Select-String -Path $out -Pattern 'HOLD MONGODB_URI=(.+)$').Matches.Groups[1].Value.Trim()
if ($uri -notmatch '^mongodb://127\.0\.0\.1:') { throw "URI non effimero: '$uri' — NON proseguire" }
```

**Keep that guard.** With `MONGODB_URI` empty or unset the script silently falls back to
`.env`, i.e. Atlas; that happened here during development and only the import script's own
duplicate guard stopped it from writing to the live catalogue.

Then, with the same shell:

```powershell
$env:MONGODB_URI=$uri
node scripts/importAlimentari.js --dry-run
node scripts/importAlimentari.js
$env:MONGODB_URI=''
Stop-Process -Id $p.Id -Force
```

Verified: `Importati 46 alimentari (senza immagini).`, and `GET
http://localhost:3011/api/alimentari` on the held server then returns 46. In PowerShell
`$env:X=''` removes the variable, so the shell is clean afterwards.

## Serving the frontend from the disposable DB

`--hold` also lets the sibling repo run against a backend that isn't production — the only
safe way to exercise the **admin panel** (login, create, edit, delete). `seed-locale.txt`
is a stdin script that creates the admin account and a minimal catalogue (3 wines, 1 beer,
2 alimentari) and is meant to be fed to a `--hold` run:

```powershell
Start-Process node -ArgumentList '.claude/skills/run-enoteca-detoma-backend/driver.mjs','--hold' -RedirectStandardOutput "$env:TEMP\hold.log" -RedirectStandardInput '.claude/skills/run-enoteca-detoma-backend/seed-locale.txt' -WindowStyle Hidden
```

Then, in `frontend/`, start Vite with `$env:VITE_API_URL = 'http://localhost:3011'` and log
in as `admin` / `Password1!`. Verified end to end: the panel lists the seeded wine and the
public page renders it. Details in `frontend/.claude/skills/run-enoteca-detoma-frontend/`.

CORS already allows this: `app.js` lets through any `localhost` origin, plus LAN
`192.168/10./172.16-31` origins on port 5173 for testing from a phone.

## Human path

```powershell
npm run dev
```

nodemon on **port 3001** (`.env` sets it; `utils/config.js` would otherwise default to
3002, and the frontend's fallback is hardcoded to 3001). Verified: `/health` answers
`{"status":"ok",...,"mongodb":"connected"}` — connected **to production Atlas**. The first
`GET /api/wines` took longer than 10 s (cold connection) and then 2.3 s for 534 documents.
Use this only when you specifically need real data; the driver otherwise.

Stop it:

```powershell
Get-NetTCPConnection -LocalPort 3001 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

**There is no test suite.** The smoke run is the verification.

## Gotchas

- **`npm install <pkg>` inside the skill dir before its `package.json` existed installed
  into `backend/` instead** — npm walked up, added `mongodb-memory-server` to the app's
  `package.json` and lockfile, i.e. into what Vercel deploys. Fixed with
  `git checkout -- package.json package-lock.json` + `npm prune`. The skill's
  `package.json` is committed precisely so this can't recur; add deps with
  `Set-Location` into the skill dir first, and check `git status` in `backend/` after.
- **`/health` says `"mongodb":"disconnected"` on production while the API works fine.**
  Not a bug: `/health` is registered *before* the middleware that awaits the connection
  promise (deliberately, see CLAUDE.md), so on a cold Vercel instance it answers before
  Mongoose finishes connecting. Judge the API by `/api/wines`, not by `/health`.
- **The login rate limit will lock you out mid-script.** 10 failed attempts per 15 min:
  the 11th `POST /api/login` returns 429, *and so does the next legitimate `login`*.
  Measured exactly that. Successful logins are skipped by the limiter, so the normal smoke
  never trips it. The store is in-memory, so restarting the driver clears it — which is
  also why the limit is much weaker than it looks on multi-instance Vercel.
- **`CLOUDINARY_URL` is deliberately sabotaged in the driver.** The controllers upload
  anything starting with `data:image` to Cloudinary, and `.env` holds the shop's real
  account. Don't put a base64 data URI in a driver script expecting it to work — it is
  meant to fail.
- **`utils/config.js` tells you to see `.env.example`. That file does not exist in this
  repo** (the frontend has one; this one doesn't). The full list is: `MONGODB_URI`,
  `SECRET`, `CLIENT_URL` (required), plus `CLOUDINARY_URL`, `CLIENT_URL_ALT`, `PORT`.
- **Cookie auth works locally only because `NODE_ENV` is not `production`.** The driver
  sets it to `development` so the cookie is `sameSite: strict, secure: false` and plain
  HTTP keeps it. Set `VERCEL=1` or `NODE_ENV=production` and the `secure` cookie is
  dropped on `http://localhost` — the Bearer path would still work, `auth cookie` would
  not.
- **Ephemeral means ephemeral.** Every run starts with an empty DB, so a script must
  `seed-admin` before `login`, and `GET /api/wines` legitimately returns 0 items.

## Troubleshooting

- **`FAIL avvio -> server.js e' morto con exit 1`** with `EADDRINUSE` in the dump — port
  3011 is taken by a previous `--hold` run. Kill it, or pass `--port 3012`. The driver
  stops the ephemeral mongod on this path, so no orphan is left behind.
- **The driver seems to hang forever after `OK server su …`** — it is waiting on stdin.
  Pipe a file or a here-string into it; with `Start-Process`, redirect stdin from an empty
  file.
- **`Missing required environment variable(s): MONGODB_URI, SECRET, CLIENT_URL`** — you
  ran node from a directory other than `backend/`. `dotenv` reads `.env` from the *cwd*,
  not from the module's folder.
- **`FAIL variabile $x non definita`** — a `save` earlier in the script failed, or the path
  you gave it isn't in the last response body. `show` right before it.
- **First run appears stuck for ~2 min with no output** — the `mongod` binary is
  downloading. Only once per binary version; the cache is `~/.cache/mongodb-binaries`.
- **`FAIL avvio -> il server non ha risposto su /health entro 40s` with an empty
  `server.log`** — seen once, on the first run after the machine rebooted, and not
  reproducible: the very next run booted in 9 s. Empty log means the child printed nothing
  at all, so it is a cold-start stall, not a code problem. Re-run it; if it repeats, use
  `--verbose` to watch the child directly.
