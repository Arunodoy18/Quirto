import { useEffect, useMemo, useState } from 'react';
import type { CameraMode, ProfileKey, RouteAlternative, RouteSet, VehicleType, Weights } from '@/types/domain';
import { routeService, simulationService } from '@/services';
import { useWorld } from '@/hooks/useWorld';
import { useElementWidth } from '@/hooks/useElementWidth';
import { PROFILE_WEIGHTS } from '@/mock/TrafficEngine';
import { PLACES } from '@/mock/network';
import { LEVEL_COLOR, PROFILES, SCENARIOS, VEHICLES } from '@/lib/format';
import { ThreeCity } from '@/components/three/ThreeCity';
import './route-optimization.css';

const KEYS: Array<[keyof Weights, string, string]> = [
  ['time', 'Travel time', 'var(--accent)'], ['dist', 'Distance', 'var(--text-2)'], ['cong', 'Congestion', 'var(--road-congested)'], ['fuel', 'Fuel', 'var(--ok)'], ['risk', 'Risk', 'var(--warn)']
];
const pct = (w: Weights) => { const s = KEYS.reduce((a, [k]) => a + w[k], 0) || 1; return Object.fromEntries(KEYS.map(([k]) => [k, w[k] / s])) as unknown as Weights; };
const toSliders = (w: Weights): Weights => ({ time: w.time * 100, dist: w.dist * 100, cong: w.cong * 100, fuel: w.fuel * 100, risk: w.risk * 100 });

function Scatter({ rows }: { rows: Array<{ r: RouteAlternative | RouteSet['primary']; kind: 'primary' | 'alternative' | 'rejected' }> }) {
  const [ref, W] = useElementWidth<HTMLDivElement>(316);
  const H = 250, l = 40, r = 10, t = 10, b = 36;
  const list = rows.filter((x) => x.r);
  if (!list.length) return <div ref={ref} className="empty">No candidates.</div>;
  const ts = list.map((x) => x.r!.etaMin), rs = list.map((x) => x.r!.riskIndex);
  const t0 = Math.min(...ts) - 1, t1 = Math.max(...ts) + 1, r0 = Math.max(0, Math.min(...rs) - 0.03), r1 = Math.max(...rs) + 0.03;
  const X = (v: number) => l + ((v - t0) / (t1 - t0 || 1)) * (W - l - r), Y = (v: number) => H - b - ((v - r0) / (r1 - r0 || 1)) * (H - t - b);
  return (
    <div ref={ref}>
      <svg width={W} height={H} role="img" aria-label="Candidate routes by ETA and risk">
        <line x1={l} y1={t} x2={l} y2={H - b} stroke="var(--line-strong)" />
        <line x1={l} y1={H - b} x2={W - r} y2={H - b} stroke="var(--line-strong)" />
        <text x={l - 6} y={t + 8} textAnchor="end" fill="var(--muted)" fontSize="10" fontFamily="var(--font-mono)">{r1.toFixed(2)}</text>
        <text x={l - 6} y={H - b} textAnchor="end" fill="var(--muted)" fontSize="10" fontFamily="var(--font-mono)">{r0.toFixed(2)}</text>
        <text x={l} y={H - b + 16} fill="var(--muted)" fontSize="10" fontFamily="var(--font-mono)">{t0}</text>
        <text x={W - r} y={H - b + 16} textAnchor="end" fill="var(--muted)" fontSize="10" fontFamily="var(--font-mono)">{t1}</text>
        <text x={(l + W) / 2} y={H - 6} textAnchor="middle" fill="var(--muted)" fontSize="10" fontFamily="var(--font-mono)">ETA (min) →</text>
        <text x={12} y={(t + H - b) / 2} transform={`rotate(-90 12 ${(t + H - b) / 2})`} textAnchor="middle" fill="var(--muted)" fontSize="10" fontFamily="var(--font-mono)">Risk →</text>
        {[...list].reverse().map((x, i) => (
          <circle key={x.r!.id + i} cx={X(x.r!.etaMin) + (i % 3) * 1.5} cy={Y(x.r!.riskIndex)} r={x.kind === 'primary' ? 7 : 5}
            fill={x.kind === 'primary' ? 'var(--route-primary)' : x.kind === 'rejected' ? 'var(--panel)' : 'var(--route-alt)'}
            stroke={x.kind === 'rejected' ? 'var(--route-rejected)' : x.kind === 'primary' ? 'var(--route-primary)' : 'var(--route-alt)'} strokeWidth={1.5} />
        ))}
      </svg>
    </div>
  );
}

export default function RouteOptimization() {
  const { incidents, sim } = useWorld();
  const [origin, setOrigin] = useState('station');
  const [destination, setDestination] = useState('techpark');
  const [vehicle, setVehicle] = useState<VehicleType>('car');
  const [preset, setPreset] = useState<ProfileKey | 'custom'>('balanced');
  const [w, setW] = useState<Weights>(toSliders(PROFILE_WEIGHTS.balanced));
  const [camera, setCamera] = useState<CameraMode>('optimization');
  const [routes, setRoutes] = useState<RouteSet | null>(null);
  const weights = useMemo(() => pct(w), [w]);

  useEffect(() => {
    let alive = true;
    const id = setTimeout(() => { void routeService.evaluate({ origin, destination, vehicle, weights }).then((r) => alive && setRoutes(r)); }, 80);
    return () => { alive = false; clearTimeout(id); };
  }, [origin, destination, vehicle, weights, sim.scenario, sim.rain, incidents.length]);

  const rows = routes?.primary ? [
    { r: routes.primary, kind: 'primary' as const, role: 'PRIMARY' },
    ...routes.alternatives.map((r) => ({ r, kind: 'alternative' as const, role: `ALT ${r.rank}` })),
    ...routes.rejected.map((r) => ({ r, kind: 'rejected' as const, role: 'REJECTED' }))
  ] : [];
  const request = { origin, destination, vehicle, scenario: sim.scenario, weights: Object.fromEntries(KEYS.map(([k]) => [k, Math.round(weights[k] * 1000) / 1000])), algorithm: 'qirto', alternatives: 2, maxIterations: 100, population: 50 };

  return (
    <div className="ro">
      <section className="panel ro-left" aria-label="Request and objectives">
        <div className="panel-head"><span className="panel-title">Request</span><span className="panel-meta">Live recompute</span></div>
        <div className="panel-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="stack"><label className="label" htmlFor="ro-o">Origin</label>
            <select id="ro-o" className="field" value={origin} onChange={(e) => setOrigin(e.target.value)}>{PLACES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <div className="stack"><label className="label" htmlFor="ro-d">Destination</label>
            <select id="ro-d" className="field" value={destination} onChange={(e) => setDestination(e.target.value)}>{PLACES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <div className="stack"><label className="label" htmlFor="ro-v">Vehicle</label>
            <select id="ro-v" className="field" value={vehicle} onChange={(e) => setVehicle(e.target.value as VehicleType)}>{VEHICLES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div className="stack"><label className="label" htmlFor="ro-s">Scenario</label>
            <select id="ro-s" className="field" value={sim.scenario} onChange={(e) => simulationService.setScenario(e.target.value as never)}>{SCENARIOS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
        </div>
        <div className="panel-head" style={{ borderTop: '1px solid var(--line)' }}><span className="panel-title">Objective weights</span><span className="panel-meta">normalized Σ = 1</span></div>
        <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {PROFILES.map(([k, l]) => <button key={k} className="chip" aria-pressed={preset === k} onClick={() => { setPreset(k); setW(toSliders(PROFILE_WEIGHTS[k])); }}>{l}</button>)}
          </div>
          {KEYS.map(([k, label, color]) => (
            <div key={k} className="stack" style={{ gap: 5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label htmlFor={`w-${k}`} style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{label}</label>
                <span className="mono" style={{ fontSize: 12, color }}>{weights[k].toFixed(2)}</span>
              </div>
              <input id={`w-${k}`} type="range" min={0} max={100} value={w[k]} onChange={(e) => { setPreset('custom'); setW({ ...w, [k]: Number(e.target.value) }); }} />
            </div>
          ))}
          <div className="stack">
            <span className="label">Weight composition</span>
            <div style={{ display: 'flex', height: 8 }}>{KEYS.map(([k, , c]) => <span key={k} style={{ width: `${weights[k] * 100}%`, background: c }} />)}</div>
          </div>
          <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.5, color: 'var(--muted)' }}>
            Each link cost is a weighted sum of normalized travel time, distance, congestion, fuel and risk. {routes?.source === 'demo' ? 'In demo mode candidates come from the local network model, not the backend solver.' : ''}
          </p>
        </div>
      </section>

      <section className="ro-map" aria-label="Route map">
        <ThreeCity camera={camera} incidents={incidents} routes={routes} phase="final" origin={origin} destination={destination} showRejected />
        <div className="seg ro-float" style={{ left: 10, top: 10 }} role="group" aria-label="Camera">
          {([['optimization', 'Top-down'], ['route', 'Route'], ['overview', 'Overview']] as Array<[CameraMode, string]>).map(([k, l]) => <button key={k} aria-pressed={camera === k} onClick={() => setCamera(k)}>{l}</button>)}
        </div>
        <div className="overlay ro-float" style={{ right: 10, top: 10, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
          {[['Primary', 'var(--route-primary)', 'solid'], ['Alternative', 'var(--route-alt)', 'dashed'], ['Rejected', 'var(--route-rejected)', 'dotted']].map(([l, c, st]) => (
            <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 18, borderTop: `${l === 'Primary' ? 4 : 2}px ${st} ${c}` }} />
              <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-2)' }}>{l}</span>
            </span>
          ))}
        </div>
      </section>

      <section className="panel ro-table" aria-label="Candidate routes">
        <div className="panel-head"><span className="panel-title">Candidate routes</span><span className="panel-meta">{routes?.candidates ? `${routes.candidates} candidates · sorted by objective` : '—'}</span></div>
        {rows.length ? (
          <table className="data">
            <thead><tr><th>Role</th><th className="num">ETA</th><th className="num">Distance</th><th>Congestion</th><th>Risk</th><th className="num">Fuel</th><th className="num">Cost</th><th>Via</th></tr></thead>
            <tbody>
              {rows.map(({ r, role, kind }) => (
                <tr key={r.id} style={{ opacity: kind === 'rejected' ? 0.72 : 1 }}>
                  <td><span className="mono" style={{ fontSize: 10.5, fontWeight: 600, color: kind === 'primary' ? 'var(--route-primary)' : kind === 'alternative' ? 'var(--text-2)' : 'var(--muted)' }}>{role}</span></td>
                  <td className="num">{r.etaMin} min</td><td className="num">{r.distanceKm.toFixed(1)} km</td>
                  <td className="mono" style={{ color: LEVEL_COLOR[r.congestion] }}>{r.congestion}</td><td className="mono" style={{ color: LEVEL_COLOR[r.risk] }}>{r.risk}</td>
                  <td className="num">{r.fuelL.toFixed(2)} L</td><td className="num">{r.totalCost.toFixed(3)}</td>
                  <td style={{ fontSize: 11.5, color: 'var(--text-3)', maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.streets.join(' → ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="empty">{routes?.reason === 'same' ? 'Origin and destination are the same location.' : routes?.reason === 'unreachable' ? 'No feasible route under current closures.' : 'Computing candidates…'}</div>}
      </section>

      <section className="panel ro-right" aria-label="Objective space">
        <div className="panel-head"><span className="panel-title">Objective space</span><span className="panel-meta">{routes?.source === 'live' ? 'Live' : 'Demo model'}</span></div>
        <div style={{ padding: '10px 12px 4px', fontSize: 11.5, color: 'var(--muted)' }}>Each candidate by ETA and mean risk index. Lower-left is better on both.</div>
        <div style={{ padding: '0 12px' }}><Scatter rows={rows} /></div>
        <div className="panel-head" style={{ borderTop: '1px solid var(--line)', marginTop: 8 }}><span className="panel-title">Backend request</span><span className="panel-meta">proposed contract</span></div>
        <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0, flex: 1 }}>
          <span className="mono" style={{ fontSize: 11, color: 'var(--accent)' }}>POST /api/routes/optimize</span>
          <pre className="code" style={{ flex: 1 }}>{JSON.stringify(request, null, 2)}</pre>
        </div>
      </section>
    </div>
  );
}
