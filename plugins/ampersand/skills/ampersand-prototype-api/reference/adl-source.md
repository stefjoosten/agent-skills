# Reading the `.adl` source

The `.adl` (Ampersand Definition Language) source is the human-authored
specification the prototype was generated from. Use it to understand the
*meaning* behind the API: what concepts and relations exist, which rules
constrain the data, and how interfaces expose them. When `interfaces.json` is
missing, the `INTERFACE` definitions here are the fallback source for the
endpoint map.

## Statements that shape the API

### CONCEPT
Declares an entity type. A concept can appear as the **source of an interface**
(an API entry point) and as the **source/target of relations** (fields).

### RELATION
Declares a typed relation `r :: A * B` with multiplicity properties
(`[UNI]`, `[TOT]`, `[INJ]`, `[SUR]`, etc.). Relations are the editable substance
of the API:

- A field backed directly by a relation is **mutable** (subject to its CRUD
  annotation and multiplicity). `[UNI]` → single value; otherwise → a set/array.
- Multiplicity drives what a legal mutation looks like (e.g. replacing a `[UNI]`
  field vs adding/removing members of a non-`[UNI]` field).

### RULE / invariant
Declares a constraint that must always hold. Every mutation is checked against
the rules; a violating change is rejected and reported in the response envelope.
Read the relevant rules before mutating so you can predict and explain rejections
instead of trial-and-error.

- `RULE` (invariant) — must always hold; blocks non-conforming commits.
- Process rules / `ROLE MAINTAINS` — signal work to be done (violations surface
  as notifications) rather than hard blocks. Distinguish the two when
  interpreting a response.

### INTERFACE
Defines an API resource and its BOX structure. Key parts:

```
INTERFACE "Name" : srcExpr cRud
BOX [ "label" : term cRud
    , "sub"   : term cRud BOX [ ... ]
    ]
```

- The interface's **source expression** sets the entry concept / resource path.
- Each BOX item's **label** is the JSON field name and sub-resource path segment.
- Each item's **term** is the expression producing the value; note its target
  concept and whether it is a plain relation (editable) or a computed expression
  (read-only).
- The **CRUD annotation** (`cRud` etc.) per item gates create/update/delete.

### IDENT
Defines an identifying key for a concept; relates to the `_id_` used in resource
paths.

### VIEW
Defines how atoms of a concept are rendered as a label; relates to `_label_` and
`_view_` in API responses. Useful for producing human-readable references.

## Practical reading order

1. Skim **CONCEPT** and **RELATION** to learn the data model and multiplicities.
2. Read **INTERFACE** blocks to map resources, fields, nesting, and CRUD rights
   (cross-check with `interfaces.json`).
3. Read **RULE**s touching the relations you intend to change, so you can predict
   which mutations will be accepted.
4. Note **IDENT**/**VIEW** to interpret identifiers and labels in responses.
