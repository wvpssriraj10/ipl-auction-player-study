import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import './PlayerCareerArc.css'

function normStr(v) {
  return String(v ?? '')
    .trim()
    .toLowerCase()
}

function pickFirstNumber(obj, keys) {
  for (const k of keys) {
    const raw = obj?.[k]
    if (raw === null || raw === undefined || raw === '') continue
    const n = Number(raw)
    if (Number.isFinite(n)) return n
  }
  return null
}

function pickFirstString(obj, keys) {
  for (const k of keys) {
    const raw = obj?.[k]
    if (raw === null || raw === undefined) continue
    const s = String(raw).trim()
    if (s) return s
  }
  return ''
}

function pickSeason(obj) {
  const n = pickFirstNumber(obj, ['season', 'Season', 'year', 'ipl_season', 'IPL_Season'])
  if (n !== null) return Math.round(n)
  const s = pickFirstString(obj, ['season_label', 'seasonLabel'])
  const m = /^(\d{4})/.exec(s)
  if (m) return Number(m[1])
  return null
}

function isTruthyRetained(obj) {
  const keys = [
    'retained',
    'isRetained',
    'wasRetained',
    'retention',
    'type',
    'auction_type',
    'mode',
  ]
  for (const k of keys) {
    const v = obj?.[k]
    if (typeof v === 'boolean') return v
    if (typeof v === 'number') return v === 1
    if (typeof v === 'string') {
      const t = v.trim().toLowerCase()
      if (!t) continue
      if (['retained', 'retention', 'rtm', 'pre-auction', 'pre auction'].includes(t)) return true
    }
  }
  return false
}

function normalizeAuctionRow(row) {
  const playerName = pickFirstString(row, [
    'playerName',
    'player_name',
    'name',
    'Player',
    'player',
  ])
  const team = pickFirstString(row, ['team', 'franchise', 'Team'])
  const season = pickSeason(row)
  const role = pickFirstString(row, ['role', 'Role', 'player_role'])
  const auctionPrice = pickFirstNumber(row, [
    'auctionPriceCr',
    'auction_price_cr',
    'price_cr',
    'priceCr',
    'auction_price',
    'price',
    'amount_cr',
    'amountCr',
  ])
  const retentionPrice = pickFirstNumber(row, [
    'retentionPriceCr',
    'retention_price_cr',
    'retained_price_cr',
    'retention_price',
    'retained_price',
  ])
  const retained = isTruthyRetained(row)
  const priceCr = retained ? retentionPrice ?? auctionPrice : auctionPrice ?? retentionPrice
  return {
    playerName,
    team,
    season,
    role,
    retained,
    priceCr,
  }
}

function normalizePerformanceRow(row) {
  const playerName = pickFirstString(row, [
    'playerName',
    'player_name',
    'name',
    'Player',
    'player',
  ])
  const season = pickSeason(row)
  const runs = pickFirstNumber(row, ['runs', 'Runs', 'total_runs', 'run'])
  const wickets = pickFirstNumber(row, ['wickets', 'Wickets', 'wkts', 'wkt'])
  const matches = pickFirstNumber(row, ['matches', 'Matches', 'm', 'games', 'mat'])
  return { playerName, season, runs, wickets, matches }
}

function inferPerfKindFromRole(roleRaw) {
  const r = normStr(roleRaw)
  if (r.includes('bowl')) return 'wickets'
  if (r.includes('bat')) return 'runs'
  if (r.includes('all')) return 'runs'
  return 'runs'
}

function inferPerfKindFromTotals({ runs, wickets }) {
  const hasR = runs !== null && runs > 0
  const hasW = wickets !== null && wickets > 0
  if (hasW && !hasR) return 'wickets'
  if (hasR && !hasW) return 'runs'
  if (hasW && hasR) {
    return wickets >= runs ? 'wickets' : 'runs'
  }
  if (wickets !== null && wickets > 0) return 'wickets'
  return 'runs'
}

function pearson(xs, ys) {
  const n = Math.min(xs.length, ys.length)
  if (n < 2) return null
  let sx = 0
  let sy = 0
  for (let i = 0; i < n; i += 1) {
    sx += xs[i]
    sy += ys[i]
  }
  const mx = sx / n
  const my = sy / n
  let num = 0
  let dx = 0
  let dy = 0
  for (let i = 0; i < n; i += 1) {
    const vx = xs[i] - mx
    const vy = ys[i] - my
    num += vx * vy
    dx += vx * vx
    dy += vy * vy
  }
  const den = Math.sqrt(dx) * Math.sqrt(dy)
  if (!Number.isFinite(den) || den === 0) return null
  const r = num / den
  return Number.isFinite(r) ? r : null
}

function categorizeCorrelation(r) {
  if (r === null) return { label: 'Insufficient data', abs: null }
  const a = Math.abs(r)
  if (a < 0.22) return { label: 'Weak', abs: a }
  if (r >= 0.38) return { label: 'Strong positive', abs: a }
  if (r <= -0.38) return { label: 'Inverse', abs: a }
  return { label: 'Weak', abs: a }
}

function formatCr(n) {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—'
  const abs = Math.abs(n)
  const digits = abs >= 10 ? 1 : 2
  return `₹${n.toFixed(digits)} Cr`
}

function formatInt(n) {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—'
  return `${Math.round(n)}`
}

function CareerTooltip(props) {
  const { active, payload, perfLabel } = props
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  if (!row) return null
  const perfVal =
    perfLabel === 'Wickets' ? row.performanceWickets : row.performanceRuns
  return (
    <div className="pca-tooltip">
      <div className="pca-tooltip__title">Season {row.season}</div>
      <div className="pca-tooltip__row">
        <span className="pca-tooltip__k">Price</span>
        <span className="pca-tooltip__v">
          {formatCr(row.priceCr)}
          {row.retained ? <span className="pca-tooltip__tag">Retained</span> : null}
        </span>
      </div>
      <div className="pca-tooltip__row">
        <span className="pca-tooltip__k">{perfLabel}</span>
        <span className="pca-tooltip__v">{formatInt(perfVal)}</span>
      </div>
    </div>
  )
}

function PriceDot(props) {
  const { cx, cy, payload } = props
  if (payload?.priceCr === null || payload?.priceCr === undefined) return null
  const retained = Boolean(payload?.retained)
  const fill = retained ? 'var(--pca-price-retained, #f97316)' : 'var(--pca-price, #facc15)'
  const stroke = 'rgba(15, 23, 42, 0.85)'
  if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null
  if (retained) {
    const s = 9
    return <polygon points={`${cx},${cy - s} ${cx + s},${cy} ${cx},${cy + s} ${cx - s},${cy}`} fill={fill} stroke={stroke} strokeWidth={1.25} />
  }
  return <circle cx={cx} cy={cy} r={5} fill={fill} stroke={stroke} strokeWidth={1.25} />
}

function PerfDot(props) {
  const { cx, cy } = props
  if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null
  return (
    <circle
      cx={cx}
      cy={cy}
      r={5}
      fill="var(--pca-perf, #22d3ee)"
      stroke="rgba(15, 23, 42, 0.85)"
      strokeWidth={1.25}
    />
  )
}

export default function PlayerCareerArc({ auctionData = [], performanceData = [] }) {
  const rootRef = useRef(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [selectedPlayer, setSelectedPlayer] = useState('')

  const playerNames = useMemo(() => {
    const set = new Set()
    for (const row of auctionData) {
      const n = normalizeAuctionRow(row).playerName
      if (n) set.add(n)
    }
    for (const row of performanceData) {
      const n = normalizePerformanceRow(row).playerName
      if (n) set.add(n)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [auctionData, performanceData])

  const suggestions = useMemo(() => {
    const q = normStr(query)
    if (!q) return []
    const out = []
    for (const name of playerNames) {
      if (normStr(name).includes(q)) out.push(name)
      if (out.length >= 12) break
    }
    return out
  }, [playerNames, query])

  const careerPack = useMemo(() => {
    const selectedKey = normStr(selectedPlayer)
    if (!selectedKey) {
      return {
        chartRows: [],
        perfKind: 'runs',
        perfLabel: 'Runs',
        summary: null,
        insights: [],
      }
    }

    const auctionBySeason = new Map()
    for (const row of auctionData) {
      const a = normalizeAuctionRow(row)
      if (!a.playerName || a.season === null) continue
      if (normStr(a.playerName) !== selectedKey) continue
      auctionBySeason.set(a.season, a)
    }

    const perfBySeason = new Map()
    for (const row of performanceData) {
      const p = normalizePerformanceRow(row)
      if (!p.playerName || p.season === null) continue
      if (normStr(p.playerName) !== selectedKey) continue
      perfBySeason.set(p.season, p)
    }

    const seasons = Array.from(
      new Set([...auctionBySeason.keys(), ...perfBySeason.keys()]),
    ).sort((x, y) => x - y)

    const lastAuctionRole =
      [...seasons]
        .map((s) => auctionBySeason.get(s))
        .filter(Boolean)
        .map((a) => a.role)
        .filter((r) => normStr(r))
        .at(-1) ?? ''

    const totals = { runs: 0, wickets: 0, nRuns: 0, nWickets: 0 }
    for (const s of seasons) {
      const p = perfBySeason.get(s)
      if (!p) continue
      if (p.runs !== null) {
        totals.runs += p.runs
        totals.nRuns += 1
      }
      if (p.wickets !== null) {
        totals.wickets += p.wickets
        totals.nWickets += 1
      }
    }

    const roleKind = inferPerfKindFromRole(lastAuctionRole)
    const perfKind =
      seasons.length === 0
        ? 'runs'
        : normStr(lastAuctionRole).includes('all') && totals.nRuns > 0 && totals.nWickets > 0
          ? inferPerfKindFromTotals(totals)
          : roleKind === 'wickets' && totals.nWickets > 0
            ? 'wickets'
            : roleKind === 'runs' && totals.nRuns > 0
              ? 'runs'
              : inferPerfKindFromTotals(totals)

    const perfLabel = perfKind === 'wickets' ? 'Wickets' : 'Runs'

    const chartRows = seasons.map((season) => {
      const a = auctionBySeason.get(season)
      const p = perfBySeason.get(season)
      const retained = Boolean(a?.retained)
      const priceCr = a?.priceCr ?? null
      const performanceRuns = p?.runs ?? null
      const performanceWickets = p?.wickets ?? null
      const performanceValue = perfKind === 'wickets' ? performanceWickets : performanceRuns
      return {
        season,
        priceCr,
        performanceRuns,
        performanceWickets,
        performanceValue,
        retained,
        team: a?.team ?? '',
      }
    })

    const perfValues = chartRows
      .map((r) => r.performanceValue)
      .filter((v) => v !== null && Number.isFinite(v))
    const avgPerf =
      perfValues.length > 0 ? perfValues.reduce((s, v) => s + v, 0) / perfValues.length : null

    const pricedSeasons = chartRows.filter((r) => r.priceCr !== null && Number.isFinite(r.priceCr))
    const peakPriceRow = pricedSeasons.reduce(
      (best, r) => (!best || r.priceCr > best.priceCr ? r : best),
      null,
    )

    const perfRows = chartRows.filter((r) => r.performanceValue !== null && Number.isFinite(r.performanceValue))
    const bestPerfRow = perfRows.reduce(
      (best, r) => (!best || r.performanceValue > best.performanceValue ? r : best),
      null,
    )

    const avgPrice =
      pricedSeasons.length > 0
        ? pricedSeasons.reduce((s, r) => s + r.priceCr, 0) / pricedSeasons.length
        : null

    const corrXs = []
    const corrYs = []
    for (const r of chartRows) {
      if (r.priceCr === null || !Number.isFinite(r.priceCr)) continue
      if (r.performanceValue === null || !Number.isFinite(r.performanceValue)) continue
      corrXs.push(r.priceCr)
      corrYs.push(r.performanceValue)
    }
    const r = pearson(corrXs, corrYs)
    const corrCat = categorizeCorrelation(r)
    const corrText =
      r === null ? 'Insufficient data' : `${corrCat.label} (r ≈ ${r.toFixed(2)})`

    const insights = []

    if (peakPriceRow && avgPerf !== null && peakPriceRow.performanceValue !== null) {
      const v = peakPriceRow.performanceValue
      const pct = avgPerf === 0 ? null : ((v - avgPerf) / avgPerf) * 100
      const dir =
        pct === null ? 'in line with' : pct >= 0 ? `${Math.abs(pct).toFixed(0)}% above` : `${Math.abs(pct).toFixed(0)}% below`
      insights.push(
        `Price peaked in ${peakPriceRow.season} at ${formatCr(peakPriceRow.priceCr)}${
          peakPriceRow.retained ? ' (retained)' : ''
        } — performance was ${dir} their career average ${perfLabel.toLowerCase()} (${formatInt(avgPerf)}).`,
      )
    }

    let bestValueRow = null
    let bestRatio = null
    for (const row of chartRows) {
      if (row.priceCr === null || !Number.isFinite(row.priceCr) || row.priceCr <= 0) continue
      if (row.performanceValue === null || !Number.isFinite(row.performanceValue) || row.performanceValue <= 0)
        continue
      const ratio = row.priceCr / row.performanceValue
      if (!Number.isFinite(ratio) || ratio <= 0) continue
      if (bestRatio === null || ratio < bestRatio) {
        bestRatio = ratio
        bestValueRow = row
      }
    }
    if (bestValueRow) {
      insights.push(
        `Strongest value season: ${bestValueRow.season} — paid ${formatCr(bestValueRow.priceCr)} and delivered ${formatInt(
          bestValueRow.performanceValue,
        )} ${perfLabel.toLowerCase()} (${(bestValueRow.performanceValue / bestValueRow.priceCr).toFixed(1)} per crore).`,
      )
    }

    insights.push(`Price and performance correlation: ${corrText}.`)

    const summary = {
      seasonsPlayed: seasons.length,
      peakPrice: peakPriceRow?.priceCr ?? null,
      peakPriceSeason: peakPriceRow?.season ?? null,
      peakRetained: Boolean(peakPriceRow?.retained),
      bestPerf: bestPerfRow?.performanceValue ?? null,
      bestPerfSeason: bestPerfRow?.season ?? null,
      avgPrice,
      perfLabel,
    }

    return {
      chartRows,
      perfKind,
      perfLabel,
      summary,
      insights: insights.slice(0, 3),
    }
  }, [auctionData, performanceData, selectedPlayer])

  useEffect(() => {
    function onDocMouseDown(e) {
      const el = rootRef.current
      if (!el) return
      if (e.target instanceof Node && !el.contains(e.target)) setOpen(false)
    }
    function onKey(e) {
      if (!open) return
      if (e.key === 'Escape') setOpen(false)
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => {
          const max = Math.max(0, suggestions.length - 1)
          return Math.min(Math.min(i, max) + 1, max)
        })
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => {
          const max = Math.max(0, suggestions.length - 1)
          return Math.max(Math.min(i, max) - 1, 0)
        })
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        const max = Math.max(0, suggestions.length - 1)
        const pick = suggestions[Math.min(activeIndex, max)]
        if (pick) {
          setSelectedPlayer(pick)
          setQuery(pick)
          setOpen(false)
        }
      }
    }
    document.addEventListener('mousedown', onDocMouseDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, suggestions, activeIndex])

  const chartWidth = useMemo(
    () => Math.max(520, (careerPack.chartRows?.length ?? 0) * 72),
    [careerPack.chartRows],
  )

  const activeSuggestionIndex = Math.min(activeIndex, Math.max(0, suggestions.length - 1))

  return (
    <section className="player-career-arc" ref={rootRef} aria-label="Player career arc tracker">
      <header className="pca-head">
        <div>
          <p className="pca-kicker">Career arc</p>
          <h2 className="pca-title">Player career arc tracker</h2>
          <p className="pca-lede">
            Auction spend vs output by season — retained seasons use the retention price and a distinct marker.
          </p>
        </div>
      </header>

      <div className="pca-search">
        <label className="pca-search__label" htmlFor="pca-player-search">
          Find a player
        </label>
        <div className="pca-search__field">
          <input
            id="pca-player-search"
            className="pca-input"
            value={query}
            autoComplete="off"
            placeholder="Type a player name…"
            role="combobox"
            aria-expanded={open}
            aria-controls="pca-player-listbox"
            aria-activedescendant={open ? `pca-opt-${activeSuggestionIndex}` : undefined}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value)
              setActiveIndex(0)
              setOpen(true)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
                // handled on document when open; keep browser from moving caret weirdly on arrows
                if (open) e.preventDefault()
              }
            }}
          />
          {open && suggestions.length > 0 ? (
            <ul id="pca-player-listbox" className="pca-suggest" role="listbox">
              {suggestions.map((name, idx) => (
                <li
                  key={name}
                  id={`pca-opt-${idx}`}
                  role="option"
                  aria-selected={idx === activeSuggestionIndex}
                >
                  <button
                    type="button"
                    className={`pca-suggest__btn${idx === activeSuggestionIndex ? ' is-active' : ''}`}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setSelectedPlayer(name)
                      setQuery(name)
                      setOpen(false)
                    }}
                  >
                    {name}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      {!selectedPlayer ? (
        <div className="pca-empty">Select a player to load their career arc.</div>
      ) : (
        <>
          {careerPack.summary ? (
            <div className="pca-stats" aria-label="Career summary">
              <div className="pca-stat">
                <div className="pca-stat__label">Seasons</div>
                <div className="pca-stat__value">{careerPack.summary.seasonsPlayed}</div>
              </div>
              <div className="pca-stat">
                <div className="pca-stat__label">Peak price</div>
                <div className="pca-stat__value">{formatCr(careerPack.summary.peakPrice)}</div>
                <div className="pca-stat__meta">
                  {careerPack.summary.peakPriceSeason ? `Season ${careerPack.summary.peakPriceSeason}` : '—'}
                  {careerPack.summary.peakRetained ? ' · Retained' : ''}
                </div>
              </div>
              <div className="pca-stat">
                <div className="pca-stat__label">Career best</div>
                <div className="pca-stat__value">
                  {formatInt(careerPack.summary.bestPerf)} {careerPack.summary.perfLabel}
                </div>
                <div className="pca-stat__meta">
                  {careerPack.summary.bestPerfSeason ? `Season ${careerPack.summary.bestPerfSeason}` : '—'}
                </div>
              </div>
              <div className="pca-stat">
                <div className="pca-stat__label">Avg price / season</div>
                <div className="pca-stat__value">{formatCr(careerPack.summary.avgPrice)}</div>
                <div className="pca-stat__meta">Across priced seasons</div>
              </div>
            </div>
          ) : null}

          <div className="pca-chart-wrap">
            <div className="pca-chart-scroll">
              <div className="pca-chart-inner" style={{ width: chartWidth, minWidth: '100%' }}>
                <ResponsiveContainer width="100%" height={320}>
                  <ComposedChart data={careerPack.chartRows} margin={{ top: 10, right: 18, left: 6, bottom: 8 }}>
                    <CartesianGrid stroke="color-mix(in srgb, var(--border) 55%, transparent)" vertical={false} />
                    <XAxis dataKey="season" tick={{ fill: 'var(--text)', fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis
                      yAxisId="price"
                      orientation="left"
                      tick={{ fill: 'var(--text)', fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      width={44}
                      label={{
                        value: 'Price (₹ Cr)',
                        angle: -90,
                        position: 'insideLeft',
                        fill: 'var(--text-h, #e2e8f0)',
                        fontSize: 12,
                      }}
                    />
                    <YAxis
                      yAxisId="perf"
                      orientation="right"
                      tick={{ fill: 'var(--text)', fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      width={44}
                      label={{
                        value: careerPack.perfLabel,
                        angle: 90,
                        position: 'insideRight',
                        fill: 'var(--text-h, #e2e8f0)',
                        fontSize: 12,
                      }}
                    />
                    <Tooltip
                      content={<CareerTooltip perfLabel={careerPack.perfLabel} />}
                      cursor={{ stroke: 'color-mix(in srgb, var(--accent) 55%, transparent)', strokeWidth: 1 }}
                    />
                    <Legend
                      verticalAlign="top"
                      wrapperStyle={{ paddingBottom: 8 }}
                      formatter={(value) => <span style={{ color: 'var(--text)' }}>{value}</span>}
                    />
                    <Line
                      yAxisId="price"
                      type="monotone"
                      dataKey="priceCr"
                      name="Auction / retention price"
                      stroke="var(--pca-price, #facc15)"
                      strokeWidth={2.25}
                      dot={<PriceDot />}
                      activeDot={{ r: 7 }}
                      isAnimationActive
                    />
                    <Line
                      yAxisId="perf"
                      type="monotone"
                      dataKey="performanceValue"
                      name={careerPack.perfLabel}
                      stroke="var(--pca-perf, #22d3ee)"
                      strokeWidth={2.25}
                      dot={<PerfDot />}
                      activeDot={{ r: 7 }}
                      isAnimationActive
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="pca-legend-note" aria-hidden>
              <span className="pca-legend-note__item">
                <span className="pca-legend-dot pca-legend-dot--auction" /> Auctioned price
              </span>
              <span className="pca-legend-note__item">
                <span className="pca-legend-dot pca-legend-dot--retained" /> Retained price
              </span>
            </div>
          </div>

          <div className="pca-insights" aria-label="Auto insights">
            {careerPack.insights.map((t) => (
              <p key={t} className="pca-insight">
                {t}
              </p>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
