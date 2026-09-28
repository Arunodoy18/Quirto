/**
 * LIVE adapter for the world store: applies backend websocket payloads to the
 * scene so the 3D view and stats render real SUMO state.
 * Assumes road ids match the scene network (PostGIS → scene mapping is a
 * backend concern; see docs/BACKEND_CONTRACT.md).
 */
import type { Incident, Road, SimulationState, WsEvent } from '@/types/domain';
import { websocketService } from '../websocketService';
import { world } from '../world';

let started = false;

export function startLiveWorld() {
  if (started) return;
  started = true;
  const scene = world.scene;
  websocketService.on('/ws/traffic', (e: WsEvent) => {
    if (e.type === 'TRAFFIC_UPDATE') {
      const { roads } = e.payload as { roads: Road[] };
      for (const r of roads) {
        const edge = scene.net.byId.get(r.id);
        if (!edge) continue;
        scene.load[edge.idx] = r.load;
      }
    }
    if (e.type === 'INCIDENT_CREATED' || e.type === 'INCIDENT_UPDATED') {
      const inc = e.payload as Incident;
      scene.incidents = [...scene.incidents.filter((x) => x.id !== inc.id), ...(inc.status === 'cleared' ? [] : [inc])];
    }
    world.notify();
  });
  websocketService.on('/ws/simulation', (e: WsEvent) => {
    const s = e.payload as Partial<SimulationState> & { clock?: number };
    if (s.scenario) scene.scenario = s.scenario;
    if (typeof s.running === 'boolean') scene.running = s.running;
    if (typeof s.speed === 'number') scene.speed = s.speed;
    if (typeof s.clock === 'number') scene.simSeconds = s.clock;
    world.notify();
  });
}
