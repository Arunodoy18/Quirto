/**
 * World store — the single source of live traffic state for the UI.
 * DEMO: driven by the local TrafficEngine on requestAnimationFrame.
 * LIVE: driven by /ws/traffic and /ws/simulation events (see live/liveWorld.ts).
 * Components read it through useWorld(); the 3D scene reads `scene` directly
 * every frame.
 */
import type { Incident, SimulationState, TrafficStats } from '@/types/domain';
import { TrafficEngine } from '@/mock/TrafficEngine';
import { DATA_SOURCE } from '@/config';

export interface WorldSnapshot { stats: TrafficStats; sim: SimulationState; incidents: Incident[] }

class World {
  /** Scene state for the 3D view. In LIVE mode it is fed by websocket payloads. */
  readonly scene = new TrafficEngine();
  private listeners = new Set<() => void>();
  private snap: WorldSnapshot;
  private raf = 0;
  private last = 0;
  private acc = 0;

  constructor() {
    this.snap = this.build();
    if (DATA_SOURCE === 'live') this.scene.running = false;
  }

  private build(): WorldSnapshot {
    const e = this.scene;
    return {
      stats: { ...e.stats(), source: DATA_SOURCE },
      sim: { running: e.running, speed: e.speed, scenario: e.scenario, rain: e.rain },
      incidents: e.incidents.slice()
    };
  }

  start() {
    if (this.raf || typeof window === 'undefined') return;
    this.last = performance.now();
    const loop = (t: number) => {
      this.raf = requestAnimationFrame(loop);
      const dt = (t - this.last) / 1000;
      this.last = t;
      if (DATA_SOURCE === 'demo') this.scene.tick(dt);
      this.acc += dt;
      if (this.acc > 0.4) { this.acc = 0; this.notify(); }
    };
    this.raf = requestAnimationFrame(loop);
  }

  notify() {
    this.snap = this.build();
    this.listeners.forEach((l) => l());
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    this.start();
    return () => { this.listeners.delete(fn); };
  };

  getSnapshot = () => this.snap;
}

export const world = new World();
