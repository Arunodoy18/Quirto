import { useEffect, useState } from 'react';
import type { CameraMode, ScenarioKey } from '@/types/domain';
import { ROAD_STATES } from '@/types/domain';
import { useWorld } from '@/hooks/useWorld';
import { simulationService } from '@/services';
import { streetOfRoad } from '@/mock/network';
import { ROAD_COLOR, clockStr } from '@/lib/format';
import { ThreeCity } from '@/components/three/ThreeCity';
import { LineChart } from '@/components/charts/LineChart';
import { SimulationControls } from './SimulationControls';
import { IncidentController } from './IncidentController';
import './simulation.css';

const BASES: Array<[ScenarioKey, string]> = [['normal', 'Normal'], ['peak', 'Peak Hour'], ['multi', 'Multi-Incident load']];
const TYPE_COLOR = { accident: 'var(--danger)', congestion: 'var(--road-congested)', closure: 'var(--road-closed)' };

export default function LiveSimulation() {
  const { stats, sim, incidents } = useWorld();
  const [camera, setCamera] = useState<CameraMode>('overview');
  const [hist, setHist] = useState<Array<{ v: number; s: number; c: number }>>([]);

  useEffect(() => { setHist((h) => [...h, { v: stats.vehicles, s: stats.avgSpeedKmh, c: stats.congestedPct }].slice(-75)); }, [stats]);

  const total = ROAD_STATES.reduce((a, s) => a + stats.stateCounts[s], 0) || 1;
  const sparks: Array<[string, number[], string, string]> = [
    ['Vehicle count', hist.map((h) => h.v), 'var(--text-2)', 'veh'],
    ['Average speed', hist.map((h) => h.s), 'var(--accent)', 'km/h'],
    ['Congested links', hist.map((h) => h.c), 'var(--road-congested)', '%']
  ];

  return (
    <div className="sim">
      <div className="panel sim-toolbar" role="toolbar" aria-label="Simulation controls">
        <SimulationControls sim={sim} />
        <span style={{ width: 1, height: 26, background: 'var(--line-strong)' }} />
        <IncidentController sim={sim} onInjected={() => setCamera('incident')} />
      </div>

      <section className="sim-map" aria-label="Simulation view">
        <ThreeCity camera={camera} incidents={incidents} showOD={false} />
        <div className="overlay sim-float" style={{ left: 10, top: 10, padding: '7px 10px', display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span className="mono" style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-strong)' }}>{clockStr(stats.clock)}</span>
          <span className="mono" style={{ fontSize: 10.5, color: sim.running ? 'var(--ok)' : 'var(--warn)' }}>{sim.running ? 'RUNNING' : 'PAUSED'} · {sim.speed}× · sim 20× real</span>
        </div>
        <div className="seg sim-float" style={{ right: 10, top: 10 }} role="group" aria-label="Camera">
          {([['overview', 'Overview'], ['incident', 'Incident'], ['optimization', 'Top-down']] as Array<[CameraMode, string]>).map(([k, l]) => <button key={k} aria-pressed={camera === k} onClick={() => setCamera(k)}>{l}</button>)}
        </div>
        <div className="overlay mono sim-float" style={{ left: 10, bottom: 10, padding: '6px 9px', fontSize: 10.5, color: 'var(--text-3)' }}>
          Source: {stats.source === 'live' ? 'SUMO via /ws/traffic' : 'demo traffic model · SUMO not connected'}
        </div>
      </section>

      <div className="sim-charts">
        {sparks.map(([title, values, color, unit]) => (
          <div key={title} className="panel">
            <div className="panel-head"><span className="panel-title">{title}</span><span className="mono" style={{ fontSize: 13, fontWeight: 600, color }}>{values.length ? `${Math.round(values[values.length - 1])} ${unit}` : '—'}</span></div>
            <div style={{ padding: '4px 6px 0' }}><LineChart ariaLabel={`${title} over the last 30 seconds`} height={140} xCount={75} series={[{ values, color, area: true }]} yTicks={2} /></div>
          </div>
        ))}
      </div>

      <section className="panel sim-right" aria-label="Network state">
        <div className="panel-head"><span className="panel-title">Network state</span><span className="panel-meta">{stats.source === 'live' ? 'Live' : 'Demo'}</span></div>
        <div className="panel-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {([['Vehicles', stats.vehicles, ''], ['Avg speed', stats.avgSpeedKmh, 'km/h'], ['Congestion', stats.congestedPct, '% links'], ['Utilization', stats.utilizationPct, '%'], ['Incidents', incidents.length, 'active'], ['Weather', sim.rain || sim.scenario === 'rain' || sim.scenario === 'multi' ? 'RAIN' : 'CLEAR', '']] as Array<[string, string | number, string]>).map(([k, v, u]) => (
            <div key={k} className="stat"><span className="stat-k">{k}</span><span className="stat-v" style={{ fontSize: 19 }}>{v}<span className="stat-u" style={{ fontSize: 11, fontWeight: 400 }}> {u}</span></span></div>
          ))}
        </div>
        <div style={{ padding: '0 12px 12px', borderBottom: '1px solid var(--line)' }} className="stack">
          <label className="label" htmlFor="sim-base">Base scenario</label>
          <select id="sim-base" className="field" value={BASES.some((b) => b[0] === sim.scenario) ? sim.scenario : 'normal'} onChange={(e) => simulationService.setScenario(e.target.value as ScenarioKey, false)}>
            {BASES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
        <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 7, borderBottom: '1px solid var(--line)' }}>
          <span className="label">Road state distribution</span>
          {ROAD_STATES.map((s) => (
            <div key={s} style={{ display: 'grid', gridTemplateColumns: '82px 1fr 34px', alignItems: 'center', gap: 8 }}>
              <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-2)' }}>{s}</span>
              <div style={{ height: 6, background: 'var(--line-soft)' }}><div style={{ height: 6, width: `${(stats.stateCounts[s] / total) * 100}%`, background: ROAD_COLOR[s], transition: 'width 0.4s' }} /></div>
              <span className="mono" style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'right' }}>{stats.stateCounts[s]}</span>
            </div>
          ))}
        </div>
        <div className="panel-head"><span className="panel-title">Active incidents</span><button className="btn-ghost" style={{ height: 24, fontSize: 11 }} onClick={simulationService.clearIncidents}>Clear all</button></div>
        <div style={{ flex: 1, overflow: 'auto', padding: '4px 12px' }}>
          {incidents.length === 0 && <span className="empty" style={{ display: 'block', padding: '10px 0' }}>No active incidents. Use the toolbar to inject one.</span>}
          {incidents.map((i) => (
            <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--line-soft)' }}>
              <span style={{ width: 8, height: 8, background: TYPE_COLOR[i.type] }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <span className="mono" style={{ fontSize: 10.5, fontWeight: 600, color: TYPE_COLOR[i.type] }}>{i.type.toUpperCase()}</span>
                <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{streetOfRoad(i.roadId)} <span className="mono muted" style={{ fontSize: 10.5 }}>· {i.roadId}</span></span>
              </div>
              <button className="btn-ghost" style={{ height: 24, fontSize: 11 }} onClick={() => simulationService.clearIncident(i.id)} aria-label={`Clear incident on ${streetOfRoad(i.roadId)}`}>Clear</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
