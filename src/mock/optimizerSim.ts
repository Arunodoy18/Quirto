/**
 * DEMO optimizer animation.
 * The route itself is solved by TrafficEngine; this only animates what a
 * population-based quantum-inspired run looks like while it converges, so the
 * panels can be designed and demoed. Every value is labelled SIMULATED in UI.
 * The final best cost always equals the solved route's cost.
 */
import type { OptimizationRun, QState, RouteSet } from '@/types/domain';

export function simulateRun(result: RouteSet, opts: { short?: boolean; delayMs?: number }, onUpdate: (run: OptimizationRun) => void): { cancel: () => void; done: Promise<OptimizationRun> } {
  const id = `demo-${Date.now().toString(36)}`;
  const base: OptimizationRun = { id, source: 'demo', status: 'RUNNING', iteration: 0, maxIterations: 0, population: 50, bestCost: null, bestFitness: null, runtimeMs: 0, convergence: [], qState: [], result: null };
  if (!result.primary) {
    const run = { ...base, status: 'NO ROUTE' as const, result };
    onUpdate(run);
    return { cancel: () => undefined, done: Promise.resolve(run) };
  }
  const fin = result.primary.totalCost;
  const N = opts.short ? 16 + ((Math.random() * 8) | 0) : 22 + ((Math.random() * 14) | 0);
  const start = Math.min(0.999, fin * (1.6 + Math.random() * 0.45));
  let i = 0, best = start, rt = 0;
  const conv = [{ iteration: 0, cost: start }];
  let timer: ReturnType<typeof setInterval> | undefined = undefined;
  let resolve!: (r: OptimizationRun) => void;
  const done = new Promise<OptimizationRun>((r) => { resolve = r; });
  const target = result.qState;
  const tick = () => {
    i++;
    rt += 1.7 + Math.random() * 0.9;
    const tgt = fin + (start - fin) * Math.exp(-i / (N / 4.5));
    const c = tgt + (Math.random() - 0.35) * 0.03 * (1 - i / N);
    best = Math.max(fin, Math.min(best, c));
    const end = i >= N;
    if (end) best = fin;
    conv.push({ iteration: i, cost: best });
    const f = 1 - Math.exp(-i / (N / 3.2));
    const q: QState[] = target.map((p) => ({ ...p, probability: end ? p.probability : Math.max(0.02, Math.min(0.98, 0.5 + (p.probability - 0.5) * f + (Math.random() - 0.5) * 0.22 * (1 - i / N))) }));
    const run: OptimizationRun = { ...base, status: end ? 'CONVERGED' : 'RUNNING', iteration: i, maxIterations: N, bestCost: best, bestFitness: 1 / (1 + best), runtimeMs: Math.round(rt), convergence: conv.slice(), qState: q, result: end ? result : null };
    onUpdate(run);
    if (end) { clearInterval(timer); resolve(run); }
  };
  const delay = setTimeout(() => { timer = setInterval(tick, 80); }, opts.delayMs ?? 0);
  return { cancel: () => { clearTimeout(delay); clearInterval(timer); }, done };
}
