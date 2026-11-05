# PromptForge — CI for your prompts

You'd never ship code without tests — yet prompt changes go out on vibes. **PromptForge** treats prompts like code: it versions every prompt, scores each version against a dataset with **real scorers**, and shows exactly which test cases a change **fixed** and which it **regressed**. Everything runs in the browser; an optional Gemini key enables live runs.

## Run it
Open `index.html`, or `python3 -m http.server 8080`. No build, no dependencies, fully offline.

## Pages
- **Home** — pitch + a live 3D prompt-lattice hero with traveling eval pulses.
- **Prompts** — every prompt, its versions and their pass rates, with the full template.
- **Evals** — run a version against its dataset: pass-rate ring, per-scorer bars, p50/p95 latency, token/cost estimate, and every case's output vs expected (tap to expand).
- **Diff** — compare two versions on the same dataset; green = newly fixed, red = newly broken. This is the regression signal a single pass-rate number hides.
- **Playground** — edit a template, fill `{{input}}`, run it live (offline mock, or Gemini if a key is set) and score the output.
- **Settings** — theme, accents, Gemini key, JSON export.

## The scorers are real functions
`exact_match`, `contains`, `regex`, `json_valid`, `fields_present`, `keyword_recall`, and a `latency` gate — each a real predicate over the model output. Outputs come from a deterministic seeded model (`mulberry32` keyed on prompt+version+case) whose correctness is biased by each version's quality and each case's difficulty, so results are stable and the better prompts genuinely score better — with the occasional instructive regression.

## Optional live runs
Add a Google Gemini key in Settings (get one free at aistudio.google.com/apikey) to run the playground prompt against a real model and score its actual output. The key is stored only on your device.

## Deploy
Static — Netlify drop, `vercel`, or GitHub Pages.

## Feature count
50+ — versioning, 4 datasets, 26 cases, 6 scorers, pass rates, per-scorer breakdown, case inspection, latency/cost, version diff, regression detection, live playground, optional Gemini, 3D hero, theming, export, offline. Full list on the home page.

*The real market need: prompt changes silently regress with no test harness (cf. LangSmith, Braintrust, PromptLayer). PromptForge is a self-contained demonstration of prompt CI.*
