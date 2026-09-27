/**
 * DEMO road network — a synthetic 10 × 8 city grid.
 * Scene units: 100 units = one block = 0.45 km.
 * Replace with PostGIS geometry from the backend in LIVE mode.
 */
import type { Place } from '@/types/domain';

export const NX = 10;
export const NZ = 8;
export const BLOCK = 100;
export const BLOCK_KM = 0.45;
export const CITY_CENTER: [number, number] = [450, 350];

export const ROW_STREETS = ['North Ave', 'Market St', 'Canal Rd', 'Central Blvd', 'Harbor Ave', 'Mill St', 'Station Rd', 'South Ave'];
export const COL_STREETS = ['Pier Ln', '1st Cross', '2nd Cross', 'Temple Rd', 'University Expy', '5th Cross', 'Park Rd', 'Tech Corridor', '8th Cross', 'Airport Rd'];

/** Landmarks usable as origin / destination. [column, row, name] */
export const LANDMARKS: Record<string, [number, number, string]> = {
  station: [1, 6, 'Central Station'],
  techpark: [8, 1, 'Tech Park'],
  hospital: [7, 5, 'City Hospital'],
  market: [2, 2, 'Old Market'],
  university: [4, 0, 'University'],
  harbor: [0, 4, 'Harbor Terminal'],
  stadium: [5, 7, 'Stadium'],
  airport: [9, 6, 'Airport Link']
};

export const PLACES: Place[] = Object.entries(LANDMARKS).map(([id, l]) => ({ id, name: l[2] }));
export const placeName = (id: string) => LANDMARKS[id]?.[2] ?? id;

const REMOVED = new Set(['v-2-4', 'v-5-1', 'v-8-5', 'h-6-6', 'h-1-1']);
export const PARK_BLOCK: [number, number] = [5, 4];

export interface NetNode { idx: number; i: number; j: number; x: number; z: number; adj: Array<{ e: number; to: number }> }
export interface NetEdge {
  idx: number;
  id: string;
  a: number;
  b: number;
  street: string;
  arterial: boolean;
  lenKm: number;
  base: number;
  phase: number;
  /** neighbouring edge indices (share a node) */
  nb: number[];
}
export interface Building { x: number; z: number; w: number; d: number; h: number; tech: boolean }

/** Deterministic PRNG so the city looks identical on every load. */
export function mulberry32(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Network {
  nodes: NetNode[];
  edges: NetEdge[];
  byId: Map<string, NetEdge>;
  buildings: Building[];
}

export function buildNetwork(): Network {
  const R = mulberry32(1337);
  const nodes: NetNode[] = [];
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) nodes.push({ idx: nodes.length, i, j, x: i * BLOCK, z: j * BLOCK, adj: [] });
  const edges: NetEdge[] = [];
  const byId = new Map<string, NetEdge>();
  const add = (id: string, a: number, b: number, street: string, arterial: boolean) => {
    if (REMOVED.has(id)) return;
    const na = nodes[a], nb = nodes[b];
    const mx = (na.x + nb.x) / 2, mz = (na.z + nb.z) / 2;
    const centre = 0.14 * Math.max(0, 1 - Math.hypot(mx - 420, mz - 330) / 460);
    const e: NetEdge = { idx: edges.length, id, a, b, street, arterial, lenKm: BLOCK_KM, base: 0.14 + R() * 0.2 + (arterial ? 0.13 : 0) + centre, phase: R() * 6.28, nb: [] };
    edges.push(e);
    byId.set(id, e);
    na.adj.push({ e: e.idx, to: b });
    nb.adj.push({ e: e.idx, to: a });
  };
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX - 1; i++) add(`h-${i}-${j}`, j * NX + i, j * NX + i + 1, ROW_STREETS[j], j === 3);
  for (let i = 0; i < NX; i++) for (let j = 0; j < NZ - 1; j++) add(`v-${i}-${j}`, j * NX + i, (j + 1) * NX + i, COL_STREETS[i], i === 4 || i === 7);
  for (const e of edges) {
    const s = new Set<number>();
    for (const n of [e.a, e.b]) for (const q of nodes[n].adj) if (q.e !== e.idx) s.add(q.e);
    e.nb = [...s];
  }

  const buildings: Building[] = [];
  for (let bj = 0; bj < NZ - 1; bj++) for (let bi = 0; bi < NX - 1; bi++) {
    if (bi === PARK_BLOCK[0] && bj === PARK_BLOCK[1]) continue;
    const x0 = bi * BLOCK, z0 = bj * BLOCK;
    const tech = bi >= 7 && bj <= 1;
    const cen = Math.max(0, 1 - Math.hypot(x0 + 50 - 420, z0 + 50 - 330) / 420);
    const r0 = R();
    const lots = r0 < 0.3 ? [[0, 0, 2, 2]] : r0 < 0.6 ? [[0, 0, 1, 2], [1, 0, 1, 2]] : [[0, 0, 1, 1], [1, 0, 1, 1], [0, 1, 1, 1], [1, 1, 1, 1]];
    for (const l of lots) {
      if (R() < 0.12) continue;
      const pad = 17, cell = (BLOCK - pad * 2) / 2, gap = 6;
      buildings.push({
        x: x0 + pad + l[0] * cell + gap / 2,
        z: z0 + pad + l[1] * cell + gap / 2,
        w: l[2] * cell - gap,
        d: l[3] * cell - gap,
        h: 7 + R() * 20 + cen * 50 * (0.5 + R()) + (tech ? 26 + R() * 30 : 0),
        tech
      });
    }
  }
  return { nodes, edges, byId, buildings };
}

export const nodeOf = (placeId: string) => {
  const l = LANDMARKS[placeId] ?? LANDMARKS.station;
  return l[1] * NX + l[0];
};

export const streetOfRoad = (roadId: string) => {
  const p = roadId.split('-');
  return p[0] === 'h' ? ROW_STREETS[+p[2]] : COL_STREETS[+p[1]];
};
