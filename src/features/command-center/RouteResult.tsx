import type { RouteSet } from '@/types/domain';
import { LEVEL_COLOR } from '@/lib/format';

export function RouteResult({ routes, show, busy }: { routes: RouteSet | null; show: boolean; busy: boolean }) {
  const p = show ? routes?.primary : null;
  return (
    <div style={{ borderTop: '1px solid var(--line)', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div className="panel-head">
        <span className="panel-title">Optimized route</span>
        <span className="panel-meta">{p && routes?.rerouted ? 'Rerouted · demo' : routes?.source === 'live' ? 'Live' : 'Demo data'}</span>
      </div>
      {!p ? (
        <div className="empty">
          {routes?.reason === 'same' ? 'Origin and destination are the same location.'
            : routes?.reason === 'unreachable' ? 'No feasible route under current closures.'
            : busy ? 'Optimization in progress…'
            : 'No route computed yet. Choose origin, destination, vehicle and profile, then run Optimize route — or start the demo sequence.'}
        </div>
      ) : (
        <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 9 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px 6px' }}>
            {[
              ['ETA', `${p.etaMin} min`, 'var(--text-strong)'],
              ['Distance', `${p.distanceKm.toFixed(1)} km`, 'var(--text-strong)'],
              ['Congestion', p.congestion, LEVEL_COLOR[p.congestion]],
              ['Risk', p.risk, LEVEL_COLOR[p.risk]],
              ['Fuel est.', `${p.fuelL.toFixed(2)} L`, 'var(--text-strong)'],
              ['Total cost', p.totalCost.toFixed(3), 'var(--accent)']
            ].map(([k, v, c]) => (
              <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>{k}</span>
                <span className="mono" style={{ fontSize: 14, fontWeight: 600, color: c }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-3)', lineHeight: 1.35 }}>via {p.streets.slice(0, 4).join(' → ')}{p.streets.length > 4 ? ' …' : ''}</div>
          <div>
            {routes!.alternatives.map((a) => (
              <div key={a.id} className="mono" style={{ display: 'grid', gridTemplateColumns: '48px 1fr 1fr 1fr', fontSize: 11, color: 'var(--text-3)', padding: '4px 0', borderTop: '1px solid var(--line-soft)' }}>
                <span style={{ color: 'var(--route-alt)' }}>ALT {a.rank}</span><span>{a.etaMin} min</span><span>{a.distanceKm.toFixed(1)} km</span><span style={{ textAlign: 'right' }}>{a.totalCost.toFixed(3)}</span>
              </div>
            ))}
          </div>
          {routes!.replaced && (
            <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)', padding: '6px 8px', background: 'var(--field)', border: '1px solid #303238', display: 'flex', justifyContent: 'space-between' }}>
              <span>Old route <span style={{ color: 'var(--danger-text)' }}>{routes!.replaced.etaMin} min</span></span>
              <span>Rerouted <span style={{ color: 'var(--ok)' }}>{p.etaMin} min</span></span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
