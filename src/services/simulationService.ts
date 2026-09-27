/**
 * Write-side control of the simulation: play/pause, speed, scenario, weather,
 * incidents and the tracked vehicle.
 */
import type { Incident, IncidentType, Route, ScenarioKey, VehicleType } from '@/types/domain';
import { scenarioIncidents, TrafficEngine } from '@/mock/TrafficEngine';
import { eventBus } from '@/mock/eventBus';
import { isDemo, post, del } from './api';
import { world } from './world';

const e = () => world.scene;
const changed = () => {
  world.notify();
  if (isDemo) eventBus.emit('SIMULATION_STATE', world.getSnapshot().sim);
};

export const simulationService = {
  play() { if (isDemo) e().running = true; else void post('/api/simulation/play', {}); changed(); },
  pause() { if (isDemo) e().running = false; else void post('/api/simulation/pause', {}); changed(); },
  setSpeed(speed: number) { if (isDemo) e().speed = speed; else void post('/api/simulation/speed', { speed }); changed(); },
  reset() {
    if (isDemo) { const s = e(); s.incidents = []; s.rain = false; s.speed = 1; s.running = true; s.reset(); }
    else void post('/api/simulation/reset', {});
    changed();
  },
  /** Apply a scenario preset (and the incidents it implies). */
  setScenario(scenario: ScenarioKey, withPresetIncidents = true) {
    if (isDemo) { e().scenario = scenario; if (withPresetIncidents) e().incidents = scenarioIncidents(scenario); }
    else void post('/api/simulation/scenario', { scenario });
    changed();
  },
  setRain(rain: boolean) { if (isDemo) e().rain = rain; else void post('/api/simulation/weather', { weather: rain ? 'rain' : 'clear' }); changed(); },

  injectIncident(roadId: string, type: IncidentType): Incident {
    const inc: Incident = { id: `inc-${Date.now().toString(36)}`, roadId, type, createdAt: new Date().toISOString(), status: 'active' };
    if (isDemo) { e().incidents = [...e().incidents, inc]; eventBus.emit('INCIDENT_CREATED', inc); }
    else void post('/api/simulation/incidents', inc);
    changed();
    return inc;
  },
  clearIncident(id: string) {
    if (isDemo) { e().incidents = e().incidents.filter((x) => x.id !== id); eventBus.emit('INCIDENT_UPDATED', { id, status: 'cleared' }); }
    else void del(`/api/simulation/incidents/${id}`);
    changed();
  },
  clearIncidents() { for (const i of e().incidents.slice()) simulationService.clearIncident(i.id); },

  /** A random open road not already affected, for incident buttons. */
  randomRoad(): string {
    const taken = new Set(e().incidents.map((i) => i.roadId));
    const roads = e().net.edges.filter((x) => !taken.has(x.id));
    return roads[(Math.random() * roads.length) | 0]?.id ?? 'h-4-3';
  },

  // --- tracked vehicle (the car the Command Center follows) ---
  trackVehicle(route: Route, vehicle: VehicleType) { e().egoVehicle = vehicle; e().startEgo(TrafficEngine.nodePath(route)); },
  untrackVehicle() { e().stopEgo(); },
  trackedAheadRoad: () => e().egoAheadRoad(),
  isTracking: () => !!e().ego && !e().ego!.arrived
};
