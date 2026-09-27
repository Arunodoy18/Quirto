/** Horizontal labelled bars. */
export interface Bar { label: string; value: number; display?: string; color?: string; muted?: boolean }

export function BarList({ bars, max, height = 12, labelWidth = 70 }: { bars: Bar[]; max?: number; height?: number; labelWidth?: number }) {
  const m = max ?? Math.max(...bars.map((b) => b.value), 1e-9);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {bars.map((b) => (
        <div key={b.label} style={{ display: 'grid', gridTemplateColumns: `${labelWidth}px 1fr 64px`, alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12.5, color: b.muted ? 'var(--muted)' : 'var(--text-2)' }}>{b.label}</span>
          <div style={{ height, background: 'var(--field)' }}>
            <div style={{ height, width: `${Math.min(100, (b.value / m) * 100)}%`, background: b.muted ? 'var(--line-strong)' : b.color ?? 'var(--route-alt)', transition: 'width 0.35s' }} />
          </div>
          <span className="mono" style={{ fontSize: 12, textAlign: 'right' }}>{b.display ?? b.value}</span>
        </div>
      ))}
    </div>
  );
}
