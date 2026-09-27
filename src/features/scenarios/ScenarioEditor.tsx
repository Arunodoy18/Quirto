import type { Scenario, VehicleType, Weather } from '@/types/domain';
import { PLACES, placeName } from '@/mock/network';

const WEATHER: Array<[Weather, string]> = [['clear', 'Clear'], ['rain', 'Rain'], ['heavy_rain', 'Heavy rain'], ['fog', 'Fog']];
const STREETS = ['Central Blvd', 'University Expy', 'Tech Corridor', 'Market St', 'Canal Rd', 'Station Rd', 'Harbor Ave', 'Temple Rd'];
const MIX: Array<[VehicleType, string, string]> = [['car', 'Car', 'var(--text-2)'], ['bike', 'Bike', 'var(--ok)'], ['bus', 'Bus', 'var(--algo-ga)'], ['truck', 'Truck', 'var(--warn)'], ['emergency', 'Emergency', 'var(--danger)']];

export const weatherLabel = (w: Weather) => WEATHER.find((x) => x[0] === w)?.[1] ?? w;

export function ScenarioEditor({ draft, onChange }: { draft: Scenario; onChange(s: Scenario): void }) {
  const patch = (p: Partial<Scenario>) => onChange({ ...draft, ...p });
  const sum = MIX.reduce((a, [k]) => a + draft.vehicleMix[k], 0) || 1;
  return (
    <div className="panel-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 20px', padding: 16 }}>
      <div className="stack" style={{ gridColumn: 'span 2' }}>
        <label className="label" htmlFor="sc-name">Name</label>
        <input id="sc-name" className="field" value={draft.name} onChange={(e) => patch({ name: e.target.value })} />
      </div>
      <div className="stack">
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><label className="label" htmlFor="sc-dens">Traffic density</label><span className="mono" style={{ fontSize: 12, color: 'var(--accent)' }}>{draft.density.toFixed(2)}× baseline</span></div>
        <input id="sc-dens" type="range" min={50} max={200} step={5} value={Math.round(draft.density * 100)} onChange={(e) => patch({ density: Number(e.target.value) / 100 })} />
      </div>
      <div className="stack">
        <label className="label" htmlFor="sc-w">Weather</label>
        <select id="sc-w" className="field" value={draft.weather} onChange={(e) => patch({ weather: e.target.value as Weather })}>{WEATHER.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      </div>
      <div className="stack">
        <label className="label" htmlFor="sc-o">Origin</label>
        <select id="sc-o" className="field" value={draft.origin} onChange={(e) => patch({ origin: e.target.value })}>{PLACES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      </div>
      <div className="stack">
        <label className="label" htmlFor="sc-d">Destination</label>
        <select id="sc-d" className="field" value={draft.destination} onChange={(e) => patch({ destination: e.target.value })}>{PLACES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      </div>
      <div className="stack">
        <span className="label" id="acc-l">Accidents</span>
        <div role="group" aria-labelledby="acc-l" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn-ghost" style={{ width: 32, padding: 0 }} aria-label="Fewer accidents" onClick={() => patch({ accidents: Math.max(0, draft.accidents - 1) })}>−</button>
          <span className="mono" style={{ fontSize: 18, fontWeight: 600, width: 24, textAlign: 'center' }}>{draft.accidents}</span>
          <button className="btn-ghost" style={{ width: 32, padding: 0 }} aria-label="More accidents" onClick={() => patch({ accidents: Math.min(5, draft.accidents + 1) })}>+</button>
          <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>placed on random links at load</span>
        </div>
      </div>
      <div className="stack">
        <span className="label">Summary</span>
        <span className="mono" style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>{placeName(draft.origin)} → {placeName(draft.destination)}<br />{weatherLabel(draft.weather)} · {draft.closures.length} closure(s)</span>
      </div>
      <div className="stack" style={{ gridColumn: 'span 2', gap: 8 }}>
        <span className="label">Road closures</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {STREETS.map((s) => {
            const on = draft.closures.includes(s);
            return <button key={s} className={on ? 'btn-danger' : 'chip'} style={{ height: 30 }} aria-pressed={on} onClick={() => patch({ closures: on ? draft.closures.filter((x) => x !== s) : [...draft.closures, s] })}>{s}</button>;
          })}
        </div>
      </div>
      <div className="stack" style={{ gridColumn: 'span 2', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="label">Vehicle distribution</span><span className="panel-meta">normalized to 100%</span></div>
        <div style={{ display: 'flex', height: 8 }}>{MIX.map(([k, , c]) => <span key={k} style={{ width: `${(draft.vehicleMix[k] / sum) * 100}%`, background: c }} />)}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 14 }}>
          {MIX.map(([k, l, c]) => (
            <div key={k} className="stack">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor={`mix-${k}`} style={{ fontSize: 12.5, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, background: c }} />{l}</label>
                <span className="mono" style={{ fontSize: 11.5 }}>{Math.round((draft.vehicleMix[k] / sum) * 100)}%</span>
              </div>
              <input id={`mix-${k}`} type="range" min={0} max={100} value={draft.vehicleMix[k]} onChange={(e) => patch({ vehicleMix: { ...draft.vehicleMix, [k]: Number(e.target.value) } })} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
