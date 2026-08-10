#!/usr/bin/env node
// Driver per l'API di Enoteca de Toma.
// Avvia un Mongo effimero in memoria, lancia `node server.js` contro quello e
// poi esegue i comandi letti da stdin (uno per riga) come richieste HTTP.
//
//   node .claude/skills/run-enoteca-detoma-backend/driver.mjs [--port N] [--verbose]
//   node .claude/skills/run-enoteca-detoma-backend/driver.mjs --base https://... [--read-only]
//
// Il DB di default e' USA E GETTA: le scritture non toccano l'Atlas di
// produzione. Con `--base` invece non avvia niente e parla con un server che
// gia' esiste: usalo per sondare la produzione, e in quel caso passa anche
// `--read-only`, che blocca POST/PUT/DELETE prima di spedirli.

import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, appendFileSync, readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = resolve(HERE, '../../..'); // backend/
const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const opt = (n, d) => {
  const i = argv.indexOf(n);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const PORT = Number(opt('--port', '3011'));
const EXTERNAL = opt('--base', null);
const READ_ONLY = flag('--read-only');
const VERBOSE = flag('--verbose');
const BASE = (EXTERNAL || `http://localhost:${PORT}`).replace(/\/$/, '');
const LOG = resolve(HERE, 'server.log');

const log = (...a) => console.log(...a);
let failed = false;
const fail = (msg) => { failed = true; log(`FAIL ${msg}`); };

// ---------------------------------------------------------------- avvio app
let mongod = null;
let child = null;
let MEM_URI = null;

async function boot() {
  if (EXTERNAL) { log(`OK base esterna ${BASE}`); return; }

  const { MongoMemoryServer } = await import('mongodb-memory-server');
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri() + 'enoteca-driver';
  MEM_URI = uri;
  log(`OK mongo effimero ${uri}`);

  writeFileSync(LOG, '');
  child = spawn(process.execPath, ['server.js'], {
    cwd: APP,
    env: {
      ...process.env,
      // dotenv non sovrascrive le variabili gia' presenti: questi valori
      // vincono su .env, quindi il server NON vede l'Atlas di produzione.
      MONGODB_URI: uri,
      SECRET: 'driver-secret-non-usare-in-produzione',
      CLIENT_URL: 'http://localhost:5173',
      CLIENT_URL_ALT: '',
      // volutamente invalido: se una richiesta passa un data URI l'upload
      // fallisce rumorosamente invece di finire sul Cloudinary del negozio.
      CLOUDINARY_URL: 'cloudinary://000000000000000:driver-no-uploads@driver-invalid',
      PORT: String(PORT),
      NODE_ENV: 'development',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const sink = (b) => {
    appendFileSync(LOG, b);
    if (VERBOSE) process.stdout.write(`[srv] ${b}`);
  };
  child.stdout.on('data', sink);
  child.stderr.on('data', sink);

  const deadline = Date.now() + 40000;
  for (;;) {
    if (child.exitCode !== null) {
      log(readFileSync(LOG, 'utf8'));
      throw new Error(`server.js e' morto con exit ${child.exitCode}`);
    }
    try {
      const r = await fetch(`${BASE}/health`);
      const j = await r.json();
      if (j.mongodb === 'connected') { log(`OK server su ${BASE} (mongodb ${j.mongodb})`); return; }
    } catch { /* non ancora in ascolto */ }
    if (Date.now() > deadline) {
      log(readFileSync(LOG, 'utf8'));
      throw new Error('il server non ha risposto su /health entro 40s');
    }
    await new Promise((r) => setTimeout(r, 300));
  }
}

// ------------------------------------------------------------------- stato
const vars = Object.create(null);   // $nome -> valore, riempito da `save`
let cookie = null;                  // accessToken httpOnly
let bearer = null;                  // stesso token, in chiaro (vedi CLAUDE.md)
let authMode = 'both';              // both | cookie | bearer | none
let last = { status: 0, body: null };

// $nome (e ${nome}) sostituiti ovunque, path e corpo JSON compresi
const subst = (s) =>
  s.replace(/\$\{(\w+)\}|\$(\w+)/g, (m, a, b) => {
    const k = a || b;
    if (!(k in vars)) { fail(`variabile $${k} non definita`); return m; }
    return String(vars[k]);
  });

const dig = (obj, path) =>
  path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);

async function request(method, rest, hasBody) {
  let path = rest;
  let body;
  if (hasBody) {
    const i = rest.indexOf(' ');
    path = i < 0 ? rest : rest.slice(0, i);
    const raw = i < 0 ? '' : rest.slice(i + 1).trim();
    if (raw) {
      try { body = JSON.parse(raw); }
      catch (e) { fail(`${method} ${path} -> JSON non valido: ${e.message}`); return; }
    }
  }
  if (READ_ONLY && method !== 'GET') {
    fail(`${method} ${path} bloccato da --read-only`);
    return;
  }

  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (cookie && (authMode === 'both' || authMode === 'cookie')) headers.Cookie = cookie;
  if (bearer && (authMode === 'both' || authMode === 'bearer')) headers.Authorization = `Bearer ${bearer}`;

  const url = path.startsWith('http') ? path : BASE + (path.startsWith('/') ? path : '/' + path);
  const res = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const setCookie = res.headers.getSetCookie?.() || [];
  for (const c of setCookie) {
    const [pair] = c.split(';');
    if (pair.startsWith('accessToken=')) cookie = pair.endsWith('=') ? null : pair;
  }

  const text = await res.text();
  let parsed = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
  last = { status: res.status, body: parsed };

  const preview = Array.isArray(parsed)
    ? `[${parsed.length} elementi]`
    : JSON.stringify(parsed ?? '')?.slice(0, 180);
  log(`${res.status} ${method} ${path} ${preview}`);
}

const COMMANDS = {
  get: (r) => request('GET', r, false),
  post: (r) => request('POST', r, true),
  put: (r) => request('PUT', r, true),
  del: (r) => request('DELETE', r, true),

  // POST /api/users si chiude da sola dopo il primo account: funziona solo
  // sul DB effimero, sulla produzione risponde 403.
  async 'seed-admin'(r) {
    const [u = 'admin', p = 'Password1!', e = 'admin@example.com'] = r.split(/\s+/).filter(Boolean);
    await request('POST', `/api/users {"username":"${u}","email":"${e}","password":"${p}"}`, true);
    if (last.status !== 201) fail(`seed-admin -> ${last.status}`);
    else vars.userId = last.body.id;
  },

  async login(r) {
    const [u = 'admin', p = 'Password1!'] = r.split(/\s+/).filter(Boolean);
    await request('POST', `/api/login {"username":"${u}","password":"${p}"}`, true);
    if (last.status === 200) {
      bearer = last.body.token;
      vars.userId = last.body.id;
      log(`OK login ${u} (token ${bearer.slice(0, 12)}..., cookie ${cookie ? 'si' : 'no'})`);
    } else fail(`login -> ${last.status}`);
  },

  async logout() {
    await request('POST', '/api/login/logout', true);
    bearer = null; cookie = null;
    log('OK logout (credenziali locali scartate)');
  },

  // per provare a mano i due canali del token: sono entrambi voluti
  auth(r) {
    const m = r.trim() || 'both';
    if (!['both', 'cookie', 'bearer', 'none'].includes(m)) return fail(`auth: modo sconosciuto ${m}`);
    authMode = m;
    log(`OK auth ${m}`);
  },

  token(r) {
    const v = r.trim();
    bearer = v === 'none' ? null : v === 'bad' ? 'non.un.jwt' : v;
    log(`OK token ${v === 'none' || v === 'bad' ? v : (v ? v.slice(0, 12) + '...' : '(vuoto)')}`);
  },

  // mette da parte il token corrente per riusarlo dopo un logout: e' cosi'
  // che si verifica che la revoca via tokenVersion morda davvero
  'save-token'(r) {
    const name = r.trim() || 'oldToken';
    if (!bearer) return fail('save-token: nessun token in mano');
    vars[name] = bearer;
    log(`OK save-token ${name} = ${bearer.slice(0, 12)}...`);
  },

  expect(r) {
    const want = Number(r.trim());
    if (last.status !== want) fail(`atteso ${want}, ricevuto ${last.status} (${JSON.stringify(last.body)?.slice(0, 200)})`);
    else log(`OK expect ${want}`);
  },

  'expect-body'(r) {
    const needle = r.trim();
    const hay = JSON.stringify(last.body);
    if (!hay || !hay.includes(needle)) fail(`nel corpo manca "${needle}": ${hay?.slice(0, 200)}`);
    else log(`OK expect-body ${needle}`);
  },

  save(r) {
    const [name, path = 'id'] = r.split(/\s+/).filter(Boolean);
    if (!name) return fail('save: manca il nome');
    const v = dig(last.body, path);
    if (v === undefined) return fail(`save ${name}: ${path} non presente nell'ultimo corpo`);
    vars[name] = v;
    log(`OK save ${name} = ${v}`);
  },

  show(r) {
    const v = r.trim() ? dig(last.body, r.trim()) : last.body;
    log(`BODY ${JSON.stringify(v, null, 2)?.slice(0, 2000)}`);
  },

  count(r) {
    const v = r.trim() ? dig(last.body, r.trim()) : last.body;
    log(`COUNT ${r.trim() || 'body'} = ${Array.isArray(v) ? v.length : 'non e\' un array'}`);
  },

  'server-log'(r) {
    const n = Number(r.trim()) || 30;
    const lines = (EXTERNAL ? '' : readFileSync(LOG, 'utf8')).trim().split('\n');
    log(`SERVER-LOG\n${lines.slice(-n).join('\n')}`);
  },

  sleep: (r) => new Promise((res) => setTimeout(res, Number(r) || 300)),
};

// -------------------------------------------------------------------- main
async function cleanup() {
  if (child && child.exitCode === null) child.kill();
  if (mongod) await mongod.stop();
}

try {
  await boot();
} catch (e) {
  // senza questo un avvio fallito (porta occupata, env rotta) lascerebbe
  // un mongod orfano in ascolto su una porta a caso
  log(`FAIL avvio -> ${e.message}`);
  await cleanup();
  process.exit(1);
}

// senza pipe (stdin = console) leggere stdin bloccherebbe per sempre: con
// --hold e' il caso normale, si vuole solo il server su e nient'altro.
const rl = process.stdin.isTTY
  ? []
  : createInterface({ input: process.stdin, crlfDelay: Infinity });
for await (const raw of rl) {
  const line = raw.trim();
  if (!line || line.startsWith('#')) continue;
  if (line === 'quit') break;
  const i = line.indexOf(' ');
  const cmd = i < 0 ? line : line.slice(0, i);
  const rest = subst(i < 0 ? '' : line.slice(i + 1).trim());
  const fn = COMMANDS[cmd];
  if (!fn) { fail(`comando sconosciuto: ${cmd}`); continue; }
  try { await fn(rest); }
  catch (e) { fail(`${cmd} ${rest} -> ${e.message.split('\n')[0]}`); }
}

if (flag('--hold') && !EXTERNAL) {
  // resta in piedi finche' non lo ammazzi: serve per lanciare gli script di
  // scripts/ (o un node -e con mongoose) contro questo DB usa e getta invece
  // che contro Atlas — basta esportare MONGODB_URI con il valore qui sotto.
  log(`HOLD MONGODB_URI=${MEM_URI}`);
  log(`HOLD API=${BASE}  (Ctrl-C o kill del processo per chiudere tutto)`);
  await new Promise(() => {});
}

await cleanup();
log(failed ? '\nESITO: almeno un comando e\' fallito' : '\nESITO: tutto ok');
process.exit(failed ? 1 : 0);
