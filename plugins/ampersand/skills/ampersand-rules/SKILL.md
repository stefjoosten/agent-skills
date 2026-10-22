---
name: ampersand-rules
description: Explain and reason about rules in an Ampersand model (ADL), in the language of relation algebra. Use when someone asks what a RULE, constraint, invariant, process rule, ENFORCE rule or automated rule in an Ampersand script means ("explain this rule", "what does this constraint do", "leg deze regel uit"), pastes a RULE and asks about it, asks what may be deleted along with an atom or pair without violating an invariant, asks what follows from a rule, or asks whether a law of relation algebra holds (De Morgan, distribution, absorption, residuals, Kleene star). Also use when writing a term that composes through I[Subconcept]. Covers the explanation structure for a human reader, deriving consequences from laws such as r |- s, where Ampersand keeps its rewrite laws, and checking a law in Lean.
license: MIT
metadata:
  author: Stef Joosten
  version: "1.0"
---

# Rules in Ampersand: explaining them and reasoning with them

## Explaining a constraint to a human reader

The constraint and all of its relations and concepts are valid in one and the same context.
They are traceable to the source for the reader.
That tracing is implicit when the reader already has the source in mind, for instance while editing it,
and explicit when the reader is not in the flow of that code: then the explanation names the file and line.

The reader first wants to know in which context the constraint holds and what it is for (its PURPOSE),
so that he understands why the constraint is needed.
He understands what each relation means in the real world (its MEANING),
so that he can reconstruct the meaning of the constraint in his own head.

The explanation gives him a hold for that reconstruction.
It is a concise, declarative, logical and complete argument.
It is complete when the reader finds every ingredient he needs, or can find it easily.
It is logical when the reader sees the "why" of every step, so that he convinces himself and takes nothing on authority.
It is declarative when it describes states and does not instruct the reader.
It is concise when it has no superfluous words, no repetitions, no negation of the same point, and no lecture on Ampersand theory.

Readers without knowledge of Ampersand get the MEANING and PURPOSE as their hold,
and an explanation that translates the rule into the terms of their domain.

## Reasoning from a law: what may go along

For an invariant of the form `r |- s`, removing a pair `(a,b)` from `s` may always go together with removing `(a,b)` from `r`;
the invariant then stays true.

Take `RULE DependencyHasTwoSides : I[Dependency] |- from;from~ /\ to;to~`,
in which `from[Dependency*Artefact]` names the derived artefact and `to[Dependency*Artefact]` its source.
When the artefact `a` disappears while `d from a` holds, `(d,d)` is no longer in `from;from~`,
so `d` may go from `I[Dependency]`: the dependency disappears with its artefact.

Because `r` and `s` stand for arbitrary terms, the law holds for every term filled in.
With a property `derived[Dependency*Dependency] [PROP]` as `r`, the rule `derived |- from;mentions;to~`
lets a derived dependency go as soon as its artefact no longer mentions its source.

So a question of the form "what may go when this disappears", or "what follows from this rule",
starts from a law of which the rule is an instance; the explanation in words comes after.

## Where the laws are

- The rewrite laws of Ampersand's normalizer, `tceDerivRules` in
  [`src/Ampersand/FSpec/ToFSpec/NormalForms.hs`](https://github.com/AmpersandTarski/Ampersand/blob/main/src/Ampersand/FSpec/ToFSpec/NormalForms.hs):
  double negation, De Morgan, distribution, residuals, absorption, the Kleene unfoldings, and more.
- Machine-checked proofs of several of those laws in Lean, in
  [`proofs/rewriteLaws/`](https://github.com/AmpersandTarski/Ampersand/tree/main/proofs/rewriteLaws) of the same repository.
- The literature on relation algebra, for instance Tarski, Schmidt and Ströhlein, and Maddux.

When in doubt whether a law holds, prove it in Lean 4 with mathlib, preferably as a `calc` block in which each step applies one law.
The normalizer shows why: it once held the absorption law `(r\/-s)/\s = s-r`, which is false for a pair in both `r` and `s`;
it now reads `(r\/-s)/\s = r/\s`, with its proof in `proofs/rewriteLaws/RewriteLaws.lean`.

## A pitfall when writing terms

Compiler v5.9.6 translated `s~;I[B];s`, with `B ISA A`, into SQL for `s~;s`: the restriction to the subconcept disappeared
(measured on 25 September 2026).
A stored property avoids it: `RELATION isB[A*A] [PROP]` with `ENFORCE isB := I[B]`, and then `s~;isB;s`.
After a compiler upgrade, a small test that compares the SQL of both terms shows whether the detour is still needed.
