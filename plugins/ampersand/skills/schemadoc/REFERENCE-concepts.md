# Concepts in Ampersand — the semantics behind the concept matrix

This reference distills what the DDA course (Conceptueel Analyseren) and the Ampersand
documentation say about concepts. The concept matrix rests on these definitions; respect
them in every use of the matrix.

## What a concept is

A concept is a set of atoms. An atom is a value that carries no further structure of its
own: "Apollo 13", "Peter", a date, a number, an amount. Membership is the "is a" test:
of every atom you can say "Toeslagen is a project", mathematically "Toeslagen" ∈ Project.
A concept holds within a context: the same word may be a concept in one context and a
relation or property in another. An instance is never a concept — "Koning
Willem-Alexander" is an atom of Persoon, not a concept of its own.

Concept names start with an upper case letter and are singular by convention. Unlike
relation names, a concept name is unique within its context, so a matrix row is
identified by Name (+ Context).

## The four test questions (TIPI)

A noun qualifies as a concept when it passes four questions. Ask them in every concept
quest and record the outcome in the TIPI column:

| Test              | Question                                    | Counterexample from the course                                             |
| ----------------- | ------------------------------------------- | -------------------------------------------------------------------------- |
| Telbaar           | Can I count your atoms?                     | "Water" flows and resists counting; "wateren" (IJsselmeer, Noordzee) count fine — choose the countable meaning. |
| Instantieerbaar   | Which atoms does your concept have?         | Give examples — real ones ("Anna", "Barend") or invented ones ("c1", "c2", "c3"). No examples, no concept. |
| Permanent         | Do your atoms stay in this concept forever? | Student is a good concept only if, for example, a student never turns into an employee within your context. If that change must be possible, model Persoon with relations `student` and `medewerker`. |
| Identificeerbaar  | Can you tell your atoms apart?              | Marbles and coins count fine but look alike; stick a label on them if needed. |

Permanence is a choice within the context, not a fact of the world ("eens student,
altijd student" — in this application nobody ever graduates). Record that choice.

## Concept, property, or relation

The quests share one decision. For every noun (or noun-like notion) in the source text:

1. Is it permanent within the context (and TIPI-sound)? Then it is a **concept**:
   `CONCEPT Professor "…"`.
2. Not permanent, but a yes/no state of one thing? Then a **property**:
   `RELATION professor[Persoon] [PROP]`.
3. Otherwise a **relation**, where a smart choice of source and target does the work:
   `RELATION professor[Universiteit*Persoon]`, `RELATION student[Inschrijving*Persoon]`.

The same decision runs in reverse during the relation quest: a candidate relation that
turns out to be permanent may be a concept after all. The two matrices meet here — a
notion moves between them, it never lives in both.

## Documenting a concept

Three statements carry the documentation; the matrix stores all five:

- **Definition** — the criterion that decides whether something is an atom of this
  concept: `CONCEPT Stoel "Een stoel is een meubelstuk dat bedoeld is voor één persoon
  om op te zitten en dat tenminste het zitvlak en de rug ondersteunt."` A good
  criterion distinguishes the concept from everything else, lets a reader judge any
  candidate, and is good as long as it works — sharpen it when it stops working.
- **PURPOSE** — the reason of existence: why must atoms of this concept be registered
  (nut en noodzaak)? `PURPOSE CONCEPT Student {+ We have to know what person studies at
  this institute. +}`
- **Identity** - the criterion that defines the equality of two instances of the concept.
  E.g. "Name and social security number identify a resident."
- **Example atoms** — three atoms (fictitious if needed) that make the definition
  concrete. E.g. "John", "Sally", and "Eve" are persons.
- **Notational conventions** - naming conventions for concept atoms must be stated.
  E.g. The first name of a person, followed by an optional hyphen and number, is used as identifier.

## The concept quest

The technique for defining concepts in a group, within bounded time, to build a shared
language. For every noun:

1. Is this a concept? Apply the four test questions.
2. One member proposes a criterion: what distinguishes this concept from everything
   else? All others question and sharpen it. Understanding each other means listening
   very carefully. Repeat until consensus.
3. Record the consensus — the criterion becomes the Definition.

When specifying a concept, answer five things (they map onto matrix columns): what is
it used for (Purpose), is it TIPI, which criterion defines it (Definition), is it a
specialisation of another concept (Generalisations), and three example atoms.

## Classification

`CLASSIFY Overheidsproject ISA Project` means: every atom of Overheidsproject is also
an atom of Project — "Overheidsproject" ⊆ Project. The definition of a specialisation
follows the pattern "an A is a B that …": *"Een overheidsproject is een project dat de
overheid uitvoert."* Consequences:

- Atoms of the specialisation may appear wherever the generalisation is expected;
  relations and rules on the generalisation apply to them.
- Every classification structure (typology) must have exactly one root concept.
- Watch permanence: an atom that enters a specialisation stays there, within the
  context. If membership must change, model it as a property or relation instead.
- The generalisation form `CLASSIFY A IS B /\ C` also exists: A is exactly the
  intersection of B and C.
- All concepts in one classification tree share a single representation (see below).

## Representation: object concepts and value concepts

By default, Ampersand represents a concept as ALPHANUMERIC.
Concepts that have an interface are represented as OBJECT: its atoms are identities that carry data
only through relations.
`REPRESENT <Concept> TYPE <ttype>` allow other literal values: ALPHANUMERIC, BIGALPHANUMERIC,
HUGEALPHANUMERIC, PASSWORD, BINARY (variants), BOOLEAN, DATE, DATETIME, INTEGER,
FLOAT. Ampersand represents univalent (or injective) relations as an attribute, and its target is
typically such a value concept: `RELATION geboortedatum[Persoon*Datum] [UNI]` with
`REPRESENT Datum TYPE DATE`. Choosing between an object concept and a value concept is
the identity question again: does this notion need atoms of its own, or is it a value
that describes another concept's atoms?

For every concept `A` the identity relation `I[A]` exists (exactly the pairs `(a,a)`),
and for every pair of concepts `A`, `B` the full relation `V[A*B]` exists. `SESSION` is
the built-in concept whose single atom represents the current session; `ONE` is the
built-in singleton concept.

## Identity and display

Atoms are identified by their atom-id. Two supporting statements:

- **VIEW** presents an atom readably instead of by its raw identifier ("lelijke
  identifiers voorkomen"): `VIEW Gastgezin : Gastgezin DEFAULT { voornaam :
  gezinslid;personFirstName, … } ENDVIEW`. The DEFAULT view is used wherever the
  concept appears without an explicit view.
- **IDENT** declares that a combination of attribute values identifies an atom:
  `IDENT "Kenteken": Voertuig (kenteken)` — a uniqueness constraint the system
  maintains.

## How atoms enter and leave a concept

This determines the usage columns of the matrix. The population of a concept changes
through:

1. **Interfaces** — a field whose crud annotation has **C** creates a new atom of the
   field's target concept; **D** deletes an atom (and thereby all its pairs); **R**
   reads. The U right is about pairs, not atoms, so the concept matrix does not track
   it. `FOR <roles>` on the interface grants these rights to the listed roles; an
   interface without `FOR` is reachable by no one.
2. **ExecEngine rules** — a RULE maintained by role ExecEngine whose VIOLATION text
   calls `InsAtom;C;…` or `NewStruct;C;…` (creates an atom of C), or `MrgAtoms;C;a;C;b`
   (merges atom b into atom a — the concept loses an atom, and every relation on b is
   redirected). These concept names live inside strings and escape type checking; treat
   them as first-class usage when filling the matrix.
3. **Population statements and imports** — `POPULATION C CONTAINS [ "a", "b" ]`,
   included spreadsheets, and the runtime import API. A pair `(a,b)` in a relation
   `r[A*B]` also puts `a` in `A` and `b` in `B` — population flows in through relations.
4. **Classification** — an atom entering a specialisation is thereby in every
   generalisation above it.

Caution that follows from these semantics: a concept with a TOT invariant on one of its
relations cannot receive a bare new atom — the mandatory relations must be filled in the
same transaction, or the commit blocks.

## Reading the columns of the concept matrix

Rows one concept each. Columns 1–8 describe the concept and its provenance (name,
origin file, PURPOSE, Definition, the TIPI verdict, the identity criterion, the
notational conventions, three example atoms) — the five documentation items above plus
the TIPI verdict. Columns 9–13 describe its place in the type system (generalisations
via CLASSIFY, specialisations — the converse, representation, views, IDENT
statements). Columns 14–15 locate the declaration (context, patterns). Columns 16–17
list the relations that have the concept as source or target — an empty pair of cells
marks an unused concept. Columns 18–19 list the rules that add atoms (InsAtom,
NewStruct) or remove them (MrgAtoms). Columns 20–22 list the interfaces that show the
concept's atoms and those that may create or delete them, following the CRUD semantics
above. Columns 23–25 list the roles that may create, read, or delete atoms — the union
of the rights granted by the interfaces in which the concept occurs, taken per role
from the `FOR` clauses. Column 26 records the resources from which the population
originates.
