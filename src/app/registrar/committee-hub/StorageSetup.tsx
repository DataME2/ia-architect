'use client';

import { useEffect, useState } from 'react';

const STEPS = [
  {
    title: 'Open the committee’s SharePoint site',
    body: 'Use the site the committee already works in, or create one, with a document library for minutes, agendas and reports.',
  },
  {
    title: 'Give the committee access there',
    body: 'The hub holds only a link. SharePoint’s own permissions decide who can open each file, so add the committee members to the site.',
  },
  {
    title: 'Copy the two addresses',
    body: 'Open the site, then the library, and copy each address from the browser’s address bar.',
  },
  {
    title: 'Switch the hub to SharePoint',
    body: 'In Hub settings below, choose SharePoint and paste both addresses. Only the IT Manager can.',
  },
  {
    title: 'File each document as a link',
    body: 'Save it in SharePoint as usual, then file it here with its title, kind and meeting, so the committee finds it beside its term and resolution.',
  },
] as const;

const KEY = 'pp-hub-storage-steps';

/**
 * How to set up the club's own storage (scope 129): the SharePoint link mode,
 * in five steps the IT Manager can tick off as they go. A tick draws itself
 * in chalk. The ticks are remembered in this browser only (a convenience,
 * never a record), and the steps read the same without script.
 */
export function StorageSetup() {
  const [done, setDone] = useState<readonly number[]>([]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? '[]') as unknown;
      if (Array.isArray(saved)) setDone(saved.filter((n): n is number => typeof n === 'number'));
    } catch {
      // Storage blocked or unreadable: start with nothing ticked.
    }
  }, []);

  const toggle = (i: number) => {
    const next = done.includes(i) ? done.filter((n) => n !== i) : [...done, i];
    setDone(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Not remembered; the tick still shows for this visit.
    }
  };

  return (
    <ol className="setup-steps">
      {STEPS.map((s, i) => {
        const on = done.includes(i);
        return (
          <li key={s.title} className={on ? 'is-done' : undefined}>
            <button type="button" className="setup-tick" aria-pressed={on} onClick={() => toggle(i)}>
              <span className="sr-only">{on ? `Step ${i + 1} done` : `Mark step ${i + 1} done`}</span>
              <span className="setup-n" aria-hidden="true">
                {i + 1}
              </span>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                {on && <path d="M5 13l4 4L19 7" pathLength={1} />}
              </svg>
            </button>
            <div>
              <b>{s.title}</b>
              <p>{s.body}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
