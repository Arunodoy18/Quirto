import type { TrafficState } from '@/types/domain';
import { http, isDemo } from './api';
import { world } from './world';
import { startLiveWorld } from './live/liveWorld';

/** Read-side access to network state. */
export const trafficService = {
  subscribe: (fn: () => void) => { if (!isDemo) startLiveWorld(); return world.subscribe(fn); },
  getSnapshot: world.getSnapshot,
  /** The object the 3D scene renders every frame. */
  scene: () => world.scene,
  /** One-off fetch of the full state (LIVE only). */
  getTrafficState: () => (isDemo ? Promise.resolve(null) : http<TrafficState>('/api/traffic/state'))
};
