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

Verified output ends with `ESITO: tutto ok`, exit code 0. Durata **28–47 s** (due corse
consecutive il 2026-08-25, stesso albero: 27,6 s e 46,6 s). Qui c'era scritto "~10 s
warm": ottimistico, la varianza è quasi tutta l'avvio del mongod effimero. `smoke.txt`
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

Riverificato il **2026-08-25**: 534 vini, 37 birre, 46 alimentari — invariati dal
2026-08-10. Consigliati veri in produzione: **10 vini, 0 birre, 11 alimentari** (li marca
il negoziante dal pannello, quindi questo numero cresce). `--read-only` conta una scrittura
bloccata come fallimento, quindi uno script che ne tenta una apposta esce 1.

### Capire QUALE codice sta girando in produzione, senza scrivere niente

Dopo un push, "il deploy è arrivato?" si risponde di solito provando una
scrittura — che in produzione vuol dire creare roba nel catalogo vero del
negozio. Non serve: **Mongoose serializza i path che conosce, quindi un campo
nuovo appare nelle risposte GET anche sui documenti che non lo hanno.**

Un path array nuovo esce come `[]`. Aggiunto `formati` ad `AnnataSchema`, un
vino mai toccato passa da

```json
{"anno":"2021","prezzo":95}                    // codice vecchio
{"anno":"2021","prezzo":95,"formati":[]}       // codice nuovo in linea
```

Quindi una GET su un vino qualunque dice quale versione risponde. Usato il
2026-08-28 per confermare il deploy di `c1dc2ee`:

```js
const a = (await get('/api/wines?category=rossi&limit=1'))[0].annate[0];
const nuovo = Object.prototype.hasOwnProperty.call(a, 'formati');
```

Vale per **campi array**. Uno scalare nuovo e mai valorizzato resta assente in
entrambe le versioni e non distingue niente; per quelli serve un marcatore
diverso (o pazienza). Ricontrollato il 2026-09-01 con `prezzo: { default: 0 }`
sul formato: il ripiego si vede solo su un formato **senza** prezzo, e in
produzione non ce n'era nemmeno uno — quindi del deploy si è potuto dire
soltanto "pushato e l'API risponde", non "codice nuovo confermato in linea".
Dirlo così, invece di dare per scontato il resto. Nella stessa GET si legge anche se i dati sono ancora
integri — sopra, `prezzo: 95` accanto a `formati: []` diceva in un colpo solo
"codice nuovo attivo" **e** "nessun prezzo perso".

La CLI di Vercel qui **non è autenticata** (`vercel ls` → `The request is
missing an authentication token`), quindi questa è la via pratica: non serve un
login interattivo per sapere cosa è in linea.

### Parametri di query che il deployato conosce oggi

| parametro | dove | effetto |
|---|---|---|
| `?category=` / `?producer=` | wines / beers | filtro esatto |
| `?consigliato=true` | tutt'e tre | solo la selezione della casa. **Solo** `true` accende il filtro |
| `?limit=N` | tutt'e tre | massimo N documenti, tetto 200 (`utils/query.js`) |

`?limit=` è live dal 2026-08-15 — verificato oggi: `?limit=5` → 5 elementi. Un limite non
numerico, `0` o negativo vale **"nessun limite"**, di proposito: una query storta non deve
mai svuotare un elenco.

### Un filtro che il deployato NON conosce non restituisce zero: restituisce tutto

I controller costruiscono il filtro leggendo i parametri che conoscono e **ignorano gli
altri**. Una query nuova, contro un backend più vecchio, non dà una lista vuota — dà il
**catalogo intero**, con stato 200 e nessun errore da nessuna parte.

Misurato il 2026-08-14, quando `consigliato` esisteva in locale ma non era ancora
deployato: `?consigliato=true` tornava 534 / 37 / 46, cioè tutto. **Oggi quel campo è
deployato** e infatti torna 10 / 0 / 11 — l'esempio è storia, la regola no:

> **Il backend si deploya PRIMA del frontend, o insieme. Mai dopo.**

Un frontend pubblicato da solo avrebbe messo in home dodici vini a caso sotto il titolo
"I nostri consigli". Vale per qualunque parametro futuro: quando ne aggiungi uno, provalo
contro il deployato prima di dare per scontato che una risposta piena significhi "il filtro
funziona", o che una vuota significhi "non ci sono dati".

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

## Aggiustare i DATI in produzione (non il codice)

Quando il difetto è nei dati e non nel programma — valori sporchi, doppioni,
un campo da normalizzare — la via è uno script usa e getta in `scripts/`, non
una modifica al backend. Non serve nessun redeploy: i dati sono live subito.

Ricetta, verificata il 2026-09-01 sulle regioni con lo spazio in coda
("Lombardia " accanto a "Lombardia", 57 vini su 7 valori gemelli):

1. Lo script sta in **`scripts/`** e si lancia con cwd = `backend/`. Da altrove
   `dotenv` non trova `.env` e `require('../models/Wine')` non risolve.
2. Riusare il **modello del repo**, non una query a mano: schema e `toJSON`
   restano quelli dell'app.
3. **`--dry-run` obbligatorio, e prima.** Stampa cosa toccherebbe, raggruppato
   per valore e con qualche nome di esempio: è lì che si vede se il filtro
   pesca quello che credi. Solo dopo la corsa vera.
4. Stampare anche **su quale database** si sta per scrivere, con la password
   mascherata: `uri.replace(/\/\/.*@/, "//…@").split("?")[0]`.
5. Per gli spazi e le varianti: `find()` tutto e **filtrare in JS** su `.trim()`,
   poi `updateMany({_id: {$in: ids}}, {$set: …})` per gruppo. Una regex Mongo
   sugli spazi finali è fragile, e cinquecento documenti si leggono in un attimo.
6. Verificare **dall'API pubblica**, non dal database: è quello che riceve il
   sito. Il conteggio dei valori distinti prima/dopo è la prova più corta
   (24 → 17, zero sporchi).
7. **Cancellare lo script** quando ha finito: `scripts/` tiene solo roba viva,
   le migrazioni spese si eliminano (vedi CLAUDE.md).

Un dato sporco quasi sempre ha una **sorgente** ancora aperta: lì era il campo
libero `regione` del pannello, che salvava senza `trim()`. Ripulire le righe
senza chiudere il rubinetto vuol dire rifarlo fra un mese.

## Serving the frontend from the disposable DB

`--hold` also lets the sibling repo run against a backend that isn't production — the only
safe way to exercise the **admin panel** (login, create, edit, delete). `seed-locale.txt`
is a stdin script that creates the admin account and a minimal catalogue (4 wines, 1 beer,
2 alimentari) and is meant to be fed to a `--hold` run. Tre di quei prodotti — un vino, una
birra, un alimentare — sono marcati `consigliato`, e i due rossi sono di **regioni diverse**:
senza le prime la tab Consigliati e la fascia in home restano vuote, senza le seconde lo
smoke del frontend si pianta sul passo `click text=Regioni`. Non toglierli.

```powershell
Start-Process node -ArgumentList '.claude/skills/run-enoteca-detoma-backend/driver.mjs','--hold' -RedirectStandardOutput "$env:TEMP\hold.log" -RedirectStandardInput '.claude/skills/run-enoteca-detoma-backend/seed-locale.txt' -WindowStyle Hidden
```

Then, in `frontend/`, start Vite pointed at it and log in as `admin` / `Password1!`.
**Attenzione a come passi la variabile**: impostare `$env:VITE_API_URL` e poi lanciare
`Start-Process npm.cmd` NON funziona — il figlio non la vede. E da quando il fallback del
frontend è la **produzione** (2026-08-15) il sintomo è cambiato in peggio: non vedi più
liste vuote che gridano "manca la variabile", vedi il **catalogo vero del negozio**, e
credi di stare sul backend usa e getta mentre il pannello admin sta scrivendo su Atlas.
Va impostata dentro il processo figlio:

```powershell
Start-Process cmd.exe -ArgumentList '/c','set "VITE_API_URL=http://localhost:3011" && npm run dev' `
  -RedirectStandardOutput "$env:TEMP\vite.log" -WindowStyle Hidden
```

Poi **verifica a quale API è legato** invece di darlo per scontato — il modulo servito
contiene l'URL:

```powershell
$c = (Invoke-WebRequest "http://localhost:5173/src/services/wines.js" -UseBasicParsing).Content
(([regex]::Matches($c,'https?://[^"'' ]+')) | ForEach-Object { $_.Value } | Select-Object -Unique)
```

Devi **leggerci `http://localhost:3011`**. La stringa di fallback
(`detoma-backend.vercel.app`) sta nel sorgente e compare sempre: la sua presenza non
dimostra niente, la presenza di `localhost:3011` sì. Se manca, la variabile non è arrivata
e sei sulla produzione.

Verificato end to end il 2026-08-14: con questo seed lo smoke completo del frontend passa
(`ERRORS none`, exit 0) — prima girava solo contro il catalogo di produzione. Dettagli in
`frontend/.claude/skills/run-enoteca-detoma-frontend/`.

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
  `SECRET`, `CLIENT_URL` (required), plus `CLOUDINARY_URL`, `CLIENT_URL_ALT`, `PORT`, and
  the optional `PIXELCUT_API_KEY` (switches the wine-photo cut-out engine from
  Cloudinary's AI to Pixelcut — see `utils/scontorno.js`).
- **`uploadImage(…, { scontorna: true })` calls out to the network twice more** (the
  engine, then the clean re-upload). Under the driver `CLOUDINARY_URL` is sabotaged, so
  the raw upload already fails and the cut-out path is never reached — test that path
  with a throwaway node script against the real account in a `prova-…` folder, as done
  2026-09-07 (Pio Cesare: 981 ms, 6 KB webp, alpha identical after the round-trip).
- **Cookie auth works locally only because `NODE_ENV` is not `production`.** The driver
  sets it to `development` so the cookie is `sameSite: strict, secure: false` and plain
  HTTP keeps it. Set `VERCEL=1` or `NODE_ENV=production` and the `secure` cookie is
  dropped on `http://localhost` — the Bearer path would still work, `auth cookie` would
  not.
- **Ephemeral means ephemeral.** Every run starts with an empty DB, so a script must
  `seed-admin` before `login`, and `GET /api/wines` legitimately returns 0 items.
- **Un campo che lo schema non dichiara viene buttato in silenzio, con 201/200.** Mongoose
  gira in strict mode: puoi mandare `{"consiglio":"..."}` in POST o PUT, ricevere `201` e
  rileggere il documento **senza quel campo**. Verificato il 2026-08-15, quando `consiglio`
  è stato tolto dai tre modelli (la selezione della casa è solo il booleano `consigliato`).
  Quindi un `expect 201` non prova che il campo sia stato salvato: rileggi con `get` +
  `show`, o `expect-body`.
- **I `--hold` si accumulano fra una sessione e l'altra.** Avviati con `Start-Process`,
  sopravvivono alla chiamata che li ha creati; e uccidere *chi ascolta la porta 3011* non
  tocca né il driver né il suo `mongo_killer.js`, che restano su con il mongod effimero. Il
  2026-08-14 ne ho trovati vivi due di due giorni prima. Cercali per riga di comando, non
  per nome (sono tutti `node`):

  ```powershell
  Get-Process node | Select-Object Id, StartTime, @{n='cmd';e={
    (Get-CimInstance Win32_Process -Filter "ProcessId=$($_.Id)").CommandLine }} | Format-Table -Wrap -AutoSize
  ```

  Nello stesso elenco c'è anche il `nodemon.js server.js` dello sviluppatore sulla 3001,
  **che parla con Atlas di produzione**: uccidere alla cieca gli spegne il backend sotto le
  mani. Vai per PID, e solo su quelli che hai avviato tu.
- **Prima di dare la colpa al frontend, chiedi al database.** Una tab vuota nel sito quasi
  sempre significa che i dati non ci sono, non che il codice è rotto: `seed-locale.txt` marca
  tre prodotti come `consigliato` proprio perché senza quelli la tab Consigliati e la fascia
  in home restano — correttamente — invisibili.

## Troubleshooting

- **Porta 3011 già occupata da un `--hold`: due esiti, e il secondo è silenzioso.**
  1. `FAIL avvio -> server.js e' morto con exit 1` con `EADDRINUSE` nel dump — il caso
     pulito. Il driver ferma il mongod effimero, nessun orfano.
  2. **Il peggiore, perché sembra un bug dell'app:** il driver prosegue e le sue richieste
     finiscono sul server **già in ascolto**, cioè su un database che non è vuoto. Il
     sintomo è `FAIL seed-admin -> 403 an account already exists` a inizio script.
     Successo il 2026-08-15 lanciando lo smoke con un `--hold` vivo.

  Regola: **prima di ogni corsa guarda chi ascolta la 3011.** Se c'è un `--hold` tuo,
  ammazzalo o passa `--port 3012`; se lo script deve parlare proprio con lui, allora usa
  `--base http://localhost:3011` **esplicitamente** (e allora `seed-admin` va tolto, perché
  l'account c'è già).

  ```powershell
  Get-NetTCPConnection -LocalPort 3011 -State Listen -ErrorAction SilentlyContinue |
    ForEach-Object { "3011 occupata dal PID $($_.OwningProcess)" }
  ```
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
- **`FAIL avvio -> Instance failed to start within 10000ms` +
  `Starting the MongoMemoryServer Instance failed`** — è il mongod effimero che non parte
  in tempo, **prima** che si arrivi al server. Visto due volte il 2026-08-25, e la seconda
  con la **3011 libera e zero processi `mongod` orfani** (controllati): quindi non è una
  collisione di porta e non è un orfano, è uno stallo di avvio su macchina carica — la
  prima volta è successo subito dopo un `npm run build` da due minuti. **Rilancia e basta**:
  la corsa immediatamente successiva è passata, `ESITO: tutto ok`, exit 0. Ricapitato il
  2026-09-03 in un'altra veste — `FAIL avvio -> il server non ha risposto su /health entro
  40s`, con la 3011 libera e nessun `mongod` orfano — e anche lì la corsa dopo è partita
  liscia: **tre volte su tre la cura è stata rilanciare, non indagare.** Se insiste,
  controlla comunque i due sospetti:
  ```powershell
  Get-NetTCPConnection -LocalPort 3011 -State Listen -ErrorAction SilentlyContinue
  Get-Process mongod -ErrorAction SilentlyContinue | Select-Object Id, StartTime
  ```
  (Nota: ammazzare i `node` del driver **non** lascia orfani `mongod` — verificato, il
  conteggio dopo la pulizia era 0. Il `mongo_killer.js` fa il suo lavoro.)
