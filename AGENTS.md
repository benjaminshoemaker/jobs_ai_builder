# AGENTS.md

Project-wide guidance for AI agents working in Jobs AI Builder.

## Project context

- The repository contains the local-first TypeScript CLI and a separate public-board app in `apps/board`. Run `pnpm board:dev` for the local web server.
- The stack is Node.js 22+, pnpm workspaces, Commander, Inquirer, Zod, and Vitest.
- `README.md` describes the current product and commands.
- `INITIAL_NOTES.md` contains the current exploration thesis and authoritative role definition; historical implementation plans there do not constrain the fresh exploration.
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
- Keep API keys and environment secrets out of all stored and exported data. The public board may store and publish full descriptions from verified, publicly listed employer postings unless a source expressly prohibits reuse; retain the canonical URL, attribution, and last-checked time, and remove stale or withdrawn postings or content challenged by its owner. The existing CLI records and exports remain description-free until their schemas are deliberately changed.
- Record open opportunities in `IDEAS.md`; keep durable constraints close to the code and current documentation.

## Verification

For public-board UI work, follow `DESIGN_LANGUAGE.md`. The selected direction is Open Studio with Apricot; working-board tokens and controls live in `apps/board/public`; `design/board-concepts.html` preserves the approved prototype. Preserve the compact card and primary application CTA when improving accessibility or implementing the board.

Run repository-native tests and checks proportionate to the change. For repo-wide changes, run:

```bash
pnpm test
pnpm typecheck
pnpm build
```

Report unavailable tools, credentials, source data, or requirements explicitly.
