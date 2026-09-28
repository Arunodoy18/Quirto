import type { LogRow } from './useCommandCenter';

const COLORS: Record<string, string> = {
  TRAFFIC_UPDATE: 'var(--warn)', VEHICLE_UPDATE: 'var(--text-3)', INCIDENT_CREATED: 'var(--danger)', INCIDENT_UPDATED: 'var(--road-congested)',
  OPTIMIZATION_STARTED: 'var(--accent)', OPTIMIZATION_ITERATION: 'var(--route-alt)', OPTIMIZATION_COMPLETE: 'var(--ok)', ROUTE_UPDATED: 'var(--ok)', SIMULATION_STATE: 'var(--text-3)'
};

export function EventStream({ rows }: { rows: LogRow[] }) {
  return (
    <>
      <div className="panel-head"><span className="panel-title">Event stream</span><span className="panel-meta">ws-ready</span></div>
      <div style={{ flex: 1, overflow: 'hidden', padding: '6px 12px' }}>
        {rows.length === 0 && <span className="empty" style={{ padding: '8px 0', display: 'block' }}>No events yet.</span>}
        {rows.slice(0, 9).map((r) => (
          <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '58px 1fr', gap: 6, padding: '4px 0', borderBottom: '1px solid var(--line-soft)' }}>
            <span className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{r.t}</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
              <span className="mono" style={{ fontSize: 10, fontWeight: 600, color: COLORS[r.type] ?? 'var(--text-3)' }}>{r.type}</span>
              <span style={{ fontSize: 11.5, color: 'var(--text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.msg}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
