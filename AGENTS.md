<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AI Context Synchronization Rules

Whenever an AI agent is working in this repository, it MUST adhere strictly to the following process:

1. **READ BEFORE CODING**: Before writing, modifying, or refactoring any code, the AI agent MUST read all files inside `.ai-context/`:
   - `.ai-context/state.md` (Tracks what was just completed, active status, and what is currently broken)
   - `.ai-context/architecture.md` (Explains the file layout and tech stack of Quotora)
   - `.ai-context/todo.md` (A strict list of tasks)

2. **UPDATE AFTER WORK**: Immediately upon finishing a task or discovering a bug, the AI agent MUST update the files inside `.ai-context/` (`state.md`, `architecture.md`, and `todo.md`) to keep them fully synchronized with the state of the codebase.
