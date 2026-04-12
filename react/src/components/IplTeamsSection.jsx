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

  function renderDetailArticle(team) {
    return (
      <article
        className="ipl-teams__detail ipl-teams__detail--fullscreen"
        aria-label={team.name}
      >
        {/* Local hero background hidden in favor of stage background for immersive look */}
        <div className="ipl-teams__detail-scrim" aria-hidden />
        <div className="ipl-teams__detail-inner">
          <header className="ipl-teams__detail-head">
            {team.logoUrl && (
              <img
                src={team.logoUrl}
                alt=""
                className="ipl-teams__detail-logo"
                width={96}
                height={96}
              />
            )}
            <div className="ipl-teams__detail-titles">
              <h3 className="ipl-teams__detail-title">{team.name}</h3>
              <p className="ipl-teams__detail-sub">
                <strong>{team.short_name}</strong>
                <span className="ipl-teams__dot" aria-hidden>
                  ·
                </span>
                {team.basic_info?.city}
              </p>
              <div className="ipl-teams__badges">
                <span
                  className={`ipl-teams__badge ipl-teams__badge--${team.basic_info?.status === 'active' ? 'active' : 'defunct'}`}
                >
                  {team.basic_info?.status === 'active' ? 'Active' : 'Defunct'}
                </span>
                {team.basic_info?.active_years && (
                  <span className="ipl-teams__badge ipl-teams__badge--muted">
                    {team.basic_info.active_years.join('–')}
                  </span>
                )}
              </div>
            </div>
          </header>

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
              <dd>{team.ownership?.current_owner ?? '—'}</dd>
            </div>
          </dl>

          <div className="ipl-teams__honours">
            <h4>Honours</h4>
            <p>
              <strong>{team.honours?.ipl_titles ?? 0}</strong> titles
              {team.honours?.title_years?.length > 0 &&
                ` (${team.honours.title_years.join(', ')})`}
              <span className="ipl-teams__dot"> · </span>
              <strong>{team.honours?.finals ?? 0}</strong> finals
              <span className="ipl-teams__dot"> · </span>
              <strong>{team.honours?.playoff_appearances ?? 0}</strong> playoff
              runs
            </p>
          </div>

          {team.performance?.overall && (
            <div className="ipl-teams__honours">
              <h4>Overall record</h4>
              <p>
                <strong>{team.performance.overall.matches}</strong> matches
                <span className="ipl-teams__dot"> · </span>
                <strong>{team.performance.overall.wins}</strong> wins
                <span className="ipl-teams__dot"> · </span>
                <strong>{team.performance.overall.win_pct}%</strong> win rate
              </p>
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
            <div className="ipl-teams__honours">
              <h4>Notable players</h4>
              <p className="ipl-teams__players">
                {team.notable_players.join(', ')}
              </p>
            </div>
          )}
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
