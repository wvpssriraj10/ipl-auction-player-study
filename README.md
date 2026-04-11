# IPL Auction Player Study

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Overview

This repository combines **Python data pipelines** for IPL auction analysis with a **Vite-powered demo** under `ipl-auction-study/demo/`. Data verification write-ups live in [`docs/`](docs/).

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
└── vercel.json              # Tells Vercel to build the demo from repo root
```

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

Output: `ipl-auction-study/dist/`.

## Deploy on Vercel

1. Import [this GitHub repository](https://github.com/wvpssriraj10/ipl-auction-player-study).
2. Leave **Root Directory** empty (repository root). Do **not** set it to `ipl-auction-study` when using the included `vercel.json` — the root file already runs `npm` with `--prefix ipl-auction-study`.
3. Deploy. Framework should detect as **Vite**; install/build/output are defined in [`vercel.json`](vercel.json).

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
