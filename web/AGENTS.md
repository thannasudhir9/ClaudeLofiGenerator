<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## 🤖 Studio Monitor Selection Invariant
When implementing any new interactive selector in `web/app/page.tsx`:
1. ALWAYS call `setPreviewMode(true)` and `setResult(null)` in the click handler.
2. Ensure credits remain 999,999,999 (unlimited & free).
3. Verify changes with `python tests/test_selection_and_monitor.py`.
