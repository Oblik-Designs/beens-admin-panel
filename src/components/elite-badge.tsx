/**
 * Elite badge — gold-gradient pill with animated sweep, ported from
 * beens-app-ionic-react/src/components/EliteBadge.tsx.
 */
export function EliteBadge({ className }: { className?: string }) {
  return (
    <span className={`elite-badge ${className ?? ''}`.trim()}>
      <img
        src="/images/elite.svg"
        alt=""
        aria-hidden="true"
        className="elite-badge__icon"
      />
      <span className="elite-badge__text">Elite</span>
    </span>
  )
}
