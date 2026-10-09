'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { FormNotice } from './FormNotice.tsx';

/**
 * An official's week as a grid of days × parts of the day (scope 90, BR174).
 * Each cell is a toggle; saving sends the whole week, which the server turns
 * into windows and replaces atomically.
 *
 * Presentational: the days, slots, starting cells and the server action all
 * arrive as props. The cells are local state until saved.
 */
export interface AvailabilityGridProps {
  readonly days: readonly { readonly weekday: number; readonly label: string }[];
  readonly slots: readonly { readonly key: string; readonly label: string; readonly from: string; readonly to: string }[];
  readonly initialCells: readonly string[];
  /** Some declared window does not line up with the slots; saving rounds it. */
  readonly custom: boolean;
  /** Hidden fields sent with the grid, e.g. the club. */
  readonly fields: Readonly<Record<string, string>>;
  readonly action: (
    previous: AvailabilityGridResult,
    formData: FormData,
  ) => Promise<AvailabilityGridResult>;
  /** Why the grid cannot be saved now (no season), or null. */
  readonly disabledReason?: string | null;
}

export type AvailabilityGridResult =
  | { readonly status: 'idle' }
  | { readonly status: 'ok'; readonly message: string }
  | { readonly status: 'error'; readonly message: string };

const IDLE: AvailabilityGridResult = { status: 'idle' };

export function AvailabilityGrid({ days, slots, initialCells, custom, fields, action, disabledReason = null }: AvailabilityGridProps) {
  const [cells, setCells] = React.useState<ReadonlySet<string>>(() => new Set(initialCells));
  const [state, formAction, pending] = React.useActionState(action, IDLE);
  const saved = React.useMemo(() => new Set(initialCells), [initialCells]);
  const dirty = cells.size !== saved.size || [...cells].some((c) => !saved.has(c));

  const toggle = (key: string) =>
    setCells((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const setDays = (weekdays: readonly number[]) =>
    setCells(new Set(weekdays.flatMap((d) => slots.map((s) => `${d}:${s.key}`))));

  return (
    <form action={formAction} className="font-sans">
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <input type="hidden" name="cells" value={JSON.stringify([...cells])} />

      {state.status !== 'idle' && (
        <FormNotice tone={state.status === 'ok' ? 'success' : 'error'}>{state.message}</FormNotice>
      )}
      {custom && (
        <p className="m-0 mb-ds-3 text-sm text-warning-foreground bg-warning rounded-sm px-ds-3 py-ds-2">
          Some times you declared do not match these blocks. Saving the grid rounds them to the blocks shown.
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-1 text-sm">
          <caption className="sr-only">Your availability this season, by day and part of the day</caption>
          <thead>
            <tr>
              <th scope="col" className="text-left font-mono text-[11px] uppercase tracking-wider text-muted px-1">
                Day
              </th>
              {slots.map((s) => (
                <th key={s.key} scope="col" className="font-mono text-[11px] uppercase tracking-wider text-muted px-1">
                  {s.label}
                  <span className="block normal-case tracking-normal text-[10px]">
                    {s.from}–{s.to}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr key={d.weekday}>
                <th scope="row" className="text-left font-semibold text-foreground pr-ds-2 whitespace-nowrap">
                  {d.label}
                </th>
                {slots.map((s) => {
                  const key = `${d.weekday}:${s.key}`;
                  const on = cells.has(key);
                  return (
                    <td key={s.key} className="p-0">
                      <button
                        type="button"
                        aria-pressed={on}
                        aria-label={`${d.label} ${s.label.toLowerCase()}: ${on ? 'available' : 'not available'}`}
                        onClick={() => toggle(key)}
                        disabled={disabledReason !== null}
                        className={cn(
                          // globals.css paints every <button> in the accent and lifts it
                          // on hover; a cell is a toggle, so both are overridden.
                          'w-full min-h-[44px] rounded-sm border text-xs font-semibold shadow-none transition-colors duration-180',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
                          on
                            ? 'bg-success text-success-foreground border-success-indicator hover:bg-success! hover:text-success-foreground!'
                            : 'bg-surface text-muted border-border hover:bg-surfaceSubtle! hover:text-foreground!',
                        )}
                      >
                        {on ? 'Available' : '—'}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-ds-2 mt-ds-3">
        <button
          type="submit"
          disabled={pending || !dirty || disabledReason !== null}
          className="min-h-[44px] px-ds-4 rounded-sm text-sm font-semibold"
        >
          {pending ? 'Saving…' : dirty ? 'Save my week' : 'Saved'}
        </button>
        <button
          type="button"
          onClick={() => setDays([6, 0])}
          disabled={disabledReason !== null}
          className="min-h-[44px] px-ds-3 rounded-sm text-sm bg-surface text-foreground border border-border-strong shadow-none hover:bg-surfaceSubtle! hover:text-foreground!"
        >
          Weekends only
        </button>
        <button
          type="button"
          onClick={() => setCells(new Set())}
          disabled={disabledReason !== null}
          className="min-h-[44px] px-ds-3 rounded-sm text-sm bg-surface text-foreground border border-border-strong shadow-none hover:bg-surfaceSubtle! hover:text-foreground!"
        >
          Clear
        </button>
        {disabledReason !== null && <span className="text-sm text-muted">{disabledReason}</span>}
      </div>
    </form>
  );
}
