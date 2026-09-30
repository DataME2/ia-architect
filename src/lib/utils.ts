/**
 * Join class names, skipping the falsy ones a `condition && 'class'` leaves.
 *
 * The design-system components (src/components/ui) import this as
 * `@/lib/utils`, the shadcn convention. No clsx or tailwind-merge: every
 * call passes plain strings or conditionals, so conflicting utilities are
 * not merged — the last one in the stylesheet wins, as in plain CSS.
 */
export function cn(...classes: ReadonlyArray<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
