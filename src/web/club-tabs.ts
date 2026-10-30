/**
 * The club settings' tabs (scope 127), after the Superdesign draft *Tactics
 * Board Settings*: which tabs there are, which one a URL asks for, and the
 * URL of each. A tab the URL does not name, or names wrongly, is Profile.
 */
export const CLUB_TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'teams', label: 'Teams and competitions' },
  { id: 'committee', label: 'Committee' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'export', label: 'Data export' },
  { id: 'licence', label: 'Licence' },
] as const;

export type ClubTab = (typeof CLUB_TABS)[number]['id'];

export function clubTab(requested: string | undefined): ClubTab {
  return CLUB_TABS.find((t) => t.id === requested)?.id ?? 'profile';
}

/** `/registrar/club?tab=…`, keeping the season the page is showing. */
export function clubTabHref(tab: ClubTab, seasonId: string | null): string {
  const params = new URLSearchParams();
  if (tab !== 'profile') params.set('tab', tab);
  if (seasonId !== null) params.set('season', seasonId);
  const query = params.toString();
  return query === '' ? '/registrar/club' : `/registrar/club?${query}`;
}
