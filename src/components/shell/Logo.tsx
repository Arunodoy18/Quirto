export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" fill="none" aria-hidden="true">
      <path d="M5 23L12 9l7 9 5-12" stroke="var(--accent)" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="5" cy="23" r="2.6" fill="var(--bg-chrome)" stroke="var(--text)" strokeWidth="1.6" />
      <circle cx="12" cy="9" r="2.6" fill="var(--bg-chrome)" stroke="var(--text)" strokeWidth="1.6" />
      <circle cx="19" cy="18" r="2.6" fill="var(--bg-chrome)" stroke="var(--text)" strokeWidth="1.6" />
      <circle cx="24" cy="6" r="3" fill="var(--accent)" />
    </svg>
  );
}
