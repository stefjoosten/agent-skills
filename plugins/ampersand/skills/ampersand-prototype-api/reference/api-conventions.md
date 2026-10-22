# Ampersand prototype REST API conventions

These are the *typical* conventions of an Ampersand-generated backend. They hold
across common versions, but the generated `interfaces.json` and a live probe are
always authoritative — verify before relying on any pattern here.

## Base path

API calls live under a versioned API root, conventionally:

```
http://<host>[:<port>]/api/v1/
```

Resources correspond to INTERFACE definitions. A top-level interface whose source
concept is `C` is reached through the resource path for `C`.

Typical patterns:

```
GET  /api/v1/resource/<Concept>                 # list atoms exposed by a top-level interface on <Concept>
GET  /api/v1/resource/<Concept>/<atomId>        # one atom
GET  /api/v1/resource/<Concept>/<atomId>/<ifc>  # follow a sub-interface (BOX item) by its label
```

Atom identifiers in a path must be **URL-encoded** (they can contain spaces,
slashes, punctuation). Responses carry a `_path_` field on each (sub)resource —
prefer following `_path_` over reconstructing paths by hand.

## Response shape (read)

A GET returns JSON shaped by the interface BOX. Objects typically include
metadata fields alongside the interface fields:

- `_id_` — the atom's identifier
- `_label_` — a human-readable label (from the concept's VIEW, if any)
- `_path_` — the canonical resource path to this (sub)resource
- `_view_` — view data, when a VIEW is defined

Scalar fields appear by their interface label; univalent expressions yield a
single value, non-univalent ones yield arrays; sub-BOXes yield nested objects or
arrays of objects.

## Mutations (CRUD)

Mutations are gated by the **CRUD annotation** on each interface box/field
(written in the `.adl` as `Crud`, `cRud`, `crUd`, `cruD`, etc. — an uppercase
letter enables that operation: **C**reate, **R**ead, **U**pdate, **D**elete).
Only attempt operations the annotation enables.

### Update — JSON Patch (RFC 6902)

Updates are typically applied by `PATCH`ing a resource with a list of JSON Patch
operations whose `path` is relative to that resource:

```
PATCH /api/v1/resource/<Concept>/<atomId>
Content-Type: application/json

[
  { "op": "replace", "path": "/<field>", "value": "<newValue>" },
  { "op": "add",     "path": "/<field>", "value": "<atomToLink>" },
  { "op": "remove",  "path": "/<field>/<atomToUnlink>" }
]
```

- `replace`/`add` on a relation field links an atom (creating the target atom if
  the field allows it).
- `remove` unlinks. For non-univalent fields the value/atom to remove is part of
  the path.

### Create

Create a new atom for an interface that has the **C** right, conventionally:

```
POST /api/v1/resource/<Concept>
```

The response returns the new atom (with its `_id_`/`_path_`), which you then
patch to fill in fields.

### Delete

Delete an atom where the **D** right is enabled:

```
DELETE /api/v1/resource/<Concept>/<atomId>
```

## The response envelope — always check it

Ampersand runs its rules on every mutation inside a transaction. The mutation
response reports the outcome; inspect these (names may vary slightly by version):

- **commit status** — whether the transaction was committed (e.g. `isCommitted`).
  A non-committed response means the change did **not** take effect.
- **invariant rules** — whether invariant rules still hold (e.g.
  `invariantRulesHold`). If false, the change was rejected.
- **notifications** — structured `errors`, `warnings`, `infos`, and rule
  `violations`. These explain *why* a mutation was rejected.

Treat a rule violation as the prototype correctly enforcing its specification.
Surface the violation text to the user; do not retry blindly or route around the
rule to force a commit.

## HTTP status codes

- `2xx` — request processed (still check the envelope for commit/violations).
- `400` — malformed patch / bad request.
- `404` — resource path does not exist (often a wrong concept, atom, or label).
- `500` — backend error; capture the body for diagnosis.
