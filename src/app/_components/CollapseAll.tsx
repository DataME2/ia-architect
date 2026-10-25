'use client';

/**
 * Folds or opens every `<details>` inside one container (scope 113): a long
 * list of team dugouts in one tap. Each section still opens on its own.
 */
export function CollapseAll({ target, label }: { readonly target: string; readonly label: string }) {
  const setAll = (open: boolean) => {
    for (const d of document.querySelectorAll<HTMLDetailsElement>(`#${target} details`)) d.open = open;
  };
  return (
    <p className="collapse-all" role="group" aria-label={label}>
      <button type="button" className="secondary" onClick={() => setAll(true)}>
        Expand all
      </button>
      <button type="button" className="secondary" onClick={() => setAll(false)}>
        Collapse all
      </button>
    </p>
  );
}
