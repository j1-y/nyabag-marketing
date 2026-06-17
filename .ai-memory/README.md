# Nyabag AI Memory

This directory is the short-form operating memory for future coding agents.
It exists to keep Nyabag self-documenting without forcing every task to repeat the full project history.

## What to read

- `product.md` for what Nyabag is and who it serves
- `architecture.md` for routes, data flow, actions, and system boundaries
- `coding-rules.md` for repo-specific implementation rules
- `roadmap.md` for current and likely future work
- `workflows.md` for the standard change playbooks
- `feature-registry.md` for a surface index of what Nyabag can do
- `decision-log.md` for why important choices were made
- `prompt-template.md` for a reusable task brief

## Maintenance rules

- Update the matching memory file whenever the repo changes in a way that would surprise a future agent.
- Keep `docs/NYABAG_TECHNICAL_DOCUMENTATION.md` as the canonical long-form source of truth.
- Keep memory entries specific to Nyabag. Do not add generic boilerplate.
- Prefer compact updates over rewriting the whole memory layer.

## Update map

| Change type | Memory file |
| --- | --- |
| New route or route behavior | `architecture.md` |
| New feature or product surface | `feature-registry.md` |
| Workflow or process change | `workflows.md` |
| Architectural decision | `decision-log.md` |
| Roadmap shift | `roadmap.md` |
| Major functional change | `docs/NYABAG_TECHNICAL_DOCUMENTATION.md` |

## Recommended entry point

For a fresh task, start with:

1. `AGENTS.md`
2. `README.md`
3. `CODEX_PROMPT.md`
4. The relevant memory file for the task
