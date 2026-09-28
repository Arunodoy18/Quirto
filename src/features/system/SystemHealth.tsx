import { useEffect, useState } from 'react';
import type { Conn, OptimizerState, SystemHealth as Health } from '@/types/domain';
import { healthService, isDemo, websocketService } from '@/services';
import { CHANNEL_EVENTS, type Channel } from '@/services/websocketService';
import { API_URL } from '@/config';
import './system.css';

type Key = Exclude<keyof Health, 'checkedAt'>;
const DEFS: Array<{ key: Key; name: string; role: string; endpoint: string; states: Array<Conn | OptimizerState> }> = [
  { key: 'sumo', name: 'SUMO', role: 'Microscopic traffic simulation via TraCI', endpoint: 'traci://:8813', states: ['DISCONNECTED', 'CONNECTED'] },
  { key: 'fastapi', name: 'FastAPI', role: 'REST gateway for routing, scenarios, experiments', endpoint: '/api/health', states: ['DISCONNECTED', 'CONNECTED'] },
  { key: 'optimizer', name: 'Optimizer', role: 'Quantum-inspired metaheuristic engine', endpoint: '/api/optimizer/status', states: ['READY', 'RUNNING', 'ERROR'] },
  { key: 'websocket', name: 'WebSocket', role: 'Live traffic, optimization and simulation streams', endpoint: '/ws/*', states: ['DISCONNECTED', 'CONNECTED'] },
  { key: 'database', name: 'Database', role: 'PostgreSQL + PostGIS network and run storage', endpoint: 'postgresql://…/qirto', states: ['DISCONNECTED', 'CONNECTED'] }
];
const COLOR: Record<string, string> = { CONNECTED: 'var(--ok)', READY: 'var(--ok)', RUNNING: 'var(--accent)', ERROR: 'var(--danger)', DISCONNECTED: 'var(--warn)' };
const CONTRACT: Array<[string, Channel, string]> = [
  ['TRAFFIC_UPDATE', '/ws/traffic', '{ roads: Road[], timestamp }'],
  ['VEHICLE_UPDATE', '/ws/traffic', '{ vehicles: Vehicle[] }'],
  ['INCIDENT_CREATED', '/ws/traffic', 'Incident'],
  ['INCIDENT_UPDATED', '/ws/traffic', 'Incident'],
  ['OPTIMIZATION_STARTED', '/ws/optimization', '{ runId, request }'],
  ['OPTIMIZATION_ITERATION', '/ws/optimization', 'OptimizationRun (partial)'],
  ['OPTIMIZATION_COMPLETE', '/ws/optimization', 'OptimizationRun'],
  ['ROUTE_UPDATED', '/ws/optimization', '{ route: Route, alternatives: RouteAlternative[] }'],
  ['SIMULATION_STATE', '/ws/simulation', '{ running, speed, scenario, clock }']
];

export default function SystemHealth() {
  const [h, setH] = useState<Health | null>(null);
  const [log, setLog] = useState<Array<{ t: string; svc: string; msg: string; col: string }>>([
    { t: new Date().toTimeString().slice(0, 8), svc: 'FASTAPI', col: 'var(--warn)', msg: isDemo ? 'Not configured — running in demo mode' : `Polling ${API_URL}/api/health` }
  ]);
  const refresh = () => healthService.get().then(setH).catch(() => setH(null));
  useEffect(() => { void refresh(); const id = setInterval(refresh, 10000); return () => clearInterval(id); }, []);

  const cycle = (d: (typeof DEFS)[number]) => {
    if (!h || !isDemo) return;
    const next = d.states[(d.states.indexOf(h[d.key]) + 1) % d.states.length];
    healthService.setMock({ [d.key]: next } as Partial<Health>);
    void refresh();
    setLog((l) => [{ t: new Date().toTimeString().slice(0, 8), svc: d.name.toUpperCase(), col: COLOR[next], msg: `Mock state → ${next}` }, ...l].slice(0, 16));
  };

  return (
    <div className="sys">
      <div className="panel sys-bar">
        <span className="label">Data source</span>
        <div className="seg" role="group" aria-label="Data source">
          <button aria-pressed={isDemo}>DEMO</button>
          <button aria-pressed={!isDemo}>LIVE</button>
        </div>
        <span className="label">API base URL</span>
        <span className="mono" style={{ fontSize: 12 }}>{API_URL}</span>
        <span style={{ fontSize: 12, color: 'var(--muted)', flex: 1 }}>Set VITE_DATA_SOURCE and VITE_API_URL in .env to switch; screens read everything through src/services.</span>
      </div>

      <div className="sys-cards">
        {DEFS.map((d) => {
          const st = h?.[d.key] ?? 'DISCONNECTED';
          return (
            <section key={d.key} className="panel" style={{ padding: 14, gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: 15, fontWeight: 700 }}>{d.name}</span><span className="dot" style={{ width: 9, height: 9, background: COLOR[st] }} /></div>
              <span style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4 }}>{d.role}</span>
              <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: COLOR[st] }}>{st}</span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>{d.endpoint}</span>
              {isDemo && <button className="btn-ghost" style={{ marginTop: 'auto' }} onClick={() => cycle(d)}>Cycle mock state</button>}
            </section>
          );
        })}
      </div>

      <section className="panel sys-ws" aria-label="WebSocket channels and events">
        <div className="panel-head"><span className="panel-title">WebSocket channels</span><span className="panel-meta">websocketService.ts · auto-reconnect with backoff</span></div>
        <table className="data">
          <thead><tr><th style={{ width: 170 }}>Channel</th><th style={{ width: 140 }}>Status</th><th>Events</th></tr></thead>
          <tbody>
            {(Object.keys(CHANNEL_EVENTS) as Channel[]).map((c) => (
              <tr key={c}>
                <td className="mono" style={{ color: 'var(--accent)' }}>{c}</td>
                <td className="mono" style={{ fontSize: 11, color: isDemo ? 'var(--warn)' : 'var(--ok)' }}>{isDemo ? 'DEMO BUS' : websocketService.state(c)}</td>
                <td className="mono" style={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'normal' }}>{CHANNEL_EVENTS[c].join(' · ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="panel-head" style={{ borderTop: '1px solid var(--line)', marginTop: 12 }}><span className="panel-title">Event contract</span><span className="panel-meta">see docs/BACKEND_CONTRACT.md</span></div>
        <table className="data">
          <thead><tr><th style={{ width: 230 }}>Event</th><th style={{ width: 170 }}>Channel</th><th>Payload</th></tr></thead>
          <tbody>
            {CONTRACT.map(([e, c, p]) => (
              <tr key={e}><td className="mono" style={{ fontSize: 11.5, fontWeight: 600 }}>{e}</td><td className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{c}</td><td className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>{p}</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel sys-log" aria-label="Health log">
        <div className="panel-head"><span className="panel-title">Health log</span><span className="panel-meta">GET /api/health · every 10 s</span></div>
        <div style={{ padding: '6px 12px', overflow: 'auto' }}>
          {log.map((l, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '64px 92px 1fr', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--line-soft)', alignItems: 'baseline' }}>
              <span className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>{l.t}</span>
              <span className="mono" style={{ fontSize: 10.5, fontWeight: 600, color: l.col }}>{l.svc}</span>
              <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{l.msg}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
