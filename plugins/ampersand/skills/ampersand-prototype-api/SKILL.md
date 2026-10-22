---
name: ampersand-prototype-api
description: >-
  Drive any running Ampersand prototype at the REST-API level. Use this skill
  whenever the user wants to read or mutate data in an Ampersand prototype, test
  or explore its generated API, or interact with a prototype programmatically
  instead of through its web UI. Triggers include mentions of an Ampersand
  prototype, an .adl/.ifc script, interfaces.json, INTERFACE/CONCEPT/RELATION/RULE
  definitions, or "the running prototype on localhost". The skill derives the
  available endpoints and CRUD rights from the generated interfaces.json plus the
  .adl source, then calls the prototype's API with curl/HTTP.
---

# Driving an Ampersand prototype via its REST API

An Ampersand prototype is a generated web application whose backend exposes a
generic REST API. The *semantics* of that API — which resources exist, how they
nest, and which create/read/update/delete rights each field has — are not
hard-coded: they are injected from the Ampersand compiler as JSON (notably
`interfaces.json`) and ultimately defined in the `.adl` source.

Therefore: **do not guess endpoints from memory.** Derive them from this
prototype's own `interfaces.json` and `.adl` source, then verify against the
live API. Conventions differ across Ampersand versions; the generated artifacts
are the ground truth for the prototype in front of you.

## Operating assumptions (this environment)

- The prototype runs **locally with no authentication** (typically via Docker on
  `http://localhost`, sometimes on a mapped port). No login/session step is
  required to call the API.
- The user wants **full CRUD** — reading *and* mutating data.
- The canonical specification sources are the generated **`interfaces.json`** and
  the **`.adl` source files**, not a live Swagger document. (A Swagger UI may
  exist at `/api/doc`, but treat the generated artifacts as authoritative.)

## Workflow

Follow these steps in order. Stop and report if a step fails rather than
inventing a fallback.

### 1. Locate the prototype and its artifacts

- Find the **`.adl` / `.ifc` source** the prototype was generated from
  (the script root, usually the file referenced by the build).
- Find the generated **`interfaces.json`** in the prototype's build output.
  It lives under the generated backend/generics (search the project for
  `interfaces.json`). If absent, note that and fall back to deriving the
  interface map from the `.adl` `INTERFACE` definitions.
- Determine the **base URL**. Default to `http://localhost`. If that is not
  reachable, check container/port mappings (e.g. `docker ps`) and ask the user
  only if it cannot be inferred.

See `reference/interfaces-json.md` and `reference/adl-source.md` for how to read
each artifact.

### 2. Build the endpoint + CRUD map

From `interfaces.json` (cross-checked against the `.adl` `INTERFACE` blocks):

- List every top-level interface, its **source concept**, and its API path.
- For each interface, walk the BOX structure to learn the **nested shape**
  (sub-objects, sub-lists) and the **expression** behind each field.
- Record the **CRUD annotation** (`Crud`/`cRud`/`crUd`/`cruD`, i.e. which of
  Create/Read/Update/Delete is enabled) per box and field. Only attempt
  mutations the annotations allow.

### 3. Verify against the running API

Before doing real work, probe the live prototype read-only:

- Run `scripts/probe_api.sh <base_url>` (or equivalent curl calls) to confirm the
  base URL, list resources for a top-level concept, and GET one resource so you
  can see the real JSON envelope and field names.
- Reconcile what you see with the map from step 2. Field labels, `_id_`/`_path_`
  metadata, and nesting must match before you mutate anything.

### 4. Read and mutate

- **Read** with `GET` on the resource path; follow `_path_` values in responses
  to navigate into nested resources.
- **Mutate** following this prototype's conventions as confirmed in steps 2–3.
  Ampersand backends typically apply changes via **JSON Patch (RFC 6902)** on a
  resource (`PATCH` with `add`/`replace`/`remove` operations), create new atoms
  via `POST`, and delete via `DELETE` — but always honor the CRUD rights and the
  exact request/response shape you verified live.
- After every mutation, **inspect the response envelope**: Ampersand reports
  whether the transaction committed, whether invariant rules hold, and any
  violations/notifications. Treat rule violations as the prototype rejecting the
  change, not as a transport error. Report them to the user verbatim.

See `reference/api-conventions.md` for the REST paths, the JSON Patch mutation
model, and the response-envelope fields to check.

### 5. Safety

- This is a live data store. Before destructive operations (`DELETE`, `remove`),
  state what will change and confirm with the user unless they have pre-approved.
- Never bypass a rule violation by manipulating data through another path to
  force a commit. Ampersand's rules are the spec; respect them.

## Pitfalls measured in practice

These hold for prototype-framework v2.9 to v2.18; check them again after an upgrade.

- A single `GET /api/v1/admin/installer` wipes the database and reinstalls it empty.
  Probe the API with `GET /api/v1/resource/<Concept>` instead, and test an admin route with `admin/report/relations`.
- A write that violates an invariant returns status 200 with `isCommitted: false`;
  the MESSAGE of the violated rule is under `notifications.invariants`. Status 200 alone is no proof of success.
- A `DELETE` of an atom also removes every pair it occurs in. When an invariant needs one of those pairs,
  the whole delete is refused; remove or update the dependent atoms first (see the skill `ampersand-rules` for what may go along).
- A field with `LINKTO INTERFACE` cannot be changed through the API: a JSON Patch on it returns 405, even with `cRUd`.
  Keep the editable field without `LINKTO` and put the navigation in a separate read-only field.
- The ExecEngine splits its instructions on semicolons, so an atom id that contains `;` makes every ENFORCE on it fail
  ("InsPair() expects 5 arguments"). Keep `;` out of atom ids, and reject such ids before loading.

## Quick reference

- `reference/interfaces-json.md` — read the generated interface map: paths,
  concepts, BOX nesting, CRUD rights.
- `reference/adl-source.md` — read the `.adl` source: CONCEPT, RELATION, RULE,
  INTERFACE, IDENT, VIEW, and how they shape the API.
- `reference/api-conventions.md` — REST path patterns, JSON Patch mutations,
  response envelope.
- `scripts/probe_api.sh` — discover base URL, list resources, GET a resource.
