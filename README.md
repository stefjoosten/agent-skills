# Agent Skills by Stef Joosten

Reusable [Agent Skills](https://agentskills.io) for AI coding agents.
Each skill is a folder with a `SKILL.md`: a name and a description that tell the agent when to load it, followed by the instructions.
The format is an open standard; Claude Code, Cursor, Codex and other agents read it.

The first family is for [Ampersand](https://github.com/AmpersandTarski/Ampersand),
the language that generates information systems from rules in relation algebra.

## Skills

| Skill | Use it when |
| --- | --- |
| [`ampersand-rules`](plugins/ampersand/skills/ampersand-rules/SKILL.md) | explaining a RULE, invariant, process rule or ENFORCE to a human; deciding what may be deleted along without violating an invariant; checking a law of relation algebra (with the normalizer's laws and Lean) |
| [`ampersand-prototype-api`](plugins/ampersand/skills/ampersand-prototype-api/SKILL.md) | reading or changing data in a running Ampersand prototype through its REST API, derived from `interfaces.json` and the `.adl` source; known pitfalls of the framework |
| [`ampersand-data-import`](plugins/ampersand/skills/ampersand-data-import/SKILL.md) | turning a YAML, JSON or Excel dataset into an Ampersand model that imports it as population |
| [`schemadoc`](plugins/ampersand/skills/schemadoc/SKILL.md) | keeping the schema documentation of an Ampersand context: the concept, relation and rule matrices in one workbook |

## Install

**Claude Code**, as a plugin from this marketplace:

```
claude plugin marketplace add stefjoosten/agent-skills
claude plugin install ampersand@stefjoosten-agent-skills
```

The skills then appear with the plugin prefix, such as `ampersand:ampersand-rules`.

**Claude Code without the plugin system**, or any agent that reads a skills folder:
copy or link a skill folder into the folder your agent reads.

```
git clone https://github.com/stefjoosten/agent-skills ~/git/agent-skills
ln -s ~/git/agent-skills/plugins/ampersand/skills/ampersand-rules ~/.claude/skills/ampersand-rules
```

Cursor reads `.agents/skills/`, `.cursor/skills/`, `.claude/skills/` and `.codex/skills/` ([Cursor docs](https://cursor.com/docs/skills)).
Other agents have their own folder; see their documentation.
Install a skill in one place only: two copies of the same skill compete for the same moment, and one of them gets stale.

**Agents without skill support** can read [`AGENTS.md`](AGENTS.md), which lists the skills and when each applies.

## Layout

```
.claude-plugin/marketplace.json      the catalog for Claude Code
plugins/<family>/.claude-plugin/plugin.json
plugins/<family>/skills/<skill>/SKILL.md
```

A skill's `name` equals its folder name, and its description names the words a user would type, so that an agent finds it.

## License

MIT, see [LICENSE](LICENSE).
