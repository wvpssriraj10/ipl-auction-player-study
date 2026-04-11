# IPL Auction Player Study

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Overview

This repository combines **Python data pipelines** for IPL auction analysis with a **Vite-powered demo** under `ipl-auction-study/demo/`. Data verification write-ups live in [`docs/`](docs/).

**Data for the live demo:** The built site loads **only** CSVs that are **committed in this repo** under [`ipl-auction-study/demo/public/data/processed/`](ipl-auction-study/demo/public/data/processed/). There is no separate production database or external data URL for those tables. Features such as an “IPL Teams” section should derive metrics from those same files (and other tracked outputs), not from files you add only on your machine.

## Repository layout

```
.
├── docs/                    # Verification guides and analysis summaries
├── ipl-auction-study/       # Python scripts, data, reports, and the web demo
│   ├── demo/                # IPL Auction Intelligence UI (HTML/CSS/JS)
│   ├── scripts/             # Pipeline steps (run with Python)
│   ├── data/                  # Raw/processed CSVs (large paths gitignored)
│   ├── package.json         # Vite build for the demo
│   └── requirements.txt     # Python dependencies
├── react/                   # Optional React + Vite scaffold (not used for main deploy)
├── all_ipl_matches_from_json.csv
└── vercel.json              # Vercel when project root = repo root (see Deploy section)
```

(`ipl-auction-study/vercel.json` is used when Vercel **Root Directory** is set to `ipl-auction-study`.)

## Local development

### Python pipeline

```sh
cd ipl-auction-study
pip install -r requirements.txt
python scripts/run_all.py
```

(Use individual `scripts/step*.py` as needed.)

### Demo site (Vite)

```sh
cd ipl-auction-study
npm install
npm run dev
```

Production build:

```sh
npm run build
```

Output: `ipl-auction-study/demo/dist/` (Vite app root is `demo/`).

The demo loads CSVs from `/data/processed/…`, which Vite serves from [`demo/public/data/processed/`](ipl-auction-study/demo/public/data/processed/) (tracked in git). Regenerating data locally writes to `data/processed/` (often gitignored); to refresh what the **deployed** demo uses, update the files under `demo/public/data/processed/` and commit them so the site still uses **only repo contents**.

## Deploy on Vercel

Import [this GitHub repository](https://github.com/wvpssriraj10/ipl-auction-player-study), branch `main`. Then use **one** of these setups (do not mix them).

### Recommended: Root Directory = `ipl-auction-study`

1. **Root Directory** → **Edit** → set to `ipl-auction-study` → **Continue**.
2. **Framework Preset** → **Vite** (not “Other”).
3. Open **Build and Output Settings** → click **Override** toggles **off** so Vercel uses [`ipl-auction-study/vercel.json`](ipl-auction-study/vercel.json) (`npm ci`, `npm run build`, output `demo/dist`).
4. Deploy.

### Alternative: Root Directory = `.` (repository root)

1. Leave **Root Directory** as `./`.
2. **Framework Preset** → **Vite**.
3. **Turn off** all manual overrides for Install / Build / Output (let repo root [`vercel.json`](vercel.json) apply: `cd ipl-auction-study && npm ci`, etc.).
4. Deploy.

If you previously typed custom commands in the UI, they **replace** `vercel.json` and can cause `ENOENT` (wrong paths or stale settings). **Clear those overrides** or match the file exactly.

Remove unrelated **Environment Variables** (for example placeholder `EXAMPLE_NAME`) unless you use them in code.

## Documentation

- [Verification checklist](docs/VERIFICATION_CHECKLIST.md)
- [Analysis summary](docs/ANALYSIS_SUMMARY.md)

## Contributing

Pull requests are welcome. For major changes, open an issue first.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Acknowledgements

- IPL and sports analytics communities
- Open-source data providers
