import { FEDERATIONS, byConference } from '../../web/season-calendars.ts';

/**
 * Every season calendar we hold, by federation, conference and region
 * (scopes 101, 103).
 *
 * Static and public, like `/`: a published calendar is the governing body's
 * own public document, so there is nothing here a stranger may not read and
 * no session to look up. A region still waiting for its calendar is listed
 * anyway, so a club finds its region and learns it is coming rather than
 * concluding it was forgotten.
 */
export const metadata = {
  title: 'Season calendars',
  description: 'The 2027 football season, month by month, as each governing body publishes it.',
};

export default function SeasonsPage() {
  return (
    <>
      <section className="hero">
        <p className="eyebrow">Season calendars · Australia</p>
        <h2>Find your region’s season</h2>
        <p className="lede">
          Each state federation publishes its season by region. Pick yours to walk the year month
          by month: when each competition kicks off, its catch-up weekends, and its finals.
        </p>
      </section>

      <div className="seasons-map">
        {FEDERATIONS.map((f) => (
          <section key={f.name} className={`seasons-fed${f.regions.length > 0 ? ' has-regions' : ''}`}>
            <p className="seasons-state">{f.state}</p>
            <h3>{f.name}</h3>
            {f.regions.length === 0 ? (
              <p className="hint">No regional calendars yet.</p>
            ) : (
              byConference(f.regions).map((g) => (
                <div key={g.conference ?? f.name} className="seasons-conference">
                  {g.conference && <h4>{g.conference}</h4>}
                  <ul>
                    {g.regions.map((r) => (
                      <li key={r.name}>
                        {r.calendar ? (
                          <a href={`/seasons/${r.calendar}`}>
                            {r.name} <span className="seasons-live">2027 · open</span>
                          </a>
                        ) : (
                          <span>
                            {r.name} <span className="seasons-soon">coming</span>
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </section>
        ))}
      </div>
    </>
  );
}
