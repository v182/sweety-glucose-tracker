export function Brand({ compact = false }) {
  return (
    <div className="brand">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 40 40">
          <path d="M20 5C16 11 10 17 10 23a10 10 0 0 0 20 0c0-6-6-12-10-18Z" fill="currentColor" />
          <path
            d="m14 23 4 4 8-10"
            fill="none"
            stroke="#16857b"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {!compact && (
        <span>
          sweety<span className="brand-dot">.</span>
        </span>
      )}
    </div>
  );
}
