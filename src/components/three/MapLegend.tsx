import { ROAD_STATES } from '@/types/domain';
import { ROAD_COLOR } from '@/lib/format';

export function MapLegend() {
  return (
    <div className="overlay" style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '7px 10px' }}>
      {ROAD_STATES.map((s) => (
        <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 14, height: 3, background: ROAD_COLOR[s] }} />
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)' }}>{s}</span>
        </span>
      ))}
    </div>
  );
}
