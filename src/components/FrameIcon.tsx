/** Figma's frame glyph (#), used as the site mark and in frame labels. */
export default function FrameIcon({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden>
      <path d="M5 1.5v13M11 1.5v13M1.5 5h13M1.5 11h13" fill="none" stroke="currentColor" strokeWidth="1.3" />
      {filled && <rect x="5" y="5" width="6" height="6" fill="currentColor" />}
    </svg>
  )
}
