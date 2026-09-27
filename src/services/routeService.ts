/**
 * Route evaluation (instant, no animation) — used by Route Optimization for
 * live recompute while weights change.
 */
import type { RouteRequest, RouteSet } from '@/types/domain';
import { isDemo, post } from './api';
import { world } from './world';

export const routeService = {
  evaluate(req: RouteRequest): Promise<RouteSet> {
    if (isDemo) return Promise.resolve(world.scene.solve(req));
    return post<RouteSet>('/api/routes/evaluate', req);
  }
};
