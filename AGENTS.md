# AGENTS.md

Project-wide guidance for AI agents working in Jobs AI Builder.

## Project context

- This is an on-demand, local-first TypeScript CLI; there is no development server.
- The stack is Node.js 22+, pnpm workspaces, Commander, Inquirer, Zod, and Vitest.
- `README.md` describes the current product and commands.
- `IDEAS.md` is the non-binding backlog.
- `features/job_classifier/INITIAL_NOTES.md` preserves the deeper classifier research brief.

## Working rules

- Follow the user's current request; no backlog item authorizes implementation by itself.
- Inspect existing dependencies and patterns before implementing.
- Make the smallest change that satisfies the request.
- Add or update tests for behavior changes; do not skip, disable, or misreport failures.
- Preserve unrelated user changes and call out new dependencies or APIs.
- Keep live API discovery opt-in and respect the local request budget.
- Do not scrape authenticated LinkedIn pages.
- Keep stored and exported data free of API keys, environment secrets, and full job descriptions unless the product boundary is explicitly changed.
- Record open opportunities in `IDEAS.md`; keep durable constraints close to the code and current documentation.

## Verification

Run repository-native tests and checks proportionate to the change. For repo-wide changes, run:

```bash
pnpm test
pnpm typecheck
pnpm build
```

Report unavailable tools, credentials, source data, or requirements explicitly.
