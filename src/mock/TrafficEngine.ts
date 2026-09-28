/**
 * DEMO traffic engine.
 * A lightweight stand-in for SUMO + the route solver, so the whole UI runs
 * without a backend. Everything it produces is tagged source: 'demo'.
 *
 *  - link loads react to scenario, weather and incidents (with spill-back)
 *  - ~170–290 vehicles move along links at state-dependent speeds
 *  - routes are solved on a weighted multi-objective link cost
 *  - one tracked vehicle ("ego") can follow and be rerouted
 */
import type { Incident, Level, ProfileKey, QState, RoadState, Route, RouteAlternative, RouteRequest, RouteSet, ScenarioKey, TrafficStats, VehicleType, Weights } from '@/types/domain';
import { ROAD_STATES } from '@/types/domain';
import { BLOCK, buildNetwork, nodeOf, type NetEdge, type Network } from './network';

export const SCENARIO_PARAMS: Record<ScenarioKey, { load: number; speed: number; vehicles: number; rain: boolean }> = {
  normal: { load: 1.0, speed: 1.0, vehicles: 170, rain: false },
  peak: { load: 1.5, speed: 0.95, vehicles: 290, rain: false },
  accident: { load: 1.08, speed: 1.0, vehicles: 190, rain: false },
  rain: { load: 1.25, speed: 0.72, vehicles: 210, rain: true },
  closure: { load: 1.08, speed: 1.0, vehicles: 190, rain: false },
  multi: { load: 1.32, speed: 0.85, vehicles: 260, rain: true }
};

export const PROFILE_WEIGHTS: Record<ProfileKey, Weights> = {
  balanced: { time: 0.35, dist: 0.15, cong: 0.2, fuel: 0.1, risk: 0.2 },
  fastest: { time: 0.8, dist: 0.05, cong: 0.1, fuel: 0.05, risk: 0 },
  fuel: { time: 0.15, dist: 0.3, cong: 0.15, fuel: 0.4, risk: 0 },
  safety: { time: 0.2, dist: 0.05, cong: 0.15, fuel: 0.05, risk: 0.55 }
};

/** Default incidents implied by a scenario preset. */
export function scenarioIncidents(s: ScenarioKey): Incident[] {
  const at = new Date().toISOString();
  if (s === 'accident') return [{ id: 'scn-a', roadId: 'h-3-3', type: 'accident', createdAt: at }];
  if (s === 'closure') return [{ id: 'scn-c', roadId: 'v-4-4', type: 'closure', createdAt: at }];
  if (s === 'multi') return [
    { id: 'scn-m1', roadId: 'h-5-3', type: 'accident', createdAt: at },
    { id: 'scn-m2', roadId: 'v-7-2', type: 'closure', createdAt: at },
    { id: 'scn-m3', roadId: 'h-2-5', type: 'congestion', createdAt: at }
  ];
  return [];
}

const FUEL_RATE: Record<VehicleType, number> = { car: 0.075, bike: 0, bus: 0.32, truck: 0.28, emergency: 0.09 };
/** km/h → scene units per second, including a 20× time compression. */
const COMP = 1.234;

export interface SimVehicle { e: number; dir: 1 | -1; t: number; v: number; bus: boolean }
export interface Ego { path: number[]; idx: number; t: number; arrived: boolean }

interface EdgeComp { min: number; km: number; load: number; risk: number; fuelN: number; fuelL: number }

export class TrafficEngine {
  readonly net: Network;
  /** current load per edge (0..1.35) */
  readonly load: Float32Array;
  readonly closed: Uint8Array;
  incDist: Int8Array;
  vehicles: SimVehicle[] = [];
  ego: Ego | null = null;
  /** remaining path replaced by the latest reroute, for drawing */
  prevPath: number[] | null = null;

  scenario: ScenarioKey = 'normal';
  rain = false;
  incidents: Incident[] = [];
  running = true;
  speed = 1;
  egoVehicle: VehicleType = 'car';

  clock = 0;
  simSeconds = 7 * 3600 + 45 * 60;
  private incSeen = new Map<string, number>();

  constructor() {
    this.net = buildNetwork();
    const n = this.net.edges.length;
    this.load = new Float32Array(n);
    this.closed = new Uint8Array(n);
    this.incDist = new Int8Array(n).fill(9);
    this.net.edges.forEach((e, i) => { this.load[i] = e.base; });
  }

  reset() {
    this.net.edges.forEach((e, i) => { this.load[i] = e.base * this.params().load; });
    this.vehicles = [];
    this.ego = null;
    this.prevPath = null;
    this.clock = 0;
    this.simSeconds = 7 * 3600 + 45 * 60;
    this.incSeen.clear();
  }

  params() {
    const p = SCENARIO_PARAMS[this.scenario];
    return this.rain && !p.rain ? { ...p, load: p.load * 1.18, speed: p.speed * 0.75, rain: true } : p;
  }

  // ---------------------------------------------------------------- state
  state(i: number): number {
    if (this.closed[i]) return 4;
    const c = this.load[i];
    return c < 0.45 ? 0 : c < 0.68 ? 1 : c < 0.88 ? 2 : 3;
  }
  roadState(i: number): RoadState { return ROAD_STATES[this.state(i)]; }
  kmh(i: number): number {
    const e = this.net.edges[i];
    return [e.arterial ? 56 : 40, 28, 15, 6, 0][this.state(i)] * this.params().speed;
  }

  // ---------------------------------------------------------------- tick
  /** Advance the model by dt real seconds. */
  tick(dtReal: number) {
    const dt = this.running ? Math.min(0.05, dtReal) * this.speed : 0;
    this.clock += dt;
    this.simSeconds += dt * 20;
    this.updateTraffic(dt);
    if (dt > 0) {
      this.updateVehicles(dt);
      this.stepEgo(dt);
    }
  }

  private updateTraffic(dt: number) {
    const edges = this.net.edges, n = edges.length, p = this.params();
    const boost = new Float32Array(n), hard = new Float32Array(n), dist = new Int8Array(n).fill(9);
    this.closed.fill(0);
    const seen = new Set<string>();
    for (const inc of this.incidents) {
      const e = this.net.byId.get(inc.roadId);
      if (!e) continue;
      seen.add(inc.id);
      if (!this.incSeen.has(inc.id)) this.incSeen.set(inc.id, this.clock);
      const p0 = Math.min(1, (this.clock - (this.incSeen.get(inc.id) ?? this.clock)) / 4.5);
      const k = p0 * p0 * (3 - 2 * p0);
      const w = inc.type === 'closure' ? [0, 0.3, 0.12] : inc.type === 'congestion' ? [0.55, 0.3, 0.13] : [0, 0.36, 0.17];
      if (inc.type === 'closure') this.closed[e.idx] = 1;
      if (inc.type === 'accident') hard[e.idx] = Math.max(hard[e.idx], 0.92 + 0.36 * k);
      boost[e.idx] += w[0] * k;
      dist[e.idx] = 0;
      for (const n1 of e.nb) {
        boost[n1] += w[1] * k;
        if (dist[n1] > 1) dist[n1] = 1;
        for (const n2 of edges[n1].nb) {
          if (n2 === e.idx) continue;
          boost[n2] += w[2] * k * 0.5;
          if (dist[n2] > 2) dist[n2] = 2;
        }
      }
    }
    for (const id of [...this.incSeen.keys()]) if (!seen.has(id)) this.incSeen.delete(id);
    this.incDist = dist;
    const lerp = Math.min(1, dt * 1.1);
    for (let i = 0; i < n; i++) {
      const e = edges[i];
      let t = e.base * p.load + 0.035 * Math.sin(this.clock * 0.25 + e.phase) + Math.min(0.6, boost[i]);
      if (hard[i]) t = Math.max(t, hard[i]);
      t = Math.max(0.05, Math.min(1.35, t));
      this.load[i] += (t - this.load[i]) * lerp;
    }
  }

  private spawn(): SimVehicle {
    const edges = this.net.edges;
    let best = -1;
    for (let k = 0; k < 6; k++) {
      const c = (Math.random() * edges.length) | 0;
      if (this.closed[c]) continue;
      if (best < 0 || this.load[c] > this.load[best]) best = c;
      if (Math.random() < 0.5) break;
    }
    return { e: Math.max(0, best), dir: Math.random() < 0.5 ? 1 : -1, t: Math.random(), v: 20, bus: Math.random() < 0.07 };
  }

  private updateVehicles(dt: number) {
    const want = this.params().vehicles;
    if (this.vehicles.length < want) for (let i = 0; i < 3 && this.vehicles.length < want; i++) this.vehicles.push(this.spawn());
    else if (this.vehicles.length > want) this.vehicles.splice(0, Math.min(3, this.vehicles.length - want));
    const { nodes, edges } = this.net;
    for (const v of this.vehicles) {
      const tv = Math.max(4, this.kmh(v.e)) * COMP * (v.bus ? 0.8 : 1);
      v.v += (tv - v.v) * Math.min(1, dt * 2);
      v.t += (v.v * dt) / BLOCK;
      if (v.t < 1) continue;
      const e = edges[v.e];
      const node = v.dir > 0 ? e.b : e.a;
      const opts = nodes[node].adj.filter((q) => q.e !== v.e && !this.closed[q.e]);
      if (!opts.length) { v.dir = v.dir > 0 ? -1 : 1; v.t = 0; continue; }
      const ws = opts.map((q) => 0.35 + Math.pow(Math.min(1.3, this.load[q.e]), 1.6) * 1.6);
      let r = Math.random() * ws.reduce((a, b) => a + b, 0);
      let pick = opts[0];
      for (let i = 0; i < opts.length; i++) { r -= ws[i]; if (r <= 0) { pick = opts[i]; break; } }
      v.e = pick.e;
      v.dir = edges[pick.e].a === node ? 1 : -1;
      v.t = 0;
    }
  }

  // ---------------------------------------------------------------- ego
  edgeBetween(a: number, b: number) {
    const q = this.net.nodes[a].adj.find((x) => x.to === b);
    return q ? q.e : -1;
  }

  startEgo(nodePath: number[]) {
    this.ego = { path: nodePath.slice(), idx: 0, t: 0, arrived: nodePath.length < 2 };
    this.prevPath = null;
  }
  stopEgo() { this.ego = null; this.prevPath = null; }

  private stepEgo(dt: number) {
    const g = this.ego;
    if (!g || g.arrived) return;
    const ei = this.edgeBetween(g.path[g.idx], g.path[g.idx + 1]);
    const v = ei >= 0 ? Math.max(3, this.vehSpeed(ei, this.egoVehicle)) : 20;
    g.t += (v * COMP * 0.6 * dt) / BLOCK;
    while (g.t >= 1) {
      g.t -= 1;
      g.idx++;
      if (g.idx >= g.path.length - 1) { g.idx = g.path.length - 2; g.t = 1; g.arrived = true; break; }
    }
  }

  /** Ego world position (left-hand traffic offset) and heading. */
  egoPose() {
    const g = this.ego;
    if (!g) return null;
    const { nodes } = this.net;
    const a = nodes[g.path[g.idx]], b = nodes[g.path[Math.min(g.idx + 1, g.path.length - 1)]];
    const hx = b.x - a.x, hz = b.z - a.z, L = Math.hypot(hx, hz) || 1;
    return { x: a.x + hx * g.t + (hz / L) * 6, z: a.z + hz * g.t - (hx / L) * 6, hx: hx / L, hz: hz / L };
  }

  /** Road id a couple of links ahead of the ego — where the demo places its accident. */
  egoAheadRoad(): string | null {
    const g = this.ego;
    if (!g || g.arrived) return null;
    const n = g.path.length - 1;
    for (let k = g.idx + 2; k >= g.idx + 1; k--) {
      if (k + 1 <= n) { const ei = this.edgeBetween(g.path[k], g.path[k + 1]); if (ei >= 0) return this.net.edges[ei].id; }
    }
    return null;
  }

  // ---------------------------------------------------------------- stats
  stats(): TrafficStats {
    const counts = { FREE: 0, MODERATE: 0, CONGESTED: 0, SEVERE: 0, CLOSED: 0 } as Record<RoadState, number>;
    let util = 0;
    for (let i = 0; i < this.net.edges.length; i++) { counts[this.roadState(i)]++; util += Math.min(1, this.load[i]); }
    const sp = this.vehicles.reduce((a, v) => a + v.v, 0);
    const n = this.net.edges.length;
    return {
      source: 'demo',
      vehicles: this.vehicles.length,
      avgSpeedKmh: this.vehicles.length ? Math.round(sp / this.vehicles.length / COMP) : 0,
      congestedPct: Math.round((100 * (counts.CONGESTED + counts.SEVERE + counts.CLOSED)) / n),
      utilizationPct: Math.round((100 * util) / n),
      incidents: this.incidents.length,
      stateCounts: counts,
      nodes: this.net.nodes.length,
      links: n,
      clock: this.simSeconds
    };
  }

  // ---------------------------------------------------------------- routing
  vehSpeed(i: number, veh: VehicleType) {
    if (this.closed[i]) return 0;
    const s = this.kmh(i);
    if (veh === 'bike') return Math.min(18, Math.max(s, 12));
    if (veh === 'bus') return s * 0.85;
    if (veh === 'truck') return s * 0.8;
    if (veh === 'emergency') return Math.max(s * 1.3, this.state(i) === 3 ? 12 : 26);
    return s;
  }

  private comp(e: NetEdge, veh: VehicleType): EdgeComp {
    const v = this.vehSpeed(e.idx, veh);
    let min = v > 0 ? (e.lenKm / v) * 60 + 0.25 : Infinity;
    if ((veh === 'bus' || veh === 'truck') && !e.arterial) min *= veh === 'truck' ? 1.5 : 1.35;
    const st = this.state(e.idx), dI = this.incDist[e.idx];
    const risk = 0.08 + (this.params().rain ? 0.22 : 0) + (st >= 3 ? 0.3 : st === 2 ? 0.12 : 0) + (dI === 0 ? 0.6 : dI === 1 ? 0.3 : dI === 2 ? 0.12 : 0) + (veh === 'bike' && e.arterial ? 0.2 : 0);
    const load = Math.min(1.3, this.load[e.idx]);
    return { min, km: e.lenKm, load, risk, fuelN: e.lenKm * (1 + 0.9 * load), fuelL: e.lenKm * FUEL_RATE[veh] * (1 + 0.9 * load) };
  }

  private costs(req: RouteRequest) {
    const raw = req.weights ?? PROFILE_WEIGHTS[req.profile ?? 'balanced'];
    const sum = raw.time + raw.dist + raw.cong + raw.fuel + raw.risk || 1;
    const w = { time: raw.time / sum, dist: raw.dist / sum, cong: raw.cong / sum, fuel: raw.fuel / sum, risk: raw.risk / sum };
    const cm = req.vehicle === 'bike' ? 0.3 : req.vehicle === 'emergency' ? 0.5 : 1;
    const comps = this.net.edges.map((e) => this.comp(e, req.vehicle));
    const cost = comps.map((c) => (isFinite(c.min) ? (w.time * c.min) / 1.1 + (w.dist * c.km) / 0.45 + w.cong * c.load * cm + (w.fuel * c.fuelN) / 0.6 + w.risk * c.risk : Infinity));
    return { comps, cost };
  }

  private dijkstra(src: number, dst: number, cost: number[]): { nodes: number[]; edges: number[] } | null {
    if (src === dst) return { nodes: [src], edges: [] };
    const nodes = this.net.nodes, n = nodes.length;
    const dist = new Float64Array(n).fill(Infinity), prev = new Int32Array(n).fill(-1), pe = new Int32Array(n).fill(-1), done = new Uint8Array(n);
    dist[src] = 0;
    for (let it = 0; it < n; it++) {
      let u = -1, best = Infinity;
      for (let i = 0; i < n; i++) if (!done[i] && dist[i] < best) { best = dist[i]; u = i; }
      if (u < 0 || u === dst) break;
      done[u] = 1;
      for (const q of nodes[u].adj) {
        const c = cost[q.e];
        if (!isFinite(c)) continue;
        const nd = dist[u] + c;
        if (nd < dist[q.to]) { dist[q.to] = nd; prev[q.to] = u; pe[q.to] = q.e; }
      }
    }
    if (!isFinite(dist[dst])) return null;
    const outN = [dst], outE: number[] = [];
    let c = dst;
    while (c !== src) { outE.unshift(pe[c]); c = prev[c]; outN.unshift(c); }
    return { nodes: outN, edges: outE };
  }

  private metrics(p: { nodes: number[]; edges: number[] }, C: { comps: EdgeComp[]; cost: number[] }, src: number, dst: number, id: string): Route & { raw: number } {
    let min = 0, km = 0, load = 0, risk = 0, fuel = 0, cost = 0;
    for (const ei of p.edges) {
      const c = C.comps[ei];
      min += isFinite(c.min) ? c.min : 60;
      km += c.km; load += c.load * c.km; risk += c.risk * c.km; fuel += c.fuelL;
      cost += isFinite(C.cost[ei]) ? C.cost[ei] : 50;
    }
    const kmN = km || 1;
    load /= kmN; risk /= kmN;
    const { nodes, edges } = this.net;
    const a = nodes[src], b = nodes[dst];
    const man = Math.max(1, Math.abs(a.i - b.i) + Math.abs(a.j - b.j));
    const streets: string[] = [];
    for (const ei of p.edges) { const s = edges[ei].street; if (streets[streets.length - 1] !== s) streets.push(s); }
    const lvl = (v: number, a1: number, a2: number): Level => (v < a1 ? 'LOW' : v < a2 ? 'MODERATE' : 'HIGH');
    return {
      id,
      nodeIds: p.nodes.map((n) => `n${n}`),
      roadIds: p.edges.map((ei) => edges[ei].id),
      geometry: p.nodes.map((n) => [nodes[n].x, nodes[n].z] as [number, number]),
      streets,
      etaMin: Math.max(1, Math.round(min)),
      distanceKm: Math.round(km * 10) / 10,
      fuelL: Math.round(fuel * 100) / 100,
      totalCost: Math.round(Math.min(0.999, cost / (man * 2)) * 1000) / 1000,
      congestion: lvl(load, 0.45, 0.7),
      risk: lvl(risk, 0.2, 0.38),
      riskIndex: risk,
      raw: cost
    };
  }

  /**
   * Solve a route request against current conditions.
   * Returns primary, up to 2 alternatives and up to 4 rejected candidates,
   * plus the converged Q-bit inclusion probabilities for the decision streets.
   */
  solve(req: RouteRequest): RouteSet {
    const dst = nodeOf(req.destination);
    let src = nodeOf(req.origin);
    if (this.ego?.arrived) this.ego = null;
    const g = req.fromVehicle ? this.ego : null;
    const C = this.costs(req);
    let replaced: Route | null = null, prevPath: number[] | null = null;
    if (g) {
      src = g.path[Math.min(g.idx + 1, g.path.length - 1)];
      const restN = g.path.slice(g.idx + 1);
      const restE: number[] = [];
      for (let i = 0; i < restN.length - 1; i++) restE.push(this.edgeBetween(restN[i], restN[i + 1]));
      if (restE.length && restE.every((x) => x >= 0)) replaced = strip(this.metrics({ nodes: restN, edges: restE }, C, src, dst, 'replaced'));
      prevPath = g.path.slice(g.idx);
    }
    const empty = (reason: 'same' | 'unreachable'): RouteSet => ({ source: 'demo', primary: null, alternatives: [], rejected: [], qState: [], candidates: 0, rerouted: false, replaced: null, reason });
    if (src === dst) return empty('same');
    const prim = this.dijkstra(src, dst, C.cost);
    if (!prim) return empty('unreachable');

    const sig = (p: { edges: number[] }) => p.edges.join(',');
    const seen = new Set([sig(prim)]);
    const pen = C.cost.slice();
    const alts: Array<{ nodes: number[]; edges: number[] }> = [];
    let last = prim;
    for (let k = 0; k < 4 && alts.length < (req.alternatives ?? 2); k++) {
      for (const ei of last.edges) pen[ei] *= 1.7;
      const p = this.dijkstra(src, dst, pen);
      if (p && !seen.has(sig(p))) { seen.add(sig(p)); alts.push(p); last = p; }
    }
    const rej: Array<{ nodes: number[]; edges: number[] }> = [];
    for (let k = 0; k < 16 && rej.length < 4; k++) {
      const nc = C.cost.map((c) => c * (0.45 + Math.random() * 1.8));
      const p = this.dijkstra(src, dst, nc);
      if (p && !seen.has(sig(p))) { seen.add(sig(p)); rej.push(p); }
    }
    const P = this.metrics(prim, C, src, dst, 'primary');
    const A = alts.map((p, i) => this.metrics(p, C, src, dst, `alt-${i + 1}`)).sort((x, y) => x.raw - y.raw);
    const J = rej.map((p, i) => this.metrics(p, C, src, dst, `rej-${i + 1}`)).sort((x, y) => x.raw - y.raw);

    // Q-bit inclusion probability per street, weighted by candidate quality
    const all = [P, ...A, ...J];
    const ws = all.map((r) => Math.exp(-(r.raw - P.raw) / (0.06 * P.raw + 0.01)));
    const wsum = ws.reduce((a, b) => a + b, 0) || 1;
    const pm = new Map<string, number>();
    all.forEach((r, i) => new Set(r.streets).forEach((s) => pm.set(s, (pm.get(s) ?? 0) + ws[i] / wsum)));
    let qState: QState[] = [...pm.entries()]
      .map(([label, p]) => ({ label, probability: Math.min(0.97, Math.max(0.03, p)), selected: P.streets.includes(label) }))
      .sort((a, b) => b.probability - a.probability);
    if (qState.length > 5) qState = [...qState.slice(0, 3), ...qState.slice(-2)];

    if (g) {
      const np = [g.path[g.idx], ...prim.nodes];
      this.ego = { path: np, idx: 0, t: g.t, arrived: false };
      this.prevPath = prevPath;
      P.geometry = np.map((n) => [this.net.nodes[n].x, this.net.nodes[n].z]);
      P.nodeIds = np.map((n) => `n${n}`);
    }
    return {
      source: 'demo',
      primary: strip(P),
      alternatives: A.map((r, i) => ({ ...strip(r), rank: i + 1, status: 'alternative' as const })),
      rejected: J.map((r, i) => ({ ...strip(r), rank: i + 1 + A.length, status: 'rejected' as const })),
      qState,
      candidates: all.length,
      rerouted: !!g,
      replaced: g ? replaced : null
    };
  }

  /** Node index path from route node ids (`n12` → 12). */
  static nodePath(r: Route): number[] { return r.nodeIds.map((s) => Number(s.slice(1))); }
}

function strip<T extends { raw: number }>(r: T): Omit<T, 'raw'> {
  const { raw: _raw, ...rest } = r;
  void _raw;
  return rest;
}

export type { RouteAlternative };
