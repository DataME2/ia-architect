/**
 * A governing body's declaration of leagues: which teams play in which
 * league for a season (scope 121, BR191).
 *
 * **Shown as published, never corrected.** A declaration is the
 * governing body's own public document, as a season calendar is (BR178).
 * Each league's teams are listed as printed, in the printed order, which
 * is not a ladder position. Its status is the publisher's own word: a
 * provisional declaration says so wherever it is shown. A name is the
 * team's name as printed. It is not a Club or a Team in PitchPeople, and
 * nothing here reads or changes a club's records.
 *
 * Where the document is unclear, the doubt is logged as an open question,
 * not resolved by guess: the key's footnote under "Play-offs" is too small
 * to read in the copy held, so it is not transcribed (question 117).
 */

/** How a league meets the one below it, as the graphic draws it. */
export type LeagueLink = 'promotion-relegation' | 'play-offs';

export interface DeclaredLeague {
  readonly name: string;
  /** The teams as printed, in the printed order. */
  readonly teams: readonly string[];
}

export interface LeagueDeclaration {
  readonly id: string;
  /** The region's season calendar this declaration sits beside. */
  readonly calendarId: string;
  readonly season: number;
  readonly governingBody: string;
  readonly title: string;
  readonly status: 'Provisional' | 'Final';
  /** The published document, kept in the repository. */
  readonly source: string;
  /** Top league first. */
  readonly leagues: readonly DeclaredLeague[];
  /** `links[i]` joins `leagues[i]` to `leagues[i + 1]`. */
  readonly links: readonly LeagueLink[];
  /** The key's play-off ladders: each region's leagues, as the key prints them. */
  readonly playOffLadders: readonly { readonly region: string; readonly leagues: string }[];
}

/**
 * Football Queensland's 2027 Provisional Declaration of Leagues, SEQ
 * Conference, Metro Men, transcribed from the published graphic. NPL to QPL
 * 2, then QPL 3 to 6 Metro. Arrows join each pair of leagues, except QPL 2
 * and QPL 3 Metro, which the graphic joins with play-offs.
 */
export const FQ_2027_SEQ_METRO_MEN: LeagueDeclaration = {
  id: 'fq-2027-seq-metro-men',
  calendarId: 'fq-2027-seq-advanced-metro',
  season: 2027,
  governingBody: 'Football Queensland',
  title: 'SEQ Conference, Metro Men',
  status: 'Provisional',
  source: 'docs/annexes/fq-2027-provisional-declaration-of-leagues-seq-metro-men.webp',
  leagues: [
    {
      name: 'NPL',
      teams: [
        'Lions FC', 'Peninsula Power', 'Moreton City Excelsior', 'Gold Coast Knights', 'Brisbane City', 'Wynnum Wolves',
        'Eastern Suburbs', 'Olympic FC', 'Magic United', 'Rochedale Rovers', 'Brisbane Strikers', 'Broadbeach United',
      ],
    },
    {
      name: 'QPL 1',
      teams: [
        'Gold Coast United', 'Brisbane Roar B', 'Sunshine Coast Wanderers', 'Ipswich City FC', 'Robina City FC',
        'Caboolture Sports FC', 'Redlands United', 'Holland Park Hawks', 'Logan Lightning', 'North Star', 'SWQ Thunder',
        'Grange Thistle',
      ],
    },
    {
      name: 'QPL 2',
      teams: [
        'St George Willawong', 'Capalaba FC', 'Moreton City Excelsior', 'Pine Hills', 'Souths United', 'Brisbane Knights',
        'Taringa Rovers', 'Mitchelton FC', 'Virginia United', 'Caloundra FC', 'Newmarket', 'Burleigh Heads',
      ],
    },
    {
      name: 'QPL 3 Metro',
      teams: [
        'Southside Eagles', 'Samford Rangers', 'AC Carina', 'Moggill', 'Yeronga Eagles', 'Springfield United', 'Logan Roos',
        'Mt Gravatt Hawks', 'Ipswich Knights', 'North Lakes United', 'UQFC', 'North Pine', 'New Farm United',
        'Logan Village',
      ],
    },
    {
      name: 'QPL 4 Metro',
      teams: [
        'North Brisbane', 'Redcliffe Dolphins', 'Ripley Valley', 'Narangba Eagles', 'Annerley FC', 'Kangaroo Point Rovers',
        'Centenary Stormers', 'Logan Metro', 'Bardon Latrobe', 'Western Spirit', 'Pine Rivers FC', 'FC Old Bridge',
      ],
    },
    {
      name: 'QPL 5 Metro',
      teams: [
        'Bayside United', 'The Gap FC', 'Mooroondu FC', 'Bethania Rams', 'Ridge Hills', 'Willowburn FC', 'Slacks Creek',
        'Jimboomba United', 'QUT FC', 'Tarragindi Tigers', 'Park Ridge', 'Holland Park Hawks',
      ],
    },
    {
      name: 'QPL 6 Metro',
      teams: [
        'Acacia Ridge', 'Westside Grovely', 'Teviot Downs', 'Bribie Island Tigers', 'Oxley United', 'Brighton Bulldogs',
        'ACU', 'Olympic FC', 'Pine Hills', 'Caboolture Sports FC',
      ],
    },
  ],
  links: [
    'promotion-relegation',
    'promotion-relegation',
    'play-offs',
    'promotion-relegation',
    'promotion-relegation',
    'promotion-relegation',
  ],
  playOffLadders: [
    { region: 'Metro', leagues: 'QPL 3 to 6' },
    { region: 'South Coast', leagues: 'QPL 3 and 4' },
    { region: 'Sunshine Coast', leagues: 'QPL 3' },
    { region: 'Darling Downs', leagues: 'QPL 3' },
  ],
};

export const DECLARATIONS: readonly LeagueDeclaration[] = [FQ_2027_SEQ_METRO_MEN];

/** The declarations that sit beside a region's season calendar. */
export function declarationsFor(calendarId: string): readonly LeagueDeclaration[] {
  return DECLARATIONS.filter((d) => d.calendarId === calendarId);
}

/** Every team place in the declaration. */
export function teamCount(d: LeagueDeclaration): number {
  return d.leagues.reduce((n, l) => n + l.teams.length, 0);
}

/**
 * Names printed in more than one league, with each league they appear in.
 * A club can field a team in two leagues; the declaration only prints the
 * name, so the page says the name appears twice and no more.
 */
export function namesInSeveralLeagues(d: LeagueDeclaration): readonly { readonly name: string; readonly leagues: readonly string[] }[] {
  const seen = new Map<string, string[]>();
  for (const l of d.leagues) {
    for (const t of l.teams) seen.set(t, [...(seen.get(t) ?? []), l.name]);
  }
  return [...seen].filter(([, leagues]) => leagues.length > 1).map(([name, leagues]) => ({ name, leagues }));
}
