import { useMemo, useState } from 'react'
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
  const [selectedId, setSelectedId] = useState(teams[0]?.id ?? null)

  const selected = teams.find((t) => t.id === selectedId) ?? teams[0] ?? null

  return (
    <section className="ipl-teams" aria-labelledby="ipl-teams-heading">
      <div className="ipl-teams__intro">
        <h2 id="ipl-teams-heading">IPL teams</h2>
        <p className="ipl-teams__lede">
          Franchise profiles from your JSON assets. Pick a team to view details
          on a softened background so the copy stays sharp and easy to read.
        </p>
      </div>

      <div className="ipl-teams__layout">
        <div
          className="ipl-teams__grid"
          role="tablist"
          aria-label="IPL franchises"
        >
          {teams.map((team) => {
            const isActive = team.id === selected?.id
            const photoBg = Boolean(team.bgUrl)
            return (
              <button
                key={team.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`ipl-teams__card${isActive ? ' ipl-teams__card--active' : ''}${photoBg ? ' ipl-teams__card--has-photo-bg' : ' ipl-teams__card--has-gradient-bg'}`}
                onClick={() => setSelectedId(team.id)}
              >
                <span
                  className="ipl-teams__card-bg"
                  aria-hidden
                  style={
                    photoBg
                      ? { backgroundImage: `url(${team.bgUrl})` }
                      : { background: gradientFromColors(team.identity?.colors) }
                  }
                />
                <span className="ipl-teams__card-scrim" aria-hidden />
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
                    <span className="ipl-teams__card-name">{team.name}</span>
                    <span className="ipl-teams__card-abbr">{team.short_name}</span>
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        {selected && (
          <article
            className="ipl-teams__detail"
            role="tabpanel"
            aria-label={selected.name}
          >
            <div
              className={`ipl-teams__detail-bg${selected.bgUrl ? ' ipl-teams__detail-bg--photo' : ''}`}
              style={
                selected.bgUrl
                  ? {
                      backgroundImage: `url(${selected.bgUrl})`,
                    }
                  : {
                      background: gradientFromColors(selected.identity?.colors),
                    }
              }
              aria-hidden
            />
            <div className="ipl-teams__detail-scrim" aria-hidden />
            <div className="ipl-teams__detail-inner">
              <header className="ipl-teams__detail-head">
                {selected.logoUrl && (
                  <img
                    src={selected.logoUrl}
                    alt=""
                    className="ipl-teams__detail-logo"
                    width={96}
                    height={96}
                  />
                )}
                <div className="ipl-teams__detail-titles">
                  <h3 className="ipl-teams__detail-title">{selected.name}</h3>
                  <p className="ipl-teams__detail-sub">
                    <strong>{selected.short_name}</strong>
                    <span className="ipl-teams__dot" aria-hidden>
                      ·
                    </span>
                    {selected.basic_info?.city}
                  </p>
                  <div className="ipl-teams__badges">
                    <span
                      className={`ipl-teams__badge ipl-teams__badge--${selected.basic_info?.status === 'active' ? 'active' : 'defunct'}`}
                    >
                      {selected.basic_info?.status === 'active'
                        ? 'Active'
                        : 'Defunct'}
                    </span>
                    {selected.basic_info?.active_years && (
                      <span className="ipl-teams__badge ipl-teams__badge--muted">
                        {selected.basic_info.active_years.join('–')}
                      </span>
                    )}
                  </div>
                </div>
              </header>

              {selected.identity?.meaning && (
                <p className="ipl-teams__tagline">{selected.identity.meaning}</p>
              )}

              {selected.identity?.colors?.length > 0 && (
                <ul className="ipl-teams__chips" aria-label="Team colours">
                  {selected.identity.colors.map((c) => (
                    <li key={c} className="ipl-teams__chip">
                      {c}
                    </li>
                  ))}
                </ul>
              )}

              <dl className="ipl-teams__facts">
                <div>
                  <dt>Captain</dt>
                  <dd>{selected.management?.captain ?? '—'}</dd>
                </div>
                <div>
                  <dt>Coach</dt>
                  <dd>{selected.management?.coach ?? '—'}</dd>
                </div>
                <div>
                  <dt>Founded</dt>
                  <dd>{selected.basic_info?.founded ?? '—'}</dd>
                </div>
                <div>
                  <dt>Owner</dt>
                  <dd>{selected.ownership?.current_owner ?? '—'}</dd>
                </div>
              </dl>

              <div className="ipl-teams__honours">
                <h4>Honours</h4>
                <p>
                  <strong>{selected.honours?.ipl_titles ?? 0}</strong> titles
                  {selected.honours?.title_years?.length > 0 &&
                    ` (${selected.honours.title_years.join(', ')})`}
                  <span className="ipl-teams__dot"> · </span>
                  <strong>{selected.honours?.finals ?? 0}</strong> finals
                  <span className="ipl-teams__dot"> · </span>
                  <strong>{selected.honours?.playoff_appearances ?? 0}</strong>{' '}
                  playoff runs
                </p>
              </div>

              {selected.performance?.overall && (
                <div className="ipl-teams__honours">
                  <h4>Overall record</h4>
                  <p>
                    <strong>{selected.performance.overall.matches}</strong>{' '}
                    matches
                    <span className="ipl-teams__dot"> · </span>
                    <strong>{selected.performance.overall.wins}</strong> wins
                    <span className="ipl-teams__dot"> · </span>
                    <strong>{selected.performance.overall.win_pct}%</strong> win
                    rate
                  </p>
                </div>
              )}

              <div className="ipl-teams__story">
                <h4>History</h4>
                <p>{selected.history?.full_text}</p>
              </div>

              {selected.notable_players?.length > 0 && (
                <div className="ipl-teams__honours">
                  <h4>Notable players</h4>
                  <p className="ipl-teams__players">
                    {selected.notable_players.join(', ')}
                  </p>
                </div>
              )}
            </div>
          </article>
        )}
      </div>
    </section>
  )
}
