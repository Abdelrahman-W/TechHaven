# AGENTS.md — Autonomous Agent Operating Guidelines & Project Context

## 1. Autonomous Agent Operating Principles
This agent operates as an **Autonomous Agent**. Tools, skills, and plugins are selected and executed automatically based on the task category without asking the user to specify tool names. Execute work with minimal unnecessary roundtrips while maintaining rigorous engineering standards.

### Core Working Rules:
1. **Task Classification**: Before execution, classify the task: Programming, UI/UX Design, Research, Testing, File Management, Docker, Git, or Deployment.
2. **Autonomous Tool & Skill Selection**: Inspect available tools and specialized skills (`skill_view`, file search, built-in tools) and invoke the best match autonomously. Never prompt the user to pick tools.
3. **Direct Built-in Tool Usage**: Leverage built-in tools directly (File Operations `read_file`/`write_file`/`patch`, `terminal`, `browser_exec`, `web_search`, `vision_analyze`) whenever needed.
4. **Plugin Prudence**: Only invoke or rely on a plugin when its specific capability is strictly required, available, and enabled. Do not assume all plugins can be called directly as tools.
5. **Engineering Context First**: In programming tasks, inspect and understand related files, imports, and dependencies before modifying anything. Preserve project structure and existing architectural conventions.
6. **UI/UX Design Standards**: In UI/UX tasks, strictly adhere to `DESIGN.md` (TechHaven precision dark design system, sharp 1px borders, no glassmorphism or floating gradients, Cairo/Inter bilingual typography) and relevant design skills.
7. **Fact-Checked Research**: In research tasks, consult authentic sources and verify information; never rely on assumptions or hallucinated data.
8. **Execution Verification**: After code changes, execute relevant verification commands (`npm test`, `npm run lint`, `npm run build`) and confirm actual results before claiming completion.
9. **Efficiency & Low Noise**: Avoid redundant tool calls, repetitive file reads, or unnecessary re-searching.
10. **Graceful Fallbacks**: If a requested tool or skill is not available, state that clearly and employ the closest available alternative.
11. **Safety & Destructive Guardrails**: Never perform destructive operations (e.g. deleting files, hard resets, database wipes, production deployments) without analyzing side effects and requesting explicit user approval.

---

## 2. Project Architecture & Technical Context (TechHaven / EgyHardware)
- **Application**: Full-stack Egyptian Hardware Marketplace & Admin/ERP Platform.
- **Frontend**: Vite + React 18, React Router v6, Tailwind/CSS tokens matching `DESIGN.md`, Zustand state, Sonner toasts, Lucide React icons.
- **Backend**: Express.js API (`server/index.js`, port 4000), Supabase PostgreSQL with local lowdb fallback.
- **Verification Commands**:
  - Acceptance Tests: `npm test` (`node scratch/run_all_acceptance_suites.mjs`)
  - Analytics & Reports Tests: `npm run test:reports`
  - Security Tests: `npm run test:security`
  - Linter: `npm run lint`
  - Build: `npm run build`
- **Platform & Host Notes**:
  - Windows host: Node process exit may report harmless `UV_HANDLE_CLOSING` assertion when keep-alive sockets were open; evaluate test outcomes by terminal result logs rather than exit code alone.
  - Test isolation: Acceptance runner resets `scratch/baseline_store.json` and restarts backend between suites to prevent in-memory state contamination.
  - Credentials: Never print, commit, or edit `.env` or credential files.
