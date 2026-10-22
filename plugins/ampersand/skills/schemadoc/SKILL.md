---
name: schemadoc
description: Build and maintain the schema documentation of an Ampersand context — one xlsx workbook (./docs/schemaDoc.xlsx) with three sheets: the concept matrix (one row per concept), the relation matrix (one row per relation), and the rule matrix (one row per rule, with purpose, meaning, formal term, enforcement, maintaining roles, and violation actions). Use it whenever the user mentions the conceptenmatrix / concept matrix, relatiematrix / relation matrix, rule matrix / regelmatrix, or schemaDoc; wants an overview of the concepts, relations, or rules in an Ampersand model; wants CONCEPT/RELATION/RULE declarations generated from the matrices; wants a population analysed; runs a concept, relation, or rule quest; or asks to check consistency between model, matrices, and documentation. Also load it before committing in any project that keeps these matrices.
---

# The schema documentation: three matrices, one workbook

The set of concepts, relations, and rules of a context is called "the **schema**" of
that context. It defines (among other things) the shape an incoming dataset must have
before it may be loaded. This skill maintains the living register of that schema: one
xlsx workbook with three data sheets —

| Sheet | Content | Reference |
| ----- | ------- | --------- |
| 1. `Concepts`  | one row per concept, 26 columns  | `REFERENCE-concepts.md` |
| 2. `Relations` | one row per relation, 24 columns | `REFERENCE-relations.md` |
| 3. `Rules`     | one row per rule, 15 columns     | `REFERENCE-rules.md` |

— plus a `Legend` sheet that explains every column. The workbook serves as overview
during design, as the recorded outcome of the concept, relation, and rule quests, as
the source for generating Ampersand declarations, as the reference that keeps all
design artefacts aligned, and as the frame for analysing populations. Read the three
REFERENCE files (same directory) first: they hold the semantics that every use of the
matrices must respect. The sheets are complementary: every Source/Target in the
Relations sheet must be a row in Concepts, and every name in the rule cross-columns
(Relations used/written, Concepts touched) must be a row in Relations or Concepts.

## Format

Every sheet has its header row frozen and autofilter on. The Concepts and Relations
columns are unchanged from the former separate matrices:

**Concepts** (row identity: Name + Context): Name, Context, Origin, Purpose,
Definition, TIPI, Identity, Notational conventions, Example atoms, Generalisations
(ISA), Specialisations, Representation, Views, IDENT statements, Patterns (declared
in), Relations (as source), Relations (as target), Rules (adding atoms), Rules
(removing atoms), Interfaces (showing), Interfaces (creating atoms), Interfaces
(deleting atoms), Roles (create), Roles (read), Roles (delete), Resource(s).
The columns TIPI, Identity, and Notational conventions are purely manual: they record
judgement calls that belong to the modeller.

**Relations** (row identity: Name + Source + Target + Context — the signature; the
name alone identifies nothing): Name, Source, Target, Context, Origin, Purpose,
Meaning, Multiplicity restrictions, Example pairs, Patterns (declared in), Rules (used
in), Rules (adding pairs), Rules (removing pairs), Rules (adding atoms), Rules
(removing atoms), Interfaces (mentioning), Interfaces (updating), Interfaces (creating
pairs), Interfaces (removing pairs), Roles (create), Roles (read), Roles (update),
Roles (delete), Resource(s).

**Rules** (row identity: Name + Context — the compiler requires rule names to be
unique per context):

| #  | Column                | Content                                                       |
| -- | --------------------- | ------------------------------------------------------------- |
| 1  | Name                  | rule label; `ENFORCE <rel> <op>` for an ENFORCE; synthetic for an unlabelled rule |
| 2  | Context               | the context this row belongs to                               |
| 3  | Origin                | the file (relative path) that declares this rule              |
| 4  | Purpose               | why must this rule hold (PURPOSE RULE)?                       |
| 5  | Meaning               | the constraint in natural language (MEANING), judgeable by a stakeholder |
| 6  | Formal term           | the relation-algebra term; for ENFORCE: `<rel> <op> <term>`   |
| 7  | Enforcement           | invariant / process / automated / ENFORCE := / >: / :<        |
| 8  | Maintained by         | roles from ROLE … MAINTAINS; empty for an invariant           |
| 9  | Message               | MESSAGE text(s) shown on violation                            |
| 10 | Violation text        | VIOLATION segments: the per-pair message, or the `{EX}` actions |
| 11 | Example violation     | manual: a concrete violating scenario, and how it resolves    |
| 12 | Patterns (declared in)| pattern(s) containing the declaration                         |
| 13 | Relations (used)      | relations the term reads — rows of the Relations sheet        |
| 14 | Relations (written)   | the ENFORCE target; InsPair/DelPair/NewStruct/SetToday targets |
| 15 | Concepts (atoms created/removed) | InsAtom/NewStruct (+), DelAtom/MrgAtoms (−)        |

Property rules (the compiled form of `[UNI]`, `[TOT]`, …) are deliberately not rows in
the Rules sheet: they live in the Multiplicity column of the Relations sheet.

Conventions, all sheets: an empty cell means "not yet analysed"; a single `-` means
"verified empty". Cells may be partially filled; a population analysis, for instance,
fills what the data shows and leaves the rest empty.

## Several contexts in one workbook

One workbook may hold several contexts side by side, and often should. A project
typically has one context that ends up in the running system, next to schema contexts
that describe the shape of incoming datasets. Each context corresponds to a separate
database, with its own rules, its own structure, and its own truth. Putting them in
one register makes the correspondence visible.

Every command is scoped to a single context, so the contexts never overwrite each
other. `scan` and `check` take the context from the `CONTEXT` statement of the scripts
they read (or from `--context`), refresh only the rows of that context, and pass every
other row through untouched. `gen` and `pop` take `--context`; `pop` insists on it as
soon as the workbook holds more than one. A schema context therefore needs no scripts
at all: its rows may live in the workbook long before an `.adl` file for it exists,
and `check` on another context stays silent about them.

## The script

`scripts/schemadoc.py` (python3 + openpyxl) does the mechanical work on all three
sheets at once:

```
python3 scripts/schemadoc.py scan  schemaDoc.xlsx model.adl interfaces.ifc ...
python3 scripts/schemadoc.py check schemaDoc.xlsx model.adl interfaces.ifc ...
python3 scripts/schemadoc.py gen   schemaDoc.xlsx out.adl [--context X]
python3 scripts/schemadoc.py pop   schemaDoc.xlsx population.xlsx ... [--context X]
```

Run `scan` and `check` from the directory the Origin paths should be relative to —
normally the repository root.

`scan` builds the workbook or updates it in place: script-derived columns are
refreshed; the manual columns (Purpose, Meaning, Definition, TIPI, Identity,
Notational conventions, Example atoms/pairs, Example violation) survive when the
scripts have no value yet; Origin and Resource(s) are never overwritten once filled;
and rows for vanished concepts, relations, or rules are kept (and reported).
`--seed <old.xlsx>` (repeatable) folds the rows of an older workbook in — this is the
migration path from the former separate ConceptMatrix.xlsx and RelationMatrix.xlsx,
whose sheets carry the same names and headers; rows already in the target win over
seeds. Extra columns or sheets that other tooling added are not preserved by a scan —
reapply them afterwards (as `matrices.sh` does with its thema-indeling).

`check` reports every difference between workbook and scripts and exits non-zero when
they disagree; a manual column only counts as a difference when both sides are filled,
so knowledge may live in the workbook before it reaches the code.

`gen` writes, per context, the CONCEPT declarations (with definition and PURPOSE,
plus CLASSIFY and REPRESENT), the RELATION declarations (with MEANING and PURPOSE),
and the RULE and ENFORCE statements (with MEANING, MESSAGE, VIOLATION, ROLE …
MAINTAINS, and PURPOSE), wrapped in `CONTEXT … ENDCONTEXT` — the preparation step for
a specification, and the way a schema context first becomes real Ampersand code. A
rule row without a formal term becomes a TODO comment, so the analysis may precede the
formalisation.

`pop` analyses a population held in Ampersand two-header-row spreadsheets, against the
Concepts and Relations sheets at once: it fills example atoms and pairs where the
workbook has none, tests the declared multiplicities against the actual data (UNI and
INJ, which a population can contradict), reports atoms shared by two concepts that
have no ISA link (a possible homonym, or a CLASSIFY the model lacks), and names the
concepts and relations that occur in the data but not in the workbook. Use
`--set-resource "<text>"` to record where the population came from. Verifying a
population against the *rules* is beyond a text-based tool — that is what the compiler
and the prototype are for. This is the reading half of the analysis; deciding what a
finding means stays with the modeller.

The scanner is text-based and approximates the grammar. Known limits: relation and
concept names inside ExecEngine `{EX}` strings are matched textually; a crud
annotation is applied to every relation and concept in its field fragment while only a
single-relation term is truly editable; the target concept of a field is derived from
the declared relation types, so an ambiguous relation name may attribute a field too
widely; and words that happen to look like statement keywords inside violation strings
can cut a parse window short. When a cell matters, verify it against the compiler:
`ampersand documentation`, or the generated `concepts.json` / `relations.json` /
`rules.json` of a prototype.

When analyzing, `scripts/schemadoc.py` must signal changes in the environment, because
the user can make changes in schemaDoc.xlsx or in other documents that might change
the matrices. However, when *using* the workbook — generating Ampersand code, deriving
documentation — it is the single source of truth: the user may have made changes in
the workbook that are not yet reflected in the Ampersand resources, and those changes
must be respected.

## Ways of working

The workbook is a living register that is used as a design artifact. It is the single
source of truth for other design artifacts, such as Ampersand code, documentation, and
semantic analysis.

**Analysis.** When analyzing a domain, the workbook is the first link in a chain of
documents that ends with a deployed set of applications. Help the user construct it by
analyzing all information available about the domain(s) of this project, and record
the outcome of the quests in the manual columns. If there are Ampersand resources
available, chances are that the user may want to make changes to them. For all other
uses assume the matrices frozen and authoritative.

**Recording the quests.** The concept quest produces the manual columns of the
Concepts sheet (Purpose, TIPI verdict, Definition, Identity, Notational conventions,
example atoms); the relation quest produces Purpose, Meaning, and example pairs; the
rule quest (see `REFERENCE-rules.md`) produces Purpose, Meaning, the enforcement
decision, and an example violation. The workbook is the quest's minutes; a definition
or agreement that is not in the workbook does not exist.

**Overview and design.** Keep the sheets sorted and filtered as needed; they answer
"what do we have?" at a glance. Use them actively to expose duplicates (two rows whose
Definition or Meaning overlaps), homonyms (one name whose Definition tries to say two
things), and unfinished thinking (rows without Purpose or Meaning; a concept used by
no relation; a rule without enforcement decision). The Rules sheet adds its own
review questions: an invariant that blocks a legitimate business situation should
perhaps be a process rule; an automated rule whose Relations (written) overlap another
rule's is a candidate oscillation; a process rule without a maintaining role reaches
no one.

**Generating code.** Fill the identifying and manual columns during analysis, then
`gen` produces the declarations. Purpose, Meaning, and Definition belong in the
workbook *before* the code exists — that is the quest, recorded.

**Analysing a population.** When the user offers a dataset (YAML, xlsx, CSV, a
running prototype), run `pop` and interpret: real examples, multiplicities the data
contradicts, candidate concepts and relations the model lacks, shared atoms without an
ISA link. Add findings to the workbook — new rows for new candidates, filled cells for
confirmed ones — and report differences between data and workbook explicitly. Filling
partially is normal.

**Reviewing and documenting.** When writing or reviewing documentation, take the
workbook as the checklist: every concept, relation, and rule the text mentions must
exist in the workbook with the same definition, signature, meaning, and enforcement,
and vice versa for the scope the document covers.

**Consistency gate before committing.** In a project that keeps this workbook, run
`check` before every commit that touches the model, and align in this order: the
meaning of the change decides which artefact is right, then workbook, scripts, and
documentation are brought to that same state in one commit. Never commit with a
failing `check` unless the difference is deliberate and recorded in the commit
message. A rename of a concept lands in all three sheets at once — one more reason the
sheets share one workbook and one scan.

## Placement in a project

Store the workbook under version control as `./docs/schemaDoc.xlsx` unless the project
decides otherwise. Projects migrating from the former separate registers
(`docs/ConceptMatrix.xlsx`, `docs/RelationMatrix.xlsx`) run one seeded scan:

```
python3 scripts/schemadoc.py scan docs/schemaDoc.xlsx \
    --seed docs/ConceptMatrix.xlsx --seed docs/RelationMatrix.xlsx \
    <model files>
```

and retire the old files once the manual columns are verified present.
