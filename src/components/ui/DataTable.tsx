import * as React from 'react';
import { cn } from '@/lib/utils';

export interface DataTableColumn<T = any> {
  /** Unique key corresponding to row data property or column id */
  key: string;
  /** Header title or custom header element */
  header: React.ReactNode;
  /** Custom cell accessor function */
  accessor?: (row: T, index: number) => React.ReactNode;
  /** Column text alignment */
  align?: 'left' | 'center' | 'right';
  /** Applies monospace tabular figures styling for numeric/financial data */
  isNumeric?: boolean;
  /** Explicit column width string (e.g. '120px' or '25%') */
  width?: string;
  /** Enables click-to-sort functionality on header */
  sortable?: boolean;
}

export interface DataTableProps<T = any> extends React.HTMLAttributes<HTMLDivElement> {
  /** Array of column configurations */
  columns?: DataTableColumn<T>[];
  /** Data array to render when using structured prop mode */
  data?: T[];
  /** Unique key extractor function for row items */
  keyExtractor?: (row: T, index: number) => string | number;
  /** Density variant controlling vertical cell padding */
  density?: 'compact' | 'md' | 'comfortable';
  /** Alternates row background shades */
  striped?: boolean;
  /** Applies row hover background highlight */
  hoverable?: boolean;
  /** Displays borders around table and cells */
  bordered?: boolean;
  /** Displays a skeleton or loading state overlay */
  isLoading?: boolean;
  /** Content to display when `data` array is empty */
  emptyMessage?: React.ReactNode;
  /** Accessible table title caption */
  caption?: string;
  /** Currently sorted column key */
  sortColumn?: string;
  /** Current sort direction */
  sortDirection?: 'asc' | 'desc';
  /** Callback fired when a sortable header is clicked */
  onSort?: (columnKey: string, direction: 'asc' | 'desc') => void;
  /** Callback fired when a table row is clicked */
  onRowClick?: (row: T, index: number) => void;
  /** Children elements for custom JSX table markup */
  children?: React.ReactNode;
}

const densityPaddingStyles: Record<NonNullable<DataTableProps['density']>, string> = {
  compact: 'py-ds-2 px-ds-3 text-xs',
  md: 'py-ds-3 px-ds-4 text-sm',
  comfortable: 'py-ds-4 px-ds-5 text-sm',
};

export function DataTable<T = any>({
  columns,
  data,
  keyExtractor,
  density = 'md',
  striped = false,
  hoverable = true,
  bordered = true,
  isLoading = false,
  emptyMessage = 'No data available',
  caption,
  sortColumn,
  sortDirection = 'asc',
  onSort,
  onRowClick,
  className,
  children,
  ...props
}: DataTableProps<T>) {
  const handleHeaderClick = (col: DataTableColumn<T>) => {
    if (!col.sortable || !onSort) return;
    const isSameCol = sortColumn === col.key;
    const nextDirection = isSameCol && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(col.key, nextDirection);
  };

  return (
    <div
      className={cn(
        'w-full overflow-hidden rounded border border-border bg-surface shadow-xs text-foreground',
        className
      )}
      {...props}
    >
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm font-sans">
          {caption && <caption className="sr-only">{caption}</caption>}

          {children ? (
            children
          ) : (
            <>
              {columns && columns.length > 0 && (
                <thead>
                  <tr className="bg-surfaceSubtle border-b border-border">
                    {columns.map((col) => {
                      const isSorted = sortColumn === col.key;
                      const isClickable = col.sortable && Boolean(onSort);

                      const label = (
                        <div
                          className={cn(
                            'inline-flex items-center gap-ds-1',
                            col.align === 'center' && 'justify-center',
                            (col.align === 'right' || col.isNumeric) && 'justify-end w-full'
                          )}
                        >
                          <span>{col.header}</span>
                          {col.sortable && (
                            // The glyph is decoration; the state is announced by aria-sort.
                            <span className="text-muted/60 shrink-0" aria-hidden="true">
                              {isSorted ? (
                                sortDirection === 'asc' ? '▲' : '▼'
                              ) : (
                                <span className="opacity-40">↕</span>
                              )}
                            </span>
                          )}
                        </div>
                      );

                      return (
                        <th
                          key={col.key}
                          scope="col"
                          style={{ width: col.width }}
                          aria-sort={
                            isSorted
                              ? sortDirection === 'asc' ? 'ascending' : 'descending'
                              : col.sortable ? 'none' : undefined
                          }
                          className={cn(
                            'font-semibold text-xs uppercase tracking-wider text-muted select-none',
                            densityPaddingStyles[density],
                            col.align === 'center' && 'text-center',
                            col.align === 'right' && 'text-right',
                            col.isNumeric && 'font-mono tabular-nums text-right',
                            isClickable && 'hover:text-foreground transition-colors'
                          )}
                        >
                          {/* A real button, so sorting works from the keyboard too. */}
                          {isClickable ? (
                            <button
                              type="button"
                              onClick={() => handleHeaderClick(col)}
                              className="w-full bg-transparent border-0 p-0 m-0 text-inherit font-inherit uppercase tracking-inherit cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
                            >
                              {label}
                            </button>
                          ) : (
                            label
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
              )}

              <tbody className="divide-y divide-border/60">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={columns?.length || 1}
                      className={cn('text-center text-muted py-ds-6 font-medium')}
                    >
                      <div className="inline-flex items-center gap-ds-2 text-muted">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        <span>Loading data...</span>
                      </div>
                    </td>
                  </tr>
                ) : data && data.length > 0 ? (
                  data.map((row, index) => {
                    const rowKey = keyExtractor ? keyExtractor(row, index) : index;
                    const isClickable = Boolean(onRowClick);

                    return (
                      <tr
                        key={rowKey}
                        onClick={() => onRowClick?.(row, index)}
                        className={cn(
                          'transition-colors duration-120',
                          striped && index % 2 === 1 && 'bg-surfaceSubtle/40',
                          hoverable && 'hover:bg-surfaceSubtle/80',
                          isClickable && 'cursor-pointer'
                        )}
                      >
                        {columns?.map((col) => {
                          const rawValue = col.accessor
                            ? col.accessor(row, index)
                            : (row as any)?.[col.key];

                          return (
                            <td
                              key={col.key}
                              className={cn(
                                'align-middle text-foreground',
                                densityPaddingStyles[density],
                                col.align === 'center' && 'text-center',
                                col.align === 'right' && 'text-right',
                                (col.isNumeric || typeof rawValue === 'number') &&
                                  'font-mono tabular-nums'
                              )}
                            >
                              {rawValue}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={columns?.length || 1}
                      className={cn('text-center text-muted-foreground py-ds-6', densityPaddingStyles[density])}
                    >
                      {emptyMessage}
                    </td>
                  </tr>
                )}
              </tbody>
            </>
          )}
        </table>
      </div>
    </div>
  );
}

/* --- Compound Table Subcomponents --- */

export interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  isNumeric?: boolean;
}

export const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ isNumeric = false, className, children, ...props }, ref) => (
    <th
      ref={ref}
      scope="col"
      className={cn(
        'bg-surfaceSubtle font-semibold text-xs uppercase tracking-wider text-muted py-ds-3 px-ds-4 border-b border-border select-none align-middle',
        isNumeric && 'font-mono tabular-nums text-right',
        className
      )}
      {...props}
    >
      {children}
    </th>
  )
);
TableHead.displayName = 'TableHead';

export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  isNumeric?: boolean;
}

export const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ isNumeric = false, className, children, ...props }, ref) => (
    <td
      ref={ref}
      className={cn(
        'py-ds-3 px-ds-4 text-sm align-middle text-foreground border-b border-border/60',
        isNumeric && 'font-mono tabular-nums text-right',
        className
      )}
      {...props}
    >
      {children}
    </td>
  )
);
TableCell.displayName = 'TableCell';

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  hoverable?: boolean;
  striped?: boolean;
}

export const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ hoverable = true, striped = false, className, children, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        'transition-colors duration-120 border-b border-border/60 last:border-b-0',
        striped && 'odd:bg-surface even:bg-surfaceSubtle/30',
        hoverable && 'hover:bg-surfaceSubtle/80',
        className
      )}
      {...props}
    >
      {children}
    </tr>
  )
);
TableRow.displayName = 'TableRow';