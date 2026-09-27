import type { CameraMode } from '@/types/domain';
import { useWorld } from '@/hooks/useWorld';
import { ThreeCity } from '@/components/three/ThreeCity';
import { MapLegend } from '@/components/three/MapLegend';
import { useCommandCenter } from './useCommandCenter';
import { RouteControls } from './RouteControls';
import { RouteResult } from './RouteResult';
import { TrafficStats } from './TrafficStats';
import { OptimizationPanel } from './OptimizationPanel';
import { DemoSequence } from './DemoSequence';
import { EventStream } from './EventStream';
import './command-center.css';

const CAMS: Array<[CameraMode, string]> = [['overview', 'Overview'], ['network', 'Network'], ['route', 'Route'], ['incident', 'Incident'], ['optimization', 'Optimize'], ['follow', 'Follow']];
const BANNER_COLOR = { info: 'var(--accent)', ok: 'var(--ok)', warn: 'var(--warn)', danger: 'var(--danger)' };

export default function CommandCenter() {
  const world = useWorld();
  const cc = useCommandCenter();
  const s = cc.state;
  const running = s.demo === 'running';
  const locked = s.busy || running;

  return (
    <div className="cc">
      <section className="panel cc-left" aria-label="Route request">
        <div className="panel-head">
          <span className="panel-title">Route request</span>
          <button className="btn-ghost" style={{ height: 24, fontSize: 11 }} disabled={running} onClick={cc.reset}>Reset</button>
        </div>
        <RouteControls
          origin={s.origin} destination={s.destination} vehicle={s.vehicle} profile={s.profile} scenario={world.sim.scenario}
          locked={locked} stale={s.stale}
          onOrigin={cc.setOrigin} onDestination={cc.setDestination} onVehicle={cc.setVehicle} onProfile={cc.setProfile} onScenario={cc.setScenario}
          onOptimize={cc.optimize} onIncident={cc.incident}
        />
        <RouteResult routes={s.routes} show={s.phase === 'final'} busy={s.busy} />
      </section>

      <section className="cc-map" aria-label="Digital twin">
        <ThreeCity camera={s.camera} incidents={world.incidents} routes={s.routes} phase={s.phase} optT={s.optT} origin={s.origin} destination={s.destination} showOD={s.showOD} />
        <div className="cc-map-top">
          <div className="overlay" style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '6px 10px' }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Digital twin</span>
            <span className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>
              {world.stats.source === 'live' ? 'Live network' : 'Demo network'} · {world.stats.nodes} nodes · {world.stats.links} links
            </span>
          </div>
          <div className="seg" role="group" aria-label="Camera" style={{ pointerEvents: 'auto' }}>
            {CAMS.map(([k, l]) => <button key={k} aria-pressed={s.camera === k} onClick={() => cc.setCamera(k)}>{l}</button>)}
          </div>
        </div>
        {s.banner && (
          <div className="overlay cc-banner" style={{ borderColor: BANNER_COLOR[s.banner.level] }} role="status">
            <span className="mono" style={{ fontSize: 10.5, color: BANNER_COLOR[s.banner.level], whiteSpace: 'nowrap' }}>
              {s.demo !== 'off' && s.stage >= 0 ? `${String(s.stage + 1).padStart(2, '0')} / 12` : 'EVENT'}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-strong)' }}>{s.banner.title}</span>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{s.banner.detail}</span>
            </div>
          </div>
        )}
        <div className="cc-map-foot" style={{ left: 10, bottom: 10 }}><MapLegend /></div>
        <div className="mono cc-map-foot" style={{ right: 12, bottom: 14, fontSize: 10.5, color: 'var(--muted)' }}>Drag to orbit · scroll to zoom · double-click to reset</div>
      </section>

      <section className="panel cc-right" aria-label="Live intelligence">
        <div className="panel-head"><span className="panel-title">Live intelligence</span><span className="panel-meta">{world.stats.source === 'live' ? 'Live source' : 'Demo source'}</span></div>
        <TrafficStats stats={world.stats} />
        <DemoSequence demo={s.demo} stage={s.stage} onRun={cc.runDemo} onStop={cc.stopDemo} />
        <EventStream rows={s.log} />
      </section>

      <div className="cc-bottom">
        <OptimizationPanel run={s.run} routes={s.routes} busy={s.busy} />
      </div>
    </div>
  );
}
