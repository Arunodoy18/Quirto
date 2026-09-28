import type { IncidentType, SimulationState } from '@/types/domain';
import { simulationService } from '@/services';

export function IncidentController({ sim, onInjected }: { sim: SimulationState; onInjected?: () => void }) {
  const add = (t: IncidentType) => { simulationService.injectIncident(simulationService.randomRoad(), t); onInjected?.(); };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span className="label">Incidents</span>
      <button className="btn-danger" style={{ height: 32 }} onClick={() => add('accident')}>Accident</button>
      <button className="btn-danger" style={{ height: 32 }} onClick={() => add('congestion')}>Congestion</button>
      <button className="btn-danger" style={{ height: 32 }} aria-pressed={sim.rain} onClick={() => simulationService.setRain(!sim.rain)}>Rain</button>
      <button className="btn-danger" style={{ height: 32 }} onClick={() => add('closure')}>Road closure</button>
    </div>
  );
}
