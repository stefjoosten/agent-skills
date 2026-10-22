# Rules in Ampersand — the semantics behind the rule matrix

This reference distills what the Ampersand documentation (the RULE, ENFORCE, ROLE,
PURPOSE, MEANING, MESSAGE, and VIOLATION statements, plus the chapter on automating
rules) says about rules. The Rules sheet rests on these definitions; respect them in
every use of the matrix.

## What a rule is

A rule is a relation-algebra term that must be true: it constrains the data in the
relations it mentions. A rule states WHAT must hold, never HOW it is enforced — the
enforcement is a separate design decision, recorded in separate statements. Like
relations and concepts, a rule holds within its context.

The statement:

```text
RULE <label>? : <term> <meaning>* <message>* <violation>?
```

The label is optional but names the rule; the compiler requires rule names to be unique
within the context. Consequence for the matrix: a row is identified by Name (+ Context).
An unlabelled rule gets a synthetic name from its term, which changes whenever the term
changes — label your rules to keep the register stable.

The term uses the operators of REFERENCE-relations.md (`~ ; \/ /\ - |- =` and the
closures), plus the less common ones: residuals `/` and `\`, diamond `<>`, relative
addition `!`, cartesian product `#`. Three common shapes:

- `RULE r |- s` — inclusion: every pair of `r` must be in `s`. The violations are the
  pairs in `r - s`.
- `RULE r = s` — equality: both inclusions at once.
- `RULE t` — a bare term asserts that `t` holds for *every* pair of its type; the
  violations are the pairs where `t` does not hold. (So `RULE -(head;succ~)` says: no
  head has a predecessor.)

A **violation** is always a pair (source atom, target atom) for which the rule fails.
Everything downstream — blocking, signalling, repairing — operates per violation.

## The four enforcement options

Every rule is a constraint; how the system responds to a violation is a choice per rule.
The matrix records that choice in the Enforcement and Maintained-by columns.

1. **Invariant** (the default, no `ROLE … MAINTAINS`): the rule must hold at all times.
   The system blocks any transaction that would violate it and reports the message.
   Choose this when violating data may never enter the system.
2. **Process rule** (`ROLE <role> MAINTAINS <label>`): a named user role must keep the
   rule satisfied. A violation produces a persistent signal to that role; the data is
   accepted, the signal stays until a user resolves it. Choose this when a human must
   act, and temporary violations are part of the business process.
3. **Automated rule** (`ROLE ExecEngine MAINTAINS <label>`): the ExecEngine restores the
   rule mechanically by executing the `{EX}` actions in the VIOLATION text, once per
   violation per pass. Choose this when the resolution is mechanical and unambiguous.
4. **Derivable**: the rule follows logically from other rules; it needs no enforcement
   of its own. Such rules rarely reach the code, but may live in the matrix as
   documentation (Enforcement noted by hand).

The **ENFORCE statement** is the declarative form of automation, for the common case
that one relation is computed from a term:

```text
ENFORCE r := term   -- keep r equal to the term (adds and removes pairs)
ENFORCE r >: term   -- keep r a superset of the term (adds pairs; insert-only)
ENFORCE r :< term   -- keep r a subset of the term (removes pairs)
```

The compiler translates an ENFORCE into automated rules itself; you write no VIOLATION.
An ENFORCE has no label, so the matrix names the row `ENFORCE <relation> <operator>`.
Beware: the generated code writes its arguments separated by bare `;` — a relation whose
content is free text with semicolons breaks it; write such relations with explicit
ExecEngine rules instead.

**Property rules.** Every multiplicity annotation on a relation (`[UNI]`, `[TOT]`, …)
compiles into an invariant rule of its own. Those live in the Multiplicity column of the
Relations sheet and are deliberately not repeated as rows in the Rules sheet — one
source of truth per fact.

## The ExecEngine vocabulary

The VIOLATION text of an automated rule is a list of segments `TXT "…"`, `SRC <term>`,
`TGT <term>`; the `{EX}` fragments inside the TXT strings are the actions, executed per
violation:

| Action | Effect |
| ------ | ------ |
| `InsPair;r;A;a;B;b` | insert pair (a,b) into `r[A*B]` |
| `DelPair;r;A;a;B;b` | remove pair (a,b) from `r[A*B]` |
| `NewStruct;C;…`     | create a new atom of `C`; `_NEW` refers to it in the listed pair inserts |
| `InsAtom;C;…`       | create an atom of `C` |
| `DelAtom;C;a`       | remove atom a from `C` (and all its pairs) |
| `MrgAtoms;C;a;C;b`  | merge atom b into atom a (all relations redirected, b removed) |
| `SetToday;r;A;a;Datum;Y-m-d` | insert today's date as a pair of `r` |

These relation and concept names live inside strings and escape type checking: a rename
must be swept through them by hand, and the matrix treats them as first-class usage
(Relations written, Concepts touched). A `SRC`/`TGT` term inside a violation *reads* its
relation; only the names in the action strings are *written*.

Design caution from practice: an automated rule that derives a homogeneous relation with
a diagonal consequent must have a diagonal antecedent (`I /\ …`), or it oscillates as
soon as two atoms are "the same". And a rule whose violations both trigger an action and
delete their own antecedent (self-clearing trigger, `trig |- -trig`) fires exactly once
per event — a standard pattern for buttons.

## Documenting a rule

Four statements carry the documentation; the matrix stores them all, plus one manual
column:

- **PURPOSE RULE** — the reason of existence: which agreement, law, or design decision
  demands this rule? `PURPOSE RULE guardPrerequisites {+ This rule prevents students
  from registering for a trip without having passed the required courses. +}`
- **MEANING** — the constraint in natural language, stated so a stakeholder can judge
  any concrete case against it. Write the meaning before the term: agreement on the
  meaning IS the analysis; the term is its formalisation.
- **MESSAGE** — the feedback a user sees when the rule is violated.
- **VIOLATION** — composes a specific message per violating pair out of `TXT`/`SRC`/`TGT`
  segments (`VIOLATION (TXT "Project ", SRC projectName, TXT " does not have a
  projectleader")`), or carries the `{EX}` actions of an automated rule.
- **Example violation** (manual) — a concrete scenario that violates the rule and, for
  process and automated rules, how it gets resolved. The counterpart of the example
  pairs and atoms of the other sheets: it makes the rule testable in conversation.

Explaining a rule to a human reader (context, purpose, the real-world meaning of each
relation, then the reconstruction of the term) follows the global skill `ampersand`.

## The rule quest

For every agreement (afspraak) that surfaces in the domain — in documents, interviews,
or data:

1. Formulate it in natural language until the stakeholders agree. That sentence is the
   MEANING.
2. Ask why it must hold — which agreement or regulation demands it. That is the PURPOSE.
3. Construct a concrete violating scenario and ask "may this occur, temporarily?" The
   answer picks the enforcement: never → invariant; yes, but someone must fix it →
   process rule (and the "someone" is the maintaining role); yes, and the fix is
   mechanical → automated rule or ENFORCE.
4. Only then formalise the term, from the relations the matrix already holds. A rule
   that needs a relation the matrix lacks has just discovered one — add the row.

## Reading the columns of the rule matrix

Rows one rule each. Columns 1–5 identify and document the rule (name, context, origin
file, PURPOSE, MEANING). Columns 6–8 give the formal side: the term, the enforcement
option, and the maintaining role(s). Columns 9–11 describe the violation side: the
MESSAGE texts, the VIOLATION segments or `{EX}` actions, and the manual example
violation. Column 12 locates the declaration (patterns). Columns 13–15 cross-link to the
other sheets: the relations the term reads, the relations the enforcement writes, and
the concepts whose atoms it creates or removes — every name there must be a row in the
Relations or Concepts sheet.
