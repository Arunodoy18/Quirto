import { simulationService } from '@/services';
import type { SimulationState } from '@/types/domain';

const SPEEDS = [0.5, 1, 2, 5];

export function SimulationControls({ sim }: { sim: SimulationState }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button className="btn-ghost" aria-pressed={sim.running} onClick={simulationService.play}>
        <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 1l9 5-9 5z" fill="currentColor" /></svg>Play
      </button>
      <button className="btn-ghost" aria-pressed={!sim.running} onClick={simulationService.pause}>
        <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 1h3v10H2zM7 1h3v10H7z" fill="currentColor" /></svg>Pause
      </button>
      <button className="btn-ghost" onClick={simulationService.reset}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" /></svg>Reset
      </button>
      <div className="seg" role="group" aria-label="Speed">
        <span className="label" style={{ padding: '0 6px 0 4px', alignSelf: 'center' }}>Speed</span>
        {SPEEDS.map((s) => <button key={s} className="mono" aria-pressed={sim.speed === s} onClick={() => simulationService.setSpeed(s)}>{s}x</button>)}
      </div>
    </div>
  );
}
