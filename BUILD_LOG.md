# PromptForge — Build Log

**Problem:** Teams edit prompts and ship them with no regression testing — a change that helps one case silently breaks three others (the LangSmith / Braintrust / PromptLayer category).

**Approach:** A prompt-eval console on the shared core framework, with a magenta/violet identity and a custom 3D prompt-lattice hero.

## Real eval engine
- **Scorers** (`SCORERS`): exact_match, contains, regex, json_valid, fields_present, keyword_recall, latency — each a real predicate over the output string.
- **Deterministic model** (`runCase`): seeded via `mulberry32(hashStr(prompt+version+case))`; correctness biased by `version.q` and `case.diff`, so output is stable and better prompts score better.
- **Aggregation** (`runEval`): pass rate, per-scorer rate, p50/p95 latency, token + cost estimate.
- **Diff**: runs both versions, classifies each case improved / regressed / unchanged.
- 4 prompts × 2–3 versions, 4 datasets, 26 cases.

## Custom 3D hero
`mountLatticeHero()` — a layered node tree (root → prompts → versions → cases) with additive edges and amber pulse-points traveling along every edge (evals "running"), cursor-reactive. Renders vividly under headless swiftshader.

## Pages
index, prompts, eval (`?p=`), diff (`?p=`), playground (offline + optional Gemini), settings.

## Tuning
First pass let prompt length drive a 1200ms latency gate, which made the long high-quality v3 fail on latency. Rebalanced to `300 + len·0.5 + rng·560` with a 1500ms gate so quality drives results; version pass rates now climb (e.g. intent v1 63% → v3 88%, invoice v1 33% → v2 100%) with one deliberate regression to make the diff tool meaningful.

## Testing (headless Chromium, swiftshader)
- Landing hero renders; 4 stat tiles. ✓
- Prompts: 4 cards with per-version pass tags. ✓
- Eval: version selector, template with {{input}} highlight, pass ring, 2 scorer bars, 8 cases, expandable output. ✓
- Diff: 9 rows, verdict "3 fixed · 1 regressed · 4 unchanged". ✓
- Playground: offline output + scores; Gemini wired behind a key. ✓
- Settings: theme, accents, key field, export. ✓
- **0 JavaScript errors** across all pages.

## Status
Complete. 6 pages, 50+ features, real scorers, 3D hero, 0 errors. Delivered as promptforge.zip.
