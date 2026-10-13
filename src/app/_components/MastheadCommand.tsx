'use client';

import { CommandBar } from '../../components/ui/CommandBar.tsx';
import { commandResults } from '../../web/command.ts';

/**
 * The masthead's command bar (scope 93). A client island in a prerendered
 * layout: it makes no auth call and fetches nothing, it only maps what is
 * typed to pages that already exist, each of which decides who may see it.
 */
export function MastheadCommand() {
  return <CommandBar results={(q) => commandResults(q)} />;
}
