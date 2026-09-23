import Link from 'next/link'

/**
 * HistoryPagination — prev/next pager for the history feeds. Parents build
 * the hrefs (preserving tab/search/action params); null hides the button.
 */
export function HistoryPagination({
  page,
  totalPages,
  prevHref,
  nextHref,
}: {
  page: number
  totalPages: number
  prevHref: string | null
  nextHref: string | null
}) {
  if (totalPages <= 1) return null

  const btn =
    'rounded-full border border-border bg-white px-4 py-1.5 text-sm font-medium text-eu-blue hover:bg-bg-soft transition-colors'
  const btnDisabled =
    'rounded-full border border-border bg-white px-4 py-1.5 text-sm font-medium text-muted opacity-50'

  return (
    <nav aria-label="History pages" className="mt-6 flex items-center justify-center gap-4">
      {prevHref ? (
        <Link href={prevHref} className={btn}>
          ← Newer
        </Link>
      ) : (
        <span aria-hidden className={btnDisabled}>
          ← Newer
        </span>
      )}
      <span className="text-sm text-muted">
        Page {page} of {totalPages}
      </span>
      {nextHref ? (
        <Link href={nextHref} className={btn}>
          Older →
        </Link>
      ) : (
        <span aria-hidden className={btnDisabled}>
          Older →
        </span>
      )}
    </nav>
  )
}
