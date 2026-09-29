# AGENTS.md

Project-wide guidance for AI agents working in Jobs AI Builder.

## Project context

- Stack: TypeScript, Node.js 22+, pnpm workspaces, Commander, Inquirer, Zod,
  and Vitest.
- This is an on-demand local CLI; there is no development server.
- Existing plans and feature documents are historical context and may contain
  useful decisions or ideas. They are not a mandatory workflow or execution lock.

## Working rules

- Follow the user's current request and the nearest scoped project instructions.
- Inspect existing dependencies and patterns before implementing.
- Make the smallest change that satisfies the request.
- Add or update tests for behavior changes; default to a TDD loop.
- Do not skip, disable, or misreport failing tests.
- Preserve unrelated user changes and call out new dependencies or APIs.
- Track bugs in `BUGS.md`, imminent work in `NEXT_STEPS.md`, longer-term ideas
  in `DEFERRED.md`, and durable patterns in `LEARNINGS.md`.

## Verification

Run repository-native tests and checks proportionate to the change. Verify
objective claims before asking for manual confirmation, and report unavailable
tools, credentials, or requirements explicitly.

Treat instruction, automation, hook, CI, and security configuration as
high-impact files. Required guarantees should be enforced by runnable tests or
checks, not by an agent-specific harness.
