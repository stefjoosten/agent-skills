// TEMPLATE — structural verify harness for an Ampersand data-import model.
// Adapt CONFIG, drop in your normalize(), point CORPUS at the data. Needs js-yaml
// (only for .yml input) resolvable from node_modules.
//
// Metric: expected leaves as PATH SIGNATURES (relation path from the root concept +
// value) counted from the normalized document, vs the SAME signatures reconstructed
// from the exported population. Exact multiset compare → catches skipped leaves,
// wrong-relation leaves, and extras. Cross-check the expected counter with a second
// implementation (e.g. Python) so 100% is not a counter bug.

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { normalize } from './normalize.mjs'; // your thin, temporary normalizer (or identity)

const DIR = dirname(fileURLToPath(import.meta.url));

const CONFIG = {
  base: process.env.PROTOTYPE_URL || 'http://localhost:9400',
  interface: 'Documenten',          // your SESSION-rooted import interface label
  rootConcept: 'Document',          // the concept its target atoms have
  corpus: process.env.CORPUS_DIR || join(DIR, 'samples'),
  // concepts whose atom id IS the value (leaf) — everything else is a _NEW structural atom
  leafConcepts: new Set(['Land', 'Gewas', 'Organisme', 'Operator', 'Kop', 'EisType',
    'EisKind', 'Herkomst', 'EisCategorie', 'Tekst']),
};
const API = `${CONFIG.base}/api/v1`;
const addSig = (m, s) => m.set(s, (m.get(s) || 0) + 1);
const totalOf = (m) => [...m.values()].reduce((a, b) => a + b, 0);

// ── expected signatures from a normalized document ──────────────────────────────────────
function expectedSigs(doc) {
  const sig = new Map();
  const val = (label, v, path) => {
    if (v === true) addSig(sig, `${path}/${label}::TRUE`);
    else if (v === false || v == null) { /* PROP-false / null ⇒ no pair */ }
    else if (typeof v === 'string' || typeof v === 'number') addSig(sig, `${path}/${label}::${v}`);
    else if (Array.isArray(v)) for (const x of v) val(label, x, path);
    else if (typeof v === 'object') walk(v, `${path}/${label}`);
  };
  const walk = (obj, path) => { for (const [k, v] of Object.entries(obj)) val(k, v, path); };
  walk(doc, '');
  return sig;
}

// ── reconstructed signatures from the exported population ────────────────────────────────
function actualSigs(pop) {
  const relRe = /^([^[]+)\[[^*]+\*([^\]]+)\]$/;
  const out = new Map();
  for (const b of pop.links || []) {
    const m = relRe.exec(b.relation || ''); if (!m) continue;
    const [, label, tgtConcept] = m;
    for (const lk of b.links || []) {
      if (!out.has(lk.src)) out.set(lk.src, []);
      out.get(lk.src).push({ label, tgt: lk.tgt, tgtConcept });
    }
  }
  const roots = (pop.atoms || []).filter((b) => b.concept === CONFIG.rootConcept).flatMap((b) => b.atoms || []);
  const sig = new Map();
  const walk = (atom, path, depth) => {
    if (depth > 25) return;
    for (const e of out.get(atom) || []) {
      if (e.tgt === atom) { addSig(sig, `${path}/${e.label}::TRUE`); continue; }      // reflexive PROP
      if (CONFIG.leafConcepts.has(e.tgtConcept)) addSig(sig, `${path}/${e.label}::${e.tgt}`);
      else walk(e.tgt, `${path}/${e.label}`, depth + 1);
    }
  };
  for (const r of roots) walk(r, '', 0);
  return sig;
}

const reinstall = () => fetch(`${API}/admin/installer?ignoreInvariantRules=true`).then((r) => { if (!r.ok) throw new Error(`installer ${r.status}`); });
async function postDoc(doc) {
  const r = await fetch(`${API}/resource/SESSION/1/${CONFIG.interface}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(doc),
  });
  let body = {}; try { body = await r.json(); } catch { /**/ }
  return { status: r.status, body };
}
const exportPop = () => fetch(`${API}/admin/exporter/export/all`).then((r) => { if (!r.ok) throw new Error(`export ${r.status}`); return r.json(); });

function listData(dir) {
  return readdirSync(dir, { recursive: true })
    .filter((f) => typeof f === 'string' && /\.(ya?ml|json)$/.test(f)).map((f) => join(dir, f)).sort();
}
const parse = (p) => (/\.(ya?ml)$/.test(p) ? yaml.load(readFileSync(p, 'utf8')) : JSON.parse(readFileSync(p, 'utf8')));
const pathOf = (s) => s.slice(0, s.lastIndexOf('::'));

async function main() {
  const files = listData(CONFIG.corpus);
  const expected = new Map();
  let committed = 0, fail = 0;
  await reinstall();
  console.log(`== ${files.length} files from ${CONFIG.corpus} ==`);
  for (const p of files) {
    const doc = normalize(parse(p));
    for (const [s, n] of expectedSigs(doc)) expected.set(s, (expected.get(s) || 0) + n);
    const { status, body } = await postDoc(doc);
    if (body.isCommitted === true || body?.invariantRulesHold === true || status === 200) committed++;
    else { fail++; if (fail <= 15) console.log(`  POST ${p.split('/').pop()}: ${status} ${JSON.stringify(body).slice(0, 160)}`); }
  }
  const actual = actualSigs(await exportPop());
  const expTotal = totalOf(expected);
  let matched = 0, extra = 0;
  for (const [s, n] of expected) matched += Math.min(n, actual.get(s) || 0);
  for (const [s, n] of actual) extra += Math.max(0, n - (expected.get(s) || 0));
  const score = expTotal ? (100 * matched / expTotal) : 0;
  console.log(`  committed: ${committed}/${files.length}${fail ? ` (${fail} POST fails)` : ''}`);
  console.log(`SCORE: ${score.toFixed(2)}%  (${matched}/${expTotal}; ${extra} extra)`);
  const report = (label, m) => {
    const byPath = new Map();
    for (const [s, n] of m) byPath.set(pathOf(s), (byPath.get(pathOf(s)) || 0) + n);
    const top = [...byPath].sort((a, b) => b[1] - a[1]).slice(0, 8);
    if (top.length) { console.log(`  ${label}:`); for (const [pp, n] of top) console.log(`    ${n}×  ${pp}`); }
  };
  if (matched < expTotal) { const miss = new Map(); for (const [s, n] of expected) { const d = n - Math.min(n, actual.get(s) || 0); if (d) miss.set(s, d); } report('missing (per path)', miss); }
  if (extra > 0) { const ex = new Map(); for (const [s, n] of actual) { const d = n - (expected.get(s) || 0); if (d > 0) ex.set(s, d); } report('extra (per path)', ex); }
  process.exit(matched === expTotal && extra === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
