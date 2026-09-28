import type { ProfileKey, ScenarioKey, VehicleType } from '@/types/domain';
import { PLACES } from '@/mock/network';
import { PROFILES, SCENARIOS, VEHICLES } from '@/lib/format';

interface Props {
  origin: string; destination: string; vehicle: VehicleType; profile: ProfileKey; scenario: ScenarioKey;
  locked: boolean; stale: boolean;
  onOrigin(v: string): void; onDestination(v: string): void; onVehicle(v: VehicleType): void; onProfile(v: ProfileKey): void; onScenario(v: ScenarioKey): void;
  onOptimize(): void; onIncident(): void;
}

export function RouteControls(p: Props) {
  return (
    <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="stack">
        <label className="label" htmlFor="cc-origin">Origin</label>
        <select id="cc-origin" className="field" value={p.origin} disabled={p.locked} onChange={(e) => p.onOrigin(e.target.value)}>
          {PLACES.map((pl) => <option key={pl.id} value={pl.id}>{pl.name}</option>)}
        </select>
      </div>
      <div className="stack">
        <label className="label" htmlFor="cc-dest">Destination</label>
        <select id="cc-dest" className="field" value={p.destination} disabled={p.locked} onChange={(e) => p.onDestination(e.target.value)}>
          {PLACES.map((pl) => <option key={pl.id} value={pl.id}>{pl.name}</option>)}
        </select>
      </div>
      <div className="stack">
        <span className="label">Vehicle</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }}>
          {VEHICLES.map(([k, l]) => <button key={k} className="chip" aria-pressed={p.vehicle === k} disabled={p.locked} onClick={() => p.onVehicle(k)}>{l}</button>)}
        </div>
      </div>
      <div className="stack">
        <span className="label">Optimization profile</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6 }}>
          {PROFILES.map(([k, l]) => <button key={k} className="chip" aria-pressed={p.profile === k} disabled={p.locked} onClick={() => p.onProfile(k)}>{l}</button>)}
        </div>
      </div>
      <div className="stack">
        <label className="label" htmlFor="cc-scn">Traffic scenario</label>
        <select id="cc-scn" className="field" value={p.scenario} disabled={p.locked} onChange={(e) => p.onScenario(e.target.value as ScenarioKey)}>
          {SCENARIOS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button className="btn" disabled={p.locked} onClick={p.onOptimize}>Optimize route</button>
        <button className="btn-danger" disabled={p.locked} onClick={p.onIncident}>Simulate incident</button>
      </div>
      {p.stale && <span className="mono" style={{ fontSize: 11, color: 'var(--warn)' }}>Inputs changed — re-run optimization</span>}
    </div>
  );
}
