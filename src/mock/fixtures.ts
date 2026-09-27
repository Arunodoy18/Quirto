/**
 * DEMO fixtures. Synthetic values for layout only — never presented as
 * measured results. Screens show a "Demo fixture" label wherever these appear.
 */
import type { AlgorithmResult, Scenario } from '@/types/domain';
import { mulberry32 } from './network';

export const ALGORITHM_META: Record<string, { name: string; family: string; color: string }> = {
  dijkstra: { name: 'Dijkstra', family: 'Deterministic shortest path', color: 'var(--algo-dijkstra)' },
  astar: { name: 'A*', family: 'Deterministic, heuristic', color: 'var(--algo-astar)' },
  ga: { name: 'GA', family: 'Genetic algorithm', color: 'var(--algo-ga)' },
  pso: { name: 'PSO', family: 'Particle swarm', color: 'var(--algo-pso)' },
  qirto: { name: 'QIRTO', family: 'Quantum-inspired', color: 'var(--algo-qirto)' }
};

function curve(start: number, fin: number, tau: number, n: number, wob: number) {
  const out: Array<{ iteration: number; cost: number }> = [];
  let best = start;
  for (let i = 0; i <= n; i++) {
    const v = fin + (start - fin) * Math.exp(-i / tau) + (i < n ? Math.sin(i * 1.7) * wob * (1 - i / n) : 0);
    best = Math.min(best, Math.max(fin, v));
    out.push({ iteration: i, cost: best });
  }
  return out;
}

/** Mixed on purpose: no algorithm wins every metric. */
export const ALGORITHM_FIXTURE: AlgorithmResult[] = [
  { experimentId: 'fixture', algorithm: 'dijkstra', travelTimeMin: 16.2, distanceKm: 9.1, congestion: 0.58, fuelL: 0.78, risk: 0.31, totalCost: 0.341, runtimeMs: 3, iterations: 1, runs: 30 },
  { experimentId: 'fixture', algorithm: 'astar', travelTimeMin: 16.2, distanceKm: 9.1, congestion: 0.58, fuelL: 0.78, risk: 0.31, totalCost: 0.341, runtimeMs: 2, iterations: 1, runs: 30 },
  { experimentId: 'fixture', algorithm: 'ga', travelTimeMin: 15.1, distanceKm: 9.6, congestion: 0.45, fuelL: 0.74, risk: 0.29, totalCost: 0.324, runtimeMs: 118, iterations: 60, runs: 30, convergence: curve(0.56, 0.324, 12, 60, 0.012) },
  { experimentId: 'fixture', algorithm: 'pso', travelTimeMin: 15.6, distanceKm: 9.4, congestion: 0.47, fuelL: 0.72, risk: 0.27, totalCost: 0.331, runtimeMs: 96, iterations: 48, runs: 30, convergence: curve(0.54, 0.331, 9, 48, 0.01) },
  { experimentId: 'fixture', algorithm: 'qirto', travelTimeMin: 15.3, distanceKm: 9.8, congestion: 0.43, fuelL: 0.76, risk: 0.28, totalCost: 0.326, runtimeMs: 84, iterations: 23, runs: 30, convergence: curve(0.55, 0.326, 5, 23, 0.01) }
];

const MIX = { car: 62, bike: 14, bus: 10, truck: 12, emergency: 2 };
const preset = (id: string, name: string, density: number, weather: Scenario['weather'], accidents: number, closures: string[], vehicleMix = MIX): Scenario =>
  ({ id, name, preset: true, density, weather, accidents, closures, vehicleMix, origin: 'station', destination: 'techpark' });

export const PRESET_SCENARIOS: Scenario[] = [
  preset('normal', 'Normal Traffic', 1.0, 'clear', 0, []),
  preset('peak', 'Peak Hour', 1.7, 'clear', 0, [], { car: 68, bike: 10, bus: 12, truck: 8, emergency: 2 }),
  preset('accident', 'Accident', 1.1, 'clear', 1, []),
  preset('rain', 'Heavy Rain', 1.25, 'heavy_rain', 0, [], { car: 66, bike: 6, bus: 14, truck: 12, emergency: 2 }),
  preset('closure', 'Road Closure', 1.1, 'clear', 0, ['University Expy']),
  preset('multi', 'Multi-Incident', 1.35, 'rain', 2, ['Tech Corridor'])
];

export interface AnalyticsFilters { scenario: string; algorithm: string; run: string; origin: string; destination: string }
export interface AnalyticsData {
  congestion: number[];
  baseline: number[];
  speed: number[];
  travelTime: number[];
  cost: number[];
  convergence: number[];
  routeShare: Array<{ street: string; share: number }>;
}

/** Deterministic synthetic series for the Analytics screen. */
export function analyticsSeries(f: AnalyticsFilters): AnalyticsData {
  let h = 2166136261;
  const key = [f.scenario, f.algorithm, f.run, f.origin, f.destination].join('|');
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
  const R = mulberry32(h);
  const load = ({ normal: 1, peak: 1.5, accident: 1.2, rain: 1.3, closure: 1.2, multi: 1.45 } as Record<string, number>)[f.scenario] ?? 1;
  const prof = (i: number) => { const hr = 6 + i * 0.5; return 0.16 + 0.34 * Math.exp(-(((hr - 9) / 1.4) ** 2)) + 0.3 * Math.exp(-(((hr - 18.5) / 1.8) ** 2)); };
  const congestion: number[] = [], baseline: number[] = [], speed: number[] = [];
  for (let i = 0; i < 35; i++) {
    const p = prof(i);
    congestion.push(Math.min(95, (p * load + (R() - 0.5) * 0.05) * 100));
    baseline.push(p * 100);
    speed.push(Math.max(8, 44 - p * load * 42 + (R() - 0.5) * 3));
  }
  const travelTime: number[] = [], cost: number[] = [];
  for (let i = 0; i < 10; i++) { travelTime.push(11 + load * 5 + (R() - 0.5) * 5); cost.push(0.28 + load * 0.05 + (R() - 0.5) * 0.05); }
  const n = 20 + Math.floor(R() * 16), fin = cost[9], st = fin * (1.6 + R() * 0.3);
  const convergence: number[] = [];
  let best = st;
  for (let i = 0; i <= n; i++) { const v = fin + (st - fin) * Math.exp(-i / (n / 4.5)) + (R() - 0.4) * 0.02 * (1 - i / n); best = Math.max(fin, Math.min(best, v)); convergence.push(i === n ? fin : best); }
  const streets = ['Central Blvd', 'University Expy', 'Tech Corridor', 'Market St', 'Station Rd', 'Canal Rd'];
  const w = streets.map(() => 0.3 + R());
  const ws = w.reduce((a, b) => a + b, 0);
  const routeShare = streets.map((s, i) => ({ street: s, share: Math.round((w[i] / ws) * 100) })).sort((a, b) => b.share - a.share);
  return { congestion, baseline, speed, travelTime, cost, convergence, routeShare };
}
