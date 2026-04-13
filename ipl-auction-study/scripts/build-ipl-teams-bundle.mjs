/**
 * Copies IPL team assets from react/src/assets into public/ipl-teams/<slug>/
 * and writes public/data/ipl-teams-bundle.json for the main site.
 *
 * Run from repo: node ipl-auction-study/scripts/build-ipl-teams-bundle.mjs
 * Or: npm run build (from ipl-auction-study) runs this before vite build.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const studyRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(studyRoot, '..');
const srcAssets = path.join(repoRoot, 'react', 'src', 'assets');
const destBase = path.join(studyRoot, 'public', 'ipl-teams');
const bundlePath = path.join(studyRoot, 'public', 'data', 'ipl-teams-bundle.json');

/** React asset folder name → URL slug (no spaces) */
const FOLDER_TO_SLUG = {
  'Chennai Super Kings': 'csk',
  'Sunrisers Hyderabad': 'srh',
  'Mumbai Indians': 'mi',
  'Royal Challengers Bengaluru': 'rcb',
  'Kolkata Knight Riders': 'kkr',
  'Punjab Kings': 'pbks',
  'Delhi Capitals': 'dc',
  'Rajasthan Royals': 'rr',
  'Gujarat Titans': 'gt',
  'Lucknow Super Giants': 'lsg',
  'Gujarat Lions': 'gl',
  'Rising Pune Supergiant': 'rps',
  'Pune Warriors India': 'pwi',
  'Kochi Tuskers Kerala': 'ktk',
  'Deccan Chargers': 'dcg',
};

function bgScore(name) {
  const n = name.toLowerCase();
  if (n.includes(' bg.') || n.includes(' bg ') || n.endsWith(' bg')) return 100;
  if (/\bbg\b/.test(n)) return 90;
  if (n.includes('wallpaper')) return 85;
  if (n.includes('stadium')) return 82;
  if (n.includes('chepauk')) return 82;
  if (n.includes('4k')) return 78;
  return 0;
}

function logoScore(name) {
  const n = name.toLowerCase();
  if (n.includes('logo')) return 100;
  if (n === 'delhi_capitals.png') return 80;
  if (n === 'gujarat_lions.png') return 80;
  return 0;
}

function resolveImageFiles(fileNames) {
  const entries = fileNames.map((name) => ({ name }));
  if (entries.length === 0) return { logoFile: null, bgFile: null };

  const scoredBg = entries.map((e) => ({ ...e, score: bgScore(e.name) }));
  scoredBg.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.name.length - a.name.length;
  });
  const bgPick = scoredBg[0].score > 0 ? scoredBg[0] : null;

  const rest = bgPick ? entries.filter((e) => e.name !== bgPick.name) : entries;
  const scoredLogo = rest.map((e) => ({ ...e, score: logoScore(e.name) }));
  scoredLogo.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.name.localeCompare(b.name);
  });
  const logoPick = scoredLogo[0] || null;

  return { logoFile: logoPick?.name ?? null, bgFile: bgPick?.name ?? null };
}

function sortTeams(a, b) {
  const activeRank = (t) => (t.basic_info?.status === 'active' ? 0 : 1);
  const ra = activeRank(a);
  const rb = activeRank(b);
  if (ra !== rb) return ra - rb;
  return (a.name || '').localeCompare(b.name || '');
}

function readDescriptionJson(folderPath) {
  const names = fs.readdirSync(folderPath);
  const desc = names.find((n) => n.endsWith('_description.json'));
  if (!desc) throw new Error(`No *_description.json in ${folderPath}`);
  const raw = fs.readFileSync(path.join(folderPath, desc), 'utf8');
  return JSON.parse(raw);
}

function main() {
  const teams = [];

  for (const [folderName, slug] of Object.entries(FOLDER_TO_SLUG)) {
    const srcDir = path.join(srcAssets, folderName);
    if (!fs.existsSync(srcDir)) {
      console.warn(`[ipl-teams] Skip missing folder: ${srcDir}`);
      continue;
    }

    const destDir = path.join(destBase, slug);
    if (fs.existsSync(destDir)) {
      fs.rmSync(destDir, { recursive: true, force: true });
    }
    fs.mkdirSync(destDir, { recursive: true });
    fs.cpSync(srcDir, destDir, { recursive: true });

    const allNames = fs.readdirSync(destDir).filter((n) => !n.endsWith('.json'));
    const imageNames = allNames.filter((n) =>
      /\.(png|jpg|jpeg|webp)$/i.test(n),
    );
    const { logoFile, bgFile } = resolveImageFiles(imageNames);

    const data = readDescriptionJson(destDir);
    const base = `/ipl-teams/${slug}`;
    teams.push({
      ...data,
      logoUrl: logoFile ? `${base}/${encodeURIComponent(logoFile)}` : null,
      bgUrl: bgFile ? `${base}/${encodeURIComponent(bgFile)}` : null,
    });
  }

  teams.sort(sortTeams);

  fs.mkdirSync(path.dirname(bundlePath), { recursive: true });
  fs.writeFileSync(bundlePath, JSON.stringify({ teams }, null, 2), 'utf8');
  console.log(
    `[ipl-teams] Wrote ${teams.length} teams → ${path.relative(repoRoot, bundlePath)}`,
  );
}

main();
