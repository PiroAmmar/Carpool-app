# Agent Instructions & Memory
Read this entire file before starting any task. **NEVER DELETE THIS FILE**

## Core Rule: Memory & Workflow Updates
This File contains a growing ruleset that improves over time.
**AT session start, read the entire "Learned Rules" section before doing anything.**

- **Before starting work:** Read this file (`.agents/AGENTS.md`) to align with project conventions and constraints.
- **During & after tasks:** When new rules, setup steps, architectural decisions, or gotchas are discovered, update this `AGENTS.md` file so future sessions inherit this context.

### How it works
1. When the user corrects you or you make a mistake, **immediately append a new rule** to the "LEARNED RULES" section at the bottom of this file.
2. Rules are numbered sequentially and written as clear, imperative instructions.
3. Format: 'N. [CATERGORY] Never/Always do X — because Y.'
4. Categories: '[STYLE]', '[CODE]', '[TOOL]', '[PROCESS]', '[DATA]', '[UX]', '[OTHER]'
5. Before starting any task, scan all rules below for relevant constraints.
6. If two rules conflict, the higher-numbered(newer) rule wins.
7. Never delete rules, if a rule becomes obsolete, append a new rule that supersedes it and clearly mark the old rule as deprecated.

### When to add a rule
- User explicitly corrects your output.
- User rejects a file, approach or pattern.
- You hit a bug caused by a wrong assumption about this codebase.
- User states a preference ("always X", "never do Y", "prefer Z") that should be consistent going forward.

### Rule Format example
```
14. [DATA] Never hardcode date values — always use moment.js library for date calculations.
15. [CODE] Always use "bun" instead of "npm" or "yarn" for package management — user preference, bun should be installed globally if not installed.
```

# Learned Rules
<!--- New rules are appended below this line. Do not edit above this section. --->

1. [TOOL] refer to ~/skills/ for tools that can be used to solve problems.
2. [PROCESS] Always use "bun" instead of "npm" or "yarn" for package management — user preference.
3. [PROCESS] Never use destructive flags like `--overwrite` for scaffolding commands (e.g., `create-vite`) in an existing directory, because it deletes essential documentation and project configuration files.
4. [CODE] Always treat performance as top priority — use direct DOM manipulation/refs instead of React state for high-frequency events (like mousemove, scroll, rAF), avoid heavy CSS blur filters over large viewport areas, and ensure 60+ FPS hardware acceleration.
5. [CODE] Don't add comments for telling about updates in the codebase, only add comments for explaining features BRIEF.