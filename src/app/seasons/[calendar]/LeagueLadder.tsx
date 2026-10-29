import { namesInSeveralLeagues, teamCount, type LeagueDeclaration, type LeagueLink } from '../../../web/league-declarations.ts';

/** What joins two leagues, in words; the arrows only repeat them. */
const LINKS: Readonly<Record<LeagueLink, { readonly marks: string; readonly words: string }>> = {
  'promotion-relegation': { marks: '▲ ▼', words: 'Promotion and relegation' },
  'play-offs': { marks: '▲▼', words: 'Play-offs' },
};

/**
 * Who plays where (scope 121, BR191): a governing body's declaration of
 * leagues, top league first, beside the region's season calendar.
 *
 * Server-rendered and static, like the calendar. It reads nothing, and
 * shows the publisher's teams, order and status as printed. Between two
 * leagues it says how they meet, in words. Promotion and relegation are not
 * statuses, so they take no status colour. A name printed in two leagues is
 * noted as exactly that.
 */
export function LeagueLadder({ declaration: d }: { readonly declaration: LeagueDeclaration }) {
  const twice = namesInSeveralLeagues(d);

  return (
    <section id="leagues" className="league-decl" aria-labelledby={`${d.id}-title`}>
      <p className="eyebrow">
        {d.governingBody} · {d.season} · Declaration of leagues
      </p>
      <h2 id={`${d.id}-title`}>Who plays where: {d.title}</h2>
      <p className="season-caveat">
        <span className="pill pill-warn">{d.status}</span> {d.governingBody}’s proposed {d.season} leagues:{' '}
        {d.leagues.length} leagues and {teamCount(d)} team places. Shown as published, each league’s teams
        in the printed order, which is not a ladder position. Source: {d.governingBody}, {d.season}{' '}
        {d.status} Declaration of Leagues.
      </p>

      <ol className="league-ladder">
        {d.leagues.map((l, i) => {
          const link = d.links[i];
          return (
            <li key={l.name}>
              <section className="league" aria-labelledby={`${d.id}-${i}`}>
                <h3 id={`${d.id}-${i}`}>
                  {l.name} <span className="league-count">{l.teams.length} teams</span>
                </h3>
                <ul className="league-teams">
                  {l.teams.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </section>
              {link && (
                <p className="league-link">
                  <span aria-hidden="true">{LINKS[link].marks}</span> {LINKS[link].words}
                  <span className="league-link-between">
                    {' '}
                    between {l.name} and {d.leagues[i + 1]?.name}
                  </span>
                </p>
              )}
            </li>
          );
        })}
      </ol>

      <div className="league-notes">
        <p>
          <strong>Play-offs into QPL 2.</strong> The key lists the conference’s regional ladders that
          meet QPL 2 through play-offs:{' '}
          {d.playOffLadders.map((p, i) => (
            <span key={p.region}>
              {i > 0 && (i === d.playOffLadders.length - 1 ? ' and ' : ', ')}
              {p.region} ({p.leagues})
            </span>
          ))}
          . How many teams move between leagues is not printed, so it is not shown here.
        </p>
        {twice.length > 0 && (
          <p>
            <strong>Printed in two leagues.</strong>{' '}
            {twice.map((t, i) => (
              <span key={t.name}>
                {i > 0 && '; '}
                {t.name} ({t.leagues.join(' and ')})
              </span>
            ))}
            . A club can enter more than one team; the declaration prints the name only.
          </p>
        )}
      </div>
    </section>
  );
}
