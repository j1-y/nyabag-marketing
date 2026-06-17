<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes - APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Nyabag agent entrypoint

Before making any change in this repo, read these files in order:

1. `AGENTS.md`
2. `.ai-memory/README.md`
3. `.ai-memory/product.md`
4. `.ai-memory/architecture.md`
5. `.ai-memory/coding-rules.md`
6. `.ai-memory/roadmap.md`
7. `docs/NYABAG_TECHNICAL_DOCUMENTATION.md`

If the task touches a specific workflow, also read `.ai-memory/workflows.md` and `.ai-memory/feature-registry.md`.

Maintain the memory layer as part of the change:

- New or changed route: update `.ai-memory/architecture.md`
- New or changed feature surface: update `.ai-memory/feature-registry.md`
- Workflow change: update `.ai-memory/workflows.md`
- Architectural decision: append `.ai-memory/decision-log.md`
- Roadmap change: update `.ai-memory/roadmap.md`
- Major functional change: update `docs/NYABAG_TECHNICAL_DOCUMENTATION.md`

Use `CODEX_PROMPT.md` for short reusable task briefs instead of pasting large context dumps.
