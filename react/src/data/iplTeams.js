const descriptionModules = import.meta.glob('../assets/**/*_description.json', {
  eager: true,
  import: 'default',
})

const imageModules = import.meta.glob('../assets/**/*.{png,jpg,jpeg,webp}', {
  eager: true,
  import: 'default',
})

function fileName(path) {
  const parts = path.replace(/\\/g, '/').split('/')
  return parts[parts.length - 1] || ''
}

function folderFromDescriptionPath(path) {
  const parts = path.replace(/\\/g, '/').split('/')
  return parts[parts.length - 2] || ''
}

function bgScore(name) {
  const n = name.toLowerCase()
  if (n.includes(' bg.') || n.includes(' bg ') || n.endsWith(' bg')) return 100
  if (/\bbg\b/.test(n)) return 90
  if (n.includes('wallpaper')) return 85
  if (n.includes('stadium')) return 82
  if (n.includes('chepauk')) return 82
  if (n.includes('4k')) return 78
  return 0
}

function logoScore(name) {
  const n = name.toLowerCase()
  if (n.includes('logo')) return 100
  if (n === 'delhi_capitals.png') return 80
  if (n === 'gujarat_lions.png') return 80
  return 0
}

function resolveImages(folder) {
  const prefix = `../assets/${folder}/`
  const entries = Object.entries(imageModules)
    .filter(([p]) => p.replace(/\\/g, '/').startsWith(prefix))
    .map(([p, url]) => ({
      path: p,
      url,
      name: fileName(p),
    }))

  if (entries.length === 0) {
    return { logoUrl: null, bgUrl: null }
  }

  const scoredBg = entries.map((e) => ({
    ...e,
    score: bgScore(e.name),
  }))
  scoredBg.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return b.name.length - a.name.length
  })
  const bgPick = scoredBg[0].score > 0 ? scoredBg[0] : null

  const rest = bgPick ? entries.filter((e) => e.path !== bgPick.path) : entries
  const scoredLogo = rest.map((e) => ({
    ...e,
    score: logoScore(e.name),
  }))
  scoredLogo.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.name.localeCompare(b.name)
  })
  const logoPick = scoredLogo[0] || null

  return {
    logoUrl: logoPick?.url ?? null,
    bgUrl: bgPick?.url ?? null,
  }
}

function sortTeams(a, b) {
  const activeRank = (t) => (t.basic_info?.status === 'active' ? 0 : 1)
  const ra = activeRank(a)
  const rb = activeRank(b)
  if (ra !== rb) return ra - rb
  return (a.name || '').localeCompare(b.name || '')
}

export function getIplTeams() {
  const teams = Object.entries(descriptionModules).map(([path, data]) => {
    const folder = folderFromDescriptionPath(path)
    const { logoUrl, bgUrl } = resolveImages(folder)
    return {
      ...data,
      _folder: folder,
      logoUrl,
      bgUrl,
    }
  })
  teams.sort(sortTeams)
  return teams
}
