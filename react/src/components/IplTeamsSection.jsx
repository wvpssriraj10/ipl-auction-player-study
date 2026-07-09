import { useEffect, useMemo, useRef, useState } from 'react'
import { getIplTeams } from '../data/iplTeams'
import './IplTeamsSection.css'

const COLOR_PHRASES = {
  'navy blue': '#172554',
  'light blue': '#0ea5e9',
  'royal blue': '#2563eb',
}

function cssColorToken(raw) {
  if (!raw || typeof raw !== 'string') return '#475569'
  const key = raw.trim().toLowerCase()
  if (COLOR_PHRASES[key]) return COLOR_PHRASES[key]
  if (/\s/.test(key)) return '#1e293b'
  return key
}

function gradientFromColors(colors) {
  if (!Array.isArray(colors) || colors.length === 0) {
    return 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #0f172a 100%)'
  }
  const [a, b] = colors
  const c = cssColorToken(b || a)
  const d = cssColorToken(a)
  return `linear-gradient(135deg, ${d} 0%, ${c} 55%, #0f172a 100%)`
}

export default function IplTeamsSection() {
  const teams = useMemo(() => getIplTeams(), [])
  const [selectedId, setSelectedId] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const gridRef = useRef(null)
  const backBtnRef = useRef(null)

  const selected = teams.find((t) => t.id === selectedId) ?? null

  useEffect(() => {
    document.body.classList.toggle('ipl-teams-react-detail-open', detailOpen)
    return () => document.body.classList.remove('ipl-teams-react-detail-open')
  }, [detailOpen])

  useEffect(() => {
    if (!detailOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setDetailOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [detailOpen])

  useEffect(() => {
    if (detailOpen) {
      requestAnimationFrame(() => backBtnRef.current?.focus())
    } else if (selectedId && gridRef.current) {
      const btn = gridRef.current.querySelector(`[data-team-id="${selectedId}"]`)
      if (btn instanceof HTMLElement) btn.focus()
    }
  }, [detailOpen, selectedId])

  function openTeam(id) {
    setSelectedId(id)
    setDetailOpen(true)
  }

  function closeDetail() {
    setDetailOpen(false)
  }

  function renderSocials(links) {
    if (!links) return null
    const icons = {
      twitter: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      instagram: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
        </svg>
      ),
      youtube: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.42a2.78 2.78 0 0 0-1.94 2C1 8.14 1 12 1 12s0 3.86.42 5.58a2.78 2.78 0 0 0 1.94 2c1.72.42 8.6.42 8.6.42s6.88 0 8.6-.42a2.78 2.78 0 0 0 1.94-2C23 15.86 23 12 23 12s0-3.86-.42-5.58z" />
          <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" />
        </svg>
      ),
    }

    return (
      <div className="ipl-teams__socials">
        {Object.entries(links).map(([key, url]) => (
          <a
            key={key}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="ipl-teams__social-link"
            aria-label={key}
          >
            {icons[key] || key}
          </a>
        ))}
      </div>
    )
  }

  function renderDetailArticle(team) {
    const isLegendary = (team.honours?.ipl_titles ?? 0) >= 3

    return (
      <article
        className="ipl-teams__detail ipl-teams__detail--fullscreen"
        aria-label={team.name}
      >
        <div className="ipl-teams__detail-inner">
          <header className="ipl-teams__detail-head">
            {team.logoUrl && (
              <div className="ipl-teams__detail-logo-pod">
                <img
                  src={team.logoUrl}
                  alt={team.name}
                  className="ipl-teams__detail-logo"
                />
              </div>
            )}
            <div className="ipl-teams__detail-titling">
              <div className="ipl-teams__detail-top-meta">
                {isLegendary && (
                  <span className="ipl-teams__detail-badge ipl-teams__detail-badge--muted" style={{ opacity: 0.6, fontSize: '0.6rem', background: 'rgba(139, 92, 246, 0.2)', color: '#c4b5fd', border: '1px solid rgba(167, 139, 250, 0.3)' }}>
                    LEGENDARY DYNASTY
                  </span>
                )}
                <span className="ipl-teams__detail-abbr" style={{ color: 'rgba(255,255,255,0.9)', fontFamily: "'Outfit', sans-serif" }}>{team.short_name}</span>
                <span className={`ipl-teams__detail-badge ipl-teams__detail-badge--${team.basic_info?.status === 'active' ? 'active' : 'defunct'}`}>
                  {team.basic_info?.status || 'Active'}
                </span>
              </div>
              <h2 className="ipl-teams__detail-title">{team.name}</h2>
              <p className="ipl-teams__detail-sub">
                {team.basic_info?.city}
                <span className="ipl-teams__dot"> · </span>
                Since <strong>{team.basic_info?.founded}</strong>
              </p>

              <div className="ipl-teams__action-bar">
                <a href={`/squad-list.html?team=${team.id}`} className="ipl-teams__squads-btn">
                  Squads List
                </a>
                {renderSocials(team.social_links)}
              </div>
            </div>
          </header>

          <div className="ipl-teams__content-body">
            {team.identity?.meaning && (
              <p className="ipl-teams__tagline">{team.identity.meaning}</p>
            )}

            {team.identity?.colors?.length > 0 && (
              <ul className="ipl-teams__chips" aria-label="Team colours">
                {team.identity.colors.map((c) => (
                  <li key={c} className="ipl-teams__chip">
                    {c}
                  </li>
                ))}
              </ul>
            )}

            <dl className="ipl-teams__facts">
              <div>
                <dt>Captain</dt>
                <dd>{team.management?.captain ?? '—'}</dd>
              </div>
              <div>
                <dt>Coach</dt>
                <dd>{team.management?.coach ?? '—'}</dd>
              </div>
              <div>
                <dt>Founded</dt>
                <dd>{team.basic_info?.founded ?? '—'}</dd>
              </div>
              <div>
                <dt>Owner</dt>
                <dd title={team.ownership?.current_owner}>{team.ownership?.current_owner ?? '—'}</dd>
              </div>
            </dl>

            <div className="ipl-teams__honours">
              <h4>Honours</h4>
              <p>
                <strong>{team.honours?.ipl_titles ?? 0}</strong> IPL titles
              </p>
              {team.honours?.title_years?.length > 0 && (
                <div className="ipl-teams__honours-years">
                  {team.honours.title_years.map((year) => (
                    <span key={year} className="ipl-teams__year-pill">
                      {year}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="ipl-teams__stats-footer">
              <span className="ipl-teams__stat-item">
                <strong>{team.honours?.finals ?? 0}</strong> finals
              </span>
              <span className="ipl-teams__dot"> · </span>
              <span className="ipl-teams__stat-item">
                <strong>{team.honours?.playoff_appearances ?? 0}</strong> playoff runs
              </span>
            </div>

            {team.performance?.overall && (
              <div className="ipl-teams__stats-footer" style={{ marginTop: '1rem', border: 'none', paddingTop: 0 }}>
                <strong>{team.performance.overall.matches}</strong> matches
                <span className="ipl-teams__dot"> · </span>
                <strong>{team.performance.overall.wins}</strong> wins
                <span className="ipl-teams__dot"> · </span>
                <strong>{team.performance.overall.win_pct}%</strong> win rate
              </div>
            )}

            <div className="ipl-teams__story">
              <h4>History</h4>
              <div className="ipl-teams__story-text">
                {(team.history?.full_text || '').split('. ').map((sentence, idx) => {
                  const trimmed = sentence.trim()
                  if (!trimmed) return null
                  return (
                    <p key={idx}>
                      {trimmed}
                      {trimmed.endsWith('.') ? '' : '.'}
                    </p>
                  )
                })}
              </div>
            </div>

            {team.notable_players?.length > 0 && (
              <div className="ipl-teams__story">
                <h4>Notable players</h4>
                <p className="ipl-teams__players" style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.7)' }}>
                  {team.notable_players.join(', ')}
                </p>
              </div>
            )}
          </div>
        </div>
      </article>
    )
  }

  return (
    <section className="ipl-teams" aria-labelledby="ipl-teams-heading">
      <div className="ipl-teams__intro">
        <h2 id="ipl-teams-heading">IPL teams</h2>
      </div>

      <div className="ipl-teams__list-stage" aria-hidden={detailOpen}>
        <div
          ref={gridRef}
          className="ipl-teams__grid ipl-teams__grid--picker"
          role="listbox"
          aria-label="IPL franchises"
          aria-multiselectable="false"
        >
          {teams.map((team) => {
            const isActive = team.id === selectedId
            const photoBg = Boolean(team.bgUrl)
            return (
              <button
                key={team.id}
                type="button"
                data-team-id={team.id}
                role="option"
                aria-selected={isActive}
                aria-label={team.name}
                className={`ipl-teams__card ipl-teams__card--picker${isActive ? ' ipl-teams__card--active' : ''}${photoBg ? ' ipl-teams__card--has-photo-bg' : ' ipl-teams__card--has-gradient-bg'}`}
                onClick={() => openTeam(team.id)}
              >
                <span className="ipl-teams__card-visual" aria-hidden>
                  <span
                    className="ipl-teams__card-bg"
                    style={
                      photoBg
                        ? { backgroundImage: `url(${team.bgUrl})` }
                        : {
                            background: gradientFromColors(
                              team.identity?.colors,
                            ),
                          }
                    }
                  />
                  <span className="ipl-teams__card-scrim" />
                </span>
                <span className="ipl-teams__card-inner">
                  <span className="ipl-teams__card-logo-wrap">
                    {team.logoUrl ? (
                      <img
                        src={team.logoUrl}
                        alt=""
                        className="ipl-teams__card-logo"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <span className="ipl-teams__card-fallback" aria-hidden>
                        {team.short_name}
                      </span>
                    )}
                  </span>
                  <span className="ipl-teams__card-meta">
                    <span className="ipl-teams__card-abbr">{team.short_name}</span>
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {detailOpen && selected && (
        <div
          className="ipl-teams__detail-stage"
          role="dialog"
          aria-modal="true"
          aria-label="Team profile"
        >
          <div
            className="ipl-teams__stage-bg"
            style={
              selected.bgUrl
                ? { backgroundImage: `url(${selected.bgUrl})` }
                : { background: gradientFromColors(selected.identity?.colors) }
            }
            aria-hidden
          />
          <div className="ipl-teams__detail-stage-bar">
            <button
              ref={backBtnRef}
              type="button"
              className="ipl-teams__back-btn"
              onClick={closeDetail}
            >
              Go back
            </button>
          </div>
          {renderDetailArticle(selected)}
        </div>
      )}
    </section>
  )
}
