import { useSyncExternalStore } from 'react';
import { trafficService } from '@/services';

/** Live traffic stats, simulation state and incidents (updates ~2.5×/s). */
export function useWorld() {
  return useSyncExternalStore(trafficService.subscribe, trafficService.getSnapshot);
}
