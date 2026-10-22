# AGENTS.md

This repository holds Agent Skills (https://agentskills.io): folders with a `SKILL.md` that tell an AI agent how to do one kind of task.
An agent that does not load skills by itself can read the right `SKILL.md` below when the task matches, and follow it.

| When the task is about … | read |
| --- | --- |
| what an Ampersand RULE, constraint, invariant, process rule or ENFORCE means; what may be deleted along with an atom; whether a relation-algebra law holds | `plugins/ampersand/skills/ampersand-rules/SKILL.md` |
| reading or changing data in a running Ampersand prototype, its REST API, `interfaces.json` | `plugins/ampersand/skills/ampersand-prototype-api/SKILL.md` |
| importing a YAML, JSON or Excel dataset into an Ampersand model as population | `plugins/ampersand/skills/ampersand-data-import/SKILL.md` |
| the concept, relation or rule matrix of an Ampersand context, `schemaDoc.xlsx` | `plugins/ampersand/skills/schemadoc/SKILL.md` |

Files that a `SKILL.md` mentions, such as `scripts/` and `reference/`, are relative to that skill's folder.

When you change this repository: a new skill goes in `plugins/<family>/skills/<name>/`, its `name` equals the folder name,
it gets a row in this table and in `README.md`, and `claude plugin validate .` passes.
