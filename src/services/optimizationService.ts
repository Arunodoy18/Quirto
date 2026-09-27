/**
 * Optimization runs.
 * LIVE: POST /api/routes/optimize → { runId }, then OPTIMIZATION_* events on
 *       /ws/optimization stream the run until OPTIMIZATION_COMPLETE.
 * DEMO: the route is solved locally and the run is animated (SIMULATED).
 */
import type { OptimizationRun, RouteRequest, WsEvent } from '@/types/domain';
import { simulateRun } from '@/mock/optimizerSim';
import { eventBus } from '@/mock/eventBus';
import { isDemo, post, http } from './api';
import { websocketService } from './websocketService';
import { world } from './world';

export interface RunHandle { cancel: () => void; done: Promise<OptimizationRun> }

export const optimizationService = {
  start(req: RouteRequest, onUpdate: (run: OptimizationRun) => void, opts: { short?: boolean } = {}): RunHandle {
    if (isDemo) {
      const result = world.scene.solve(req);
      eventBus.emit('OPTIMIZATION_STARTED', { request: req });
      let n = 0;
      const h = simulateRun(result, opts, (run) => {
        onUpdate(run);
        if (run.status === 'RUNNING' && ++n % 6 === 0) eventBus.emit('OPTIMIZATION_ITERATION', { runId: run.id, iteration: run.iteration, bestCost: run.bestCost });
      });
      void h.done.then((run) => {
        eventBus.emit('OPTIMIZATION_COMPLETE', { runId: run.id, bestCost: run.bestCost });
        if (run.result?.primary) eventBus.emit('ROUTE_UPDATED', { route: run.result.primary });
      });
      // expose the candidate set immediately so the map can show it
      onUpdate({ id: 'pending', source: 'demo', status: 'INITIALIZING', iteration: 0, maxIterations: 0, population: 50, bestCost: null, bestFitness: null, runtimeMs: 0, convergence: [], qState: [], result });
      return h;
    }
    let off = () => undefined as void;
    const done = post<{ runId: string }>('/api/routes/optimize', req).then(({ runId }) => new Promise<OptimizationRun>((resolve) => {
      off = websocketService.on('/ws/optimization', (e: WsEvent) => {
        const run = e.payload as OptimizationRun;
        if (run.id !== runId) return;
        onUpdate(run);
        if (e.type === 'OPTIMIZATION_COMPLETE') { off(); resolve(run); }
      });
    }));
    return { cancel: () => off(), done };
  },
  getRun: (id: string) => http<OptimizationRun>(`/api/optimization/runs/${id}`)
};
