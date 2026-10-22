# Ampersand import routes — the interface-as-schema facts

Anchors are for the PrototypeFramework backend and the Ampersand compiler. Verify
against the live prototype and the version in front of you; conventions drift.

## Runtime (a running prototype)

`POST /api/v1/admin/import` — file upload, routed by content in
`PopulationController::importPopulationFromUpload`:
- `.xlsx` → `ExcelImporter` — **INTERFACE approach** when a sheet title equals an
  interface label (`getInterfaceByLabel`), else the two-header-row RELATION blocks.
  This IS interface-as-schema.
- `.json` / `.yaml` → `JsonPopulationImporter` / `YamlPopulationImporter` — the flat
  **`atoms`/`links` dump** only. Rejects anything without those keys. This is NOT
  interface-as-schema; do not use it for a nested domain document.

`POST /api/v1/resource/SESSION/1/<Interface>` with a nested JSON body — the
**resource-API**. `Resource::put()` walks the body against the interface: nested
object without `_id_` → `ResourceList::post()` → new `_NEW` atom → `put()` again
(recurses); scalar → `set`/`add`; label looked up via `$this->list($ifcId)`, so
**body key = interface label**. Unknown label → skipped with a warning (silent
loss). This is the interface-as-schema route for nested YAML/JSON (convert YAML→JSON
first; the reserialisation is faithful). Requires a SESSION-rooted interface
(`"_SESSION";V[SESSION*C]`) with Create rights.

`GET /api/v1/admin/exporter/export/all` — exports the whole population as the
`atoms`/`links` JSON (use it to verify what actually landed).

`GET /api/v1/admin/installer?ignoreInvariantRules=true` — reinstall / empty DB.

## Compile-time (the Ampersand compiler, `INCLUDE`)

Dispatch is by extension (`Input/Parsing.hs`):
- `.xlsx` → `parseXlsxFile` + `xlsxIfcSheet2pops` — the same INTERFACE approach
  (and RELATION blocks). Interface-as-schema at compile time.
- `.json` → Atlas import (`AtlasImport.parseJsonFile`) — a full P_Context
  serialisation, NOT domain-data-via-interface.
- `.archimate` / `.ttl` / `.ifc` → their own model formats.
- No `.yaml` / `.yml` handler; anything else parses as ADL text.

So there is **no compile-time YAML/JSON-via-interface**. For compile-time parity on
nested data, bridge: emit an interface-shaped `.xlsx` and `INCLUDE` it, or generate
a `POPULATION.adl`.

## The one-line summary

Interface-as-schema exists for `.xlsx` (both times) and, at runtime only, for nested
JSON via the resource-API. Everything else is either the flat atoms/links dump
(runtime JSON/YAML) or a full-context format (compile-time `.json` = Atlas). Build
one model + one SESSION interface (labels = data labels) and drive the correct route
per format.
