# Reading the generated `interfaces.json`

`interfaces.json` is emitted by the Ampersand compiler and is the authoritative,
machine-readable map of the prototype's API. Read it first; it tells you exactly
which resources exist and how they are shaped, without guessing.

## Where to find it

Search the prototype's build output:

```bash
find . -name interfaces.json
# common locations: generated backend "generics" output of the prototype
```

If there are several (e.g. per build), use the one belonging to the running
prototype. If none exists, derive the interface map from the `.adl` `INTERFACE`
definitions instead (see `adl-source.md`).

## What it contains

The file lists the prototype's interfaces. For each interface you typically get
(field names vary by version — inspect the actual JSON keys):

- **name / label** — the interface name; becomes part of the resource path.
- **source concept** — the concept the interface is *for* (its API entry point).
- **roles** — which roles may use the interface (not a barrier here, since this
  prototype has no auth, but useful context).
- **the BOX tree** — the nested structure of the interface. Each box item has:
  - a **label** (the JSON field name in API responses and the path segment for
    sub-resources),
  - an **expression** (the relation/term producing the field's value, with its
    source and target concepts),
  - **multiplicity** hints (univalent → single value; otherwise → array),
  - a **CRUD annotation** (which of C/R/U/D is allowed on that box/field),
  - optionally a nested **sub-BOX** (object or list of objects).

## How to turn it into an endpoint + CRUD map

For each top-level interface:

1. Record the **resource path** from its source concept (see the path patterns in
   `api-conventions.md`).
2. Walk the BOX tree to build the **expected JSON shape** of a GET response:
   field labels, which are scalars vs nested objects vs arrays.
3. For each field/box, note the **CRUD rights**. These determine which mutations
   are legal:
   - **C** → you may create a new target atom through this field.
   - **R** → readable (almost always on).
   - **U** → you may replace/add/remove links on this field.
   - **D** → you may delete the atom reached here.
4. Note any field whose expression is a **single relation** (directly editable)
   versus a **computed term** (read-only even if R is set).

Keep this map; you will reconcile it against the live API in the probe step
before performing any writes.

## Tips

- The labels in `interfaces.json` are exactly the keys you will see in API JSON
  and use in JSON Patch `path` values — copy them verbatim, mind the case.
- IDENT and VIEW definitions (from the `.adl`) explain `_id_` and `_label_`/
  `_view_` in responses; cross-reference when labels are non-obvious.
