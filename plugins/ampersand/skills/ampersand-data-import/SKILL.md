---
name: ampersand-data-import
description: >-
  Turn an arbitrary structured dataset (YAML / JSON / Excel — a domain tree, AST,
  or export) into an Ampersand model that imports it as population via the
  interface-as-schema route, driven to 100% correct pairs by autoresearch. Use
  whenever the user wants to ingest a dataset into an Ampersand prototype as
  population, asks for "an Ampersand script that reads these files", wants a
  populatie/import model, or wants to migrate structured data into an Ampersand
  context. The deliverable is ALWAYS an Ampersand model (concepts + relations +
  one SESSION-rooted import interface whose labels equal the data labels) that
  both importers can read — plus a thin, temporary normalizer and a structural
  verify harness. Assumes the autoresearch skill is available to run the loop.
---

# Importing a dataset into Ampersand as population

The job: given a pile of structured data files, produce an **Ampersand model**
whose relations store the data and whose **interface maps every data label to a
relation**, so an importer reads each file as population — and iterate with
**autoresearch** until 100% of the pairs land correctly (nothing skipped, nothing
mis-routed, no extras).

**Hard contract (never negotiable):** the result is an Ampersand model that the
importers read. Not a bespoke converter that emits atoms/links by hand — that is
the atom-pair approach and it does not scale or generalise. The interface is the
schema; the importer interprets the data through it. It will not always be as
easy as one pass; the *shape* of the answer is always the same.

## First: know the two import routes (verified, easy to get wrong)

"Interface-as-schema" (the importer uses your INTERFACE/relations to interpret a
document) is NOT available everywhere. Derive the live prototype's truth, but
these hold across current Ampersand:

| Input | Runtime importer | Compile-time (`INCLUDE`) |
|---|---|---|
| **Nested YAML/JSON** (domain tree) | **resource-API**: `POST /api/v1/resource/SESSION/1/<Interface>` with the nested JSON body. `Resource::put()` recurses the document through the interface, creating atoms (`_NEW`) and links. **Not** `/admin/import` — that path reads only the flat `atoms`/`links` dump. | **None directly.** `.json` INCLUDE = Atlas (full context), no `.yaml`. Bridge nested data to `.xlsx` or generate a `POPULATION.adl`. |
| **Excel `.xlsx`** | `/admin/import` → ExcelImporter **INTERFACE approach**: sheet title = interface label, columns = sub-interface labels. | `INCLUDE "file.xlsx"` → same interface approach. |

So one shared model (concepts + relations + one interface) serves **both** routes:
the interface drives the runtime resource-API for nested data, and the Excel
INTERFACE approach (compile-time and runtime) for tabular data. For compile-time
parity on nested data, bridge to interface-shaped `.xlsx` or emit `POPULATION.adl`.

Session id in the resource path is conventionally **`1`** (`resource/SESSION/1/…`).
Import runs in one transaction; with no RULEs nothing blocks the commit.

## Method

### 1. Scan the schema exhaustively — do NOT design from a few samples
Walk EVERY file. Record, per key-path: kind (scalar / list-of-scalar / object /
list-of-object / null / empty), value types, nullability, and the **max nesting
depth** of any recursive structure. Also count the **total scalar leaves** — that
is the denominator of "100% of pairs". See `scripts/schema_scan.py`.

### 2. Design the model — labels ARE the data labels
- One **root concept** per record (e.g. `Document`), keyed to preserve record
  identity when the same entity recurs across files.
- One **relation per label**. Reuse a relation name across parents with different
  signatures where the same label appears at several levels (Ampersand allows it).
- **Leaf concepts** hold values (crop, organism, heading…). Free text and any
  value that can exceed ~254 chars → `REPRESENT … TYPE BIGALPHANUMERIC`; the
  default OBJECT id is capped at 254 and throws "Data entry is too long".
- **Booleans** → `[PROP]` relations (true = reflexive pair; false/absent = no pair).
- **Recursion**: model a self-referential relation (`sub[X*X]`) but **unroll the
  interface** to the observed max depth + 1 margin — do NOT rely on a
  self-referencing (recursive REF) interface unless a spike proves the resource-API
  walks it.
- **The interface must be schema-complete.** An unknown label is silently skipped
  with only a warning (`Resource::put()`), losing pairs quietly. Every data label
  needs a matching interface label. `"_SESSION";V[SESSION*Root]` root, full CRUD so
  post/put may create.

### 2b. Tabular / denormalized sources (a wide join, not a nested tree)
A relational export (e.g. an Oracle `SELECT` dumped to `.xlsx`) is one flat, wide table whose
grain is a **cartesian product** of independent axes (`A ⋈ B ⋈ C` via outer joins) — one logical
record spread over many rows. Do NOT model one atom per row. Instead **un-cross**: project each
entity's columns + its parent key, then **dedup** — this losslessly recovers the original
normalized tables (safe precisely because the axes are independent). Then:
- One **concept + one SESSION-interface + one worksheet per entity**. The Excel INTERFACE approach
  is a **single-level star flatten** (row = one root atom + its directly-linked targets); a
  multi-entity model therefore needs one sheet per concept, not one giant sheet.
- **Intermediate entities with no natural key** (a join row that isn't itself an entity in the
  source) get a **synthetic, deterministic id** (`K<parent>_<i>`) written by the normalizer, plus
  a back-link relation to their parent. The metric compares them **id-agnostically** by
  reconstructed content, not by the synthetic id.
- A column that is functionally an attribute but varies within the key (e.g. a translation that
  exists per language) is its **own small entity**, not a mis-keyed attribute — check per-key
  constancy of every column during the scan.

### 3. Thin, temporary normalizer (only if the data is irregular)
Canonicalise known quirks so every label matches an interface label: singular↔plural
keys, mixed scalar/object elements, wrapper variants, drop `null` values (a null
key must vanish, not `set(null)`). Keep it minimal and documented as **removable**
once the source is fixed upstream — treat irregularities as migration defects, not
model features. Never drop data.

### 4. Structural verify metric — path signatures, cross-checked
"100%" must mean: every leaf under the RIGHT relation, correct multiplicity, zero
extras. Value-only counting is too weak (a leaf under the wrong relation still
"matches"). Instead:
- **Expected**: from the normalized document, emit one signature per leaf =
  `relation-path-from-root :: value` (booleans → `path::TRUE`; false/null → none).
- **Import** each file via the route (§ routes above).
- **Actual**: export the population (`GET /api/v1/admin/exporter/export/all`),
  reconstruct the tree from each root atom following relations, emit the same
  signatures (leaf concept → value; reflexive PROP → `TRUE`; else recurse).
- **Compare as SETS, not multisets, for shared atoms.** Population links are a set
  (a link exists or not, multiplicity 1). A fact about a shared value/lookup atom
  (`organismName(oge) = "…"`) is derived from many source rows but is ONE link — the
  expected counter must dedup it, or it reports false gaps. Facts that embed the parent
  id (`ese|land|…`) are already unique. When every fact carries enough context to be
  unique, set semantics is exactly right; reach for multisets only if a genuine
  duplicate link can exist.
- **Cross-check the expected counter with a second implementation** (e.g. Python
  vs JS) so the denominator is not a counter bug. The importer and the counter
  must be different implementations.

See `templates/verify-import.mjs` for a ready metric+harness; adapt the leaf-concept
set, root concept and interface label.

### 5. Run autoresearch to 100%
Wire the verify as the metric. Iterate ONLY the model + normalizer. Start on a
**small heterogeneous sample** that covers every schema variant; reach 100% there,
then **widen to the full corpus**. Each gap → find the single root cause → fix →
re-verify. Framework/importer changes only with an explicit checkpoint.

## Pitfalls (each cost real time)
- Unknown label → silently skipped (warning only). Interface must cover the schema;
  the metric must catch any dropped leaf.
- 254-char OBJECT-id limit → "Data entry is too long". BIGALPHANUMERIC for long values.
- `/admin/import` with YAML/JSON is the atoms/links dump, NOT interface-as-schema.
  Use the resource-API for nested data.
- Compile-time has no YAML/JSON-via-interface; only `.xlsx`. Bridge for parity.
- 100% on the first small sample is suspicious — sharpen the metric (structural +
  no-extras) and widen before believing it.
- **DATE / INTEGER concepts reject text cells at compile time.** The compile-time xlsx
  importer errors on a string cell for a `DATE`/`INTEGER`-typed concept ("…without
  surrounding quotes"), and a real Excel date cell becomes a serial number — also a
  mismatch. Store dates/numbers **verbatim as text** (`ALPHANUMERIC`); it is lossless and
  works on both importers. Type them only if a spike proves it.
- **Both xlsx importers load the whole workbook in memory — bulk data OOMs at default
  configs.** Compile-time `INCLUDE` bakes the population into generated code and dies well
  below 100k rows; it is for **modest reference populations only**. Runtime `/admin/import`
  (PhpSpreadsheet) fails at the default PHP `memory_limit` (128 MB) on tens of thousands of
  rows — raise it (GBs) and it handles a full chunk. For bulk: **runtime route, raised
  memory_limit, and chunk the source** (e.g. per file/group). Keep the merge-gate on a small
  pinned sample; run the full corpus as a separate, heavier check.

## Files
- `scripts/schema_scan.py` — exhaustive schema + leaf count + max recursion depth.
- `templates/verify-import.mjs` — path-signature metric: expected vs reconstructed,
  exact compare, per-path gap report.
- `reference/import-routes.md` — the route table with the source-code anchors.
