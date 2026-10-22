# Relations in Ampersand — the semantics behind the relation matrix

This reference distills what the DDA course (Conceptueel Analyseren) and the Ampersand
documentation say about relations. The relation matrix rests on these definitions; respect
them in every use of the matrix.

## What a relation is

A relation is a set of pairs of atoms. Its content changes over time: pairs are inserted
and deleted, by users and by rules. Each pair represents a fact — a basic sentence
("basiszin") that is held true within the context at the moment of observation. Truth
holds within a context, so a relation holds within a context.

The declaration `RELATION r[A*B]` introduces the relation: `r` is the name, `A` the
source, `B` the target, and `[A*B]` the type. The **signature** `r[A*B]` identifies the
relation within its context. The name alone is meaningless and need not be unique:
`name[Book*Name]` and `name[Person*Name]` are different relations. Consequence for the
matrix: a row is identified by Name + Source + Target (+ Context), never by name alone.
If `(a,b)` is a pair in `r[A*B]`, then atom `a` is an `A` and atom `b` is a `B`.
An endorelation has equal source and target: `r[A*A]`, abbreviated `RELATION r[A]`.

## Documenting a relation

Three statements carry the documentation; the matrix stores all three:

- **PURPOSE** — the reason of existence: why must this be registered (nut en noodzaak)?
- **MEANING** — the criterion that decides whether a pair belongs in the relation.
  Formulate it so a reader can judge any candidate pair.
- **Example pairs** — three pairs (fictitious if needed) that make the meaning concrete.

The relation name carries no meaning of its own; choose it to help remember the meaning.
`PRAGMA` (the sentence template around a pair) exists but is being superseded by the
`VIEW` statement; the matrix does not track it.

Elicitation questions from the relation quest, useful whenever a candidate relation
appears in text or data:

1. Which basic sentence structure fits? Is every such sentence true at the moment of
   observation, within the context?
2. Is the notion permanent? Then it may be a concept instead.
3. Can it be a property (`RELATION p[A] [PROP]`)?
4. Does a smart choice of source and target simplify the model?
5. Why register it — what is the purpose?

## Special relations

For every pair of concepts `A`, `B` the full relation `V[A*B]` exists (contains every
pair). For every concept `A` the identity `I[A]` exists (exactly the pairs `(a,a)`).
In matrix view: `V` has every cell ticked; `I` has exactly the diagonal ticked.

## Multiplicity restrictions

Declared between square brackets, e.g. `[UNI,TOT]`. For `r[A*B]`:

| Code | Name       | Semantics                                   | In a population matrix (rows = source atoms, columns = target atoms) |
| ---- | ---------- | ------------------------------------------- | -------------------------------------------------------------------- |
| UNI  | univalent  | every `a` has at most one `b`               | at most one tick per row                                              |
| TOT  | total      | every `a` has at least one `b`              | at least one tick per row                                             |
| INJ  | injective  | every `b` has at most one `a`               | at most one tick per column                                           |
| SUR  | surjective | every `b` has at least one `a`              | at least one tick per column                                          |

Shorthands: MAP = UNI,TOT (function); BIJ = INJ,SUR. An attribute is a univalent (or
injective) relation; UNI alone may be empty for some source atom, UNI,TOT must be filled.

Additional restrictions exist for endorelations `r[A*A]`:

| Code | Name          | Semantics                                              | Matrix pattern                    |
| ---- | ------------- | ------------------------------------------------------ | --------------------------------- |
| RFX  | reflexive     | every `(a,a)` is in `r`                                | full diagonal                     |
| IRF  | irreflexive   | no `(a,a)` is in `r`                                   | empty diagonal                    |
| SYM  | symmetric     | `(a,b)` in `r` implies `(b,a)` in `r`                  | mirror-symmetric around diagonal  |
| ASY  | antisymmetric | `(a,b)` and `(b,a)` both in `r` implies `a` = `b`      | no mirrored pair off the diagonal |
| TRN  | transitive    | `(a,b)` and `(b,c)` in `r` implies `(a,c)` in `r`      | paths are shortcut                |
| PROP | property      | SYM and ASY combined, which is equivalent to `r ⊆ I`   | ticks on the diagonal only        |

Well-known combinations: partial order = RFX,ASY,TRN (e.g. an ancestor relation);
equivalence = RFX,SYM,TRN (e.g. "contains the same amount of money").

## Terms: how relations combine

Rules and interfaces use terms built from relations with operators. Recognizing them is
needed to find where a relation is *used*:

| Operator      | Ampersand    | Meaning of `a (…) b`                                       |
| ------------- | ------------ | ---------------------------------------------------------- |
| converse      | `r~`         | `b r a`                                                    |
| composition   | `r;s`        | there is a `c` with `a r c` and `c s b`                    |
| union         | `r \/ s`     | `a r b` or `a s b`                                         |
| intersection  | `r /\ s`     | `a r b` and `a s b`                                        |
| difference    | `r - s`      | `a r b` and not `a s b`                                    |
| complement    | `-r`         | not `a r b` (precisely: `V[A*B] - r`)                      |
| closures      | `r+`, `r*`   | transitive, reflexive-transitive closure                   |
| inclusion     | `RULE r |- s`| every pair of `r` is in `s`                                |
| equality      | `RULE r = s` | `r` and `s` contain the same pairs                         |

## How pairs enter and leave a relation

This determines the usage columns of the matrix. Pairs change through:

1. **Interfaces** — a user edits fields. Each field term carries CRUD rights (see below).
2. **ENFORCE rules** — the computer maintains the relation:
   `ENFORCE r := term` (grow and shrink to equal the term),
   `ENFORCE r >: term` (grow to include the term),
   `ENFORCE r :< term` (shrink to stay within the term).
3. **ExecEngine rules** — a RULE maintained by role ExecEngine whose VIOLATION text calls
   `InsPair;r;…` (adds a pair), `DelPair;r;…` (removes a pair), or `NewStruct;…` (creates
   an atom plus pairs in the listed relations). These relation names live inside strings
   and escape type checking; treat them as first-class usage when filling the matrix.
4. **Population statements and imports** — `POPULATION r CONTAINS […]`, included
   spreadsheets, and the runtime import API.

## CRUD rights in interfaces

A field term may carry a crud annotation of four letters in fixed order, upper case =
allowed, e.g. `cRud` (read only) or `cRUd` (read + update). Meaning per letter, for the
target of the field term:

- **C** — create a new target atom (and thereby new pairs);
- **R** — read the pairs;
- **U** — update: insert and remove pairs of the relation in the field term;
- **D** — delete a target atom (and thereby its pairs).

Without an annotation the project default applies (`defaultCrud` in the configuration;
the common default is `cRud`). `FOR <roles>` on the interface grants these rights to the
listed roles. An interface without `FOR` is reachable by no one — that includes the
anonymous session. `API` interfaces behave the same without appearing in the menu.

## Reading the columns of the relation matrix

Rows one relation each. Columns 1–8 describe the declaration and its provenance
(signature, origin file, PURPOSE, MEANING, multiplicity restrictions, three example
pairs). Columns 9–10 locate the declaration (context, patterns). Columns 11–15 list the
rules that use the relation, the rules that add or remove pairs (ENFORCE,
InsPair/DelPair, the pair inserts of NewStruct), and the rules that add or remove atoms
in its source or target concept (InsAtom/NewStruct, MrgAtoms). Columns 16–19 list the
interfaces that mention the relation and those that update it, create pairs, or remove
pairs, following the CRUD semantics above. Columns 20–23 list the roles that may create,
read, update, or delete pairs — the union of the rights granted by the interfaces in
which the relation occurs, taken per role from the `FOR` clauses. Column 24 records the
resources from which the population originates.
