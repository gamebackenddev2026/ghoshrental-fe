'use client'

import styles from './productSearch.module.css'

export type ResultsPaginationProps = {
  totalPages: number
  activePage: number
  onPageChange: (page: number) => void
}

/** Windowed page indices with -1 marking an ellipsis gap (same logic as Angular search). */
function buildPaginationItems(totalPages: number, activePage: number): number[] {
  return Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((n) => {
      if (totalPages <= 7) return true
      if (n === 1 || n === totalPages) return true
      return Math.abs(n - activePage) <= 1
    })
    .reduce<number[]>((acc, n) => {
      if (acc.length && n - acc[acc.length - 1] > 1) acc.push(-1)
      acc.push(n)
      return acc
    }, [])
}

/**
 * Shared fleet / lease pagination — matches product search (circle prev/next + number row).
 */
export function ResultsPagination({ totalPages, activePage, onPageChange }: ResultsPaginationProps) {
  if (totalPages <= 1) return null

  const items = buildPaginationItems(totalPages, activePage)

  return (
    <nav aria-label='Page navigation'>
      <ul className={styles.pagination}>
        <li data-disabled={activePage === 1}>
          <button
            type='button'
            className={styles.circleBtn}
            disabled={activePage === 1}
            onClick={() => onPageChange(activePage - 1)}
            aria-label='Previous Page'
          >
            <svg
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth={2}
              strokeLinecap='round'
              strokeLinejoin='round'
              aria-hidden='true'
            >
              <path d='M19 12H5' />
              <path d='m12 19-7-7 7-7' />
            </svg>
          </button>
        </li>

        {items.map((n, idx) =>
          n === -1 ? (
            <li key={`gap-${idx}`} aria-hidden>
              <span className={styles.pageGap}>…</span>
            </li>
          ) : (
            <li key={n}>
              <button
                type='button'
                className={styles.numberBtn}
                data-active={n === activePage}
                onClick={() => onPageChange(n)}
                aria-label={`Page ${n}`}
              >
                {n}
              </button>
            </li>
          )
        )}

        <li data-disabled={activePage === totalPages}>
          <button
            type='button'
            className={styles.circleBtn}
            disabled={activePage === totalPages}
            onClick={() => onPageChange(activePage + 1)}
            aria-label='Next Page'
          >
            <svg
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth={2}
              strokeLinecap='round'
              strokeLinejoin='round'
              aria-hidden='true'
            >
              <path d='M5 12h14' />
              <path d='m12 5 7 7-7 7' />
            </svg>
          </button>
        </li>
      </ul>
    </nav>
  )
}
