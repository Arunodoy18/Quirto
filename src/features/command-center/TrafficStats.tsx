import type { TrafficStats as Stats } from '@/types/domain';
import { ROAD_STATES } from '@/types/domain';
import { ROAD_COLOR, clockStr } from '@/lib/format';

const SHORT = { FREE: 'FREE', MODERATE: 'MOD', CONGESTED: 'CONG', SEVERE: 'SEV', CLOSED: 'CLSD' } as const;

export function TrafficStats({ stats }: { stats: Stats }) {
  const total = ROAD_STATES.reduce((a, s) => a + stats.stateCounts[s], 0) || 1;
  const tiles: Array<[string, string, string]> = [
    ['Vehicles', String(stats.vehicles), 'in network'],
    ['Avg speed', String(stats.avgSpeedKmh), 'km/h'],
    ['Congested', `${stats.congestedPct}%`, 'of links'],
    ['Utilization', `${stats.utilizationPct}%`, 'network'],
    ['Incidents', String(stats.incidents), 'active'],
    ['Sim clock', clockStr(stats.clock), '20× time']
  ];
  return (
    <>
      <div className="panel-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }}>
        {tiles.map(([k, v, u]) => (
          <div key={k} className="stat"><span className="stat-k">{k}</span><span className="stat-v">{v}</span><span className="stat-u">{u}</span></div>
        ))}
      </div>
      <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 7, borderBottom: '1px solid var(--line)' }}>
        <span className="label">Road state distribution</span>
        <div style={{ display: 'flex', height: 8, background: 'var(--field)' }}>
          {ROAD_STATES.map((s) => <span key={s} style={{ width: `${(stats.stateCounts[s] / total) * 100}%`, background: ROAD_COLOR[s], transition: 'width 0.4s' }} />)}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {ROAD_STATES.map((s) => (
            <span key={s} className="mono" style={{ fontSize: 10, color: 'var(--text-3)' }}><span style={{ color: ROAD_COLOR[s] }}>■</span> {SHORT[s]} {stats.stateCounts[s]}</span>
          ))}
        </div>
      </div>
    </>
  );
}
