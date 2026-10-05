import clsx from 'clsx'

/**
 * Letters roll vertically on hover (pure CSS, staggered with a per-char custom property).
 * The parent needs the `group` class (or use `asGroup`).
 */
export default function RollText({ text, className, asGroup }: { text: string; className?: string; asGroup?: boolean }) {
  const chars = Array.from(text)
  return (
    <span className={clsx('relative inline-flex overflow-clip align-top', asGroup && 'group', className)} aria-label={text}>
      <span aria-hidden className="inline-flex">
        {chars.map((c, i) => (
          <span
            key={i}
            className="inline-block whitespace-pre transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] group-hover:-translate-y-full"
            style={{ transitionDelay: `${i * 18}ms` }}
          >
            {c}
          </span>
        ))}
      </span>
      <span aria-hidden className="absolute inset-0 inline-flex">
        {chars.map((c, i) => (
          <span
            key={i}
            className="inline-block translate-y-full whitespace-pre transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] group-hover:translate-y-0"
            style={{ transitionDelay: `${i * 18}ms` }}
          >
            {c}
          </span>
        ))}
      </span>
    </span>
  )
}
