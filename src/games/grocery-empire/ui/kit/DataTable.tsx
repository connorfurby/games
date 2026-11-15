import type { ReactNode } from 'react'
import { cx } from './hooks'

export interface Column<T> {
  key: string
  header: ReactNode
  render: (row: T, index: number) => ReactNode
  align?: 'start' | 'end' | 'center'
  /** CSS width, e.g. "6rem". */
  width?: string
}

/** Compact table: sticky header, tabular numbers, scrolls inside `maxHeight`. */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  maxHeight,
  empty,
  caption,
  className,
}: {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T, index: number) => string
  maxHeight?: number | string
  empty?: ReactNode
  caption?: string
  className?: string
}) {
  return (
    <div className={cx('gk-table-wrap', className)} style={maxHeight != null ? { maxHeight } : undefined}>
      <table className="gk-table">
        {caption ? <caption className="gk-sr">{caption}</caption> : null}
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" data-align={c.align} style={c.width ? { width: c.width } : undefined}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="gk-table__empty">
                {empty ?? 'Nothing here yet.'}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={rowKey(row, i)}>
                {columns.map((c) => (
                  <td key={c.key} data-align={c.align}>
                    {c.render(row, i)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export { Sparkline } from '../components/Sparkline'
