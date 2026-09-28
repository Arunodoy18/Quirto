/**
 * QIRTO domain types.
 * These are the contract between UI, services and backend. Components only
 * ever see these shapes — never raw mock or API payloads.
 */
import type { DataSource } from '@/config';

export type RoadState = 'FREE' | 'MODERATE' | 'CONGESTED' | 'SEVERE' | 'CLOSED';
export const ROAD_STATES: RoadState[] = ['FREE', 'MODERATE', 'CONGESTED', 'SEVERE', 'CLOSED'];

export type VehicleType = 'car' | 'bike' | 'bus' | 'truck' | 'emergency';
export type ProfileKey = 'balanced' | 'fastest' | 'fuel' | 'safety';
export type ScenarioKey = 'normal' | 'peak' | 'accident' | 'rain' | 'closure' | 'multi';
export type IncidentType = 'accident' | 'closure' | 'congestion';
export type Level = 'LOW' | 'MODERATE' | 'HIGH';
export type CameraMode = 'overview' | 'network' | 'route' | 'incident' | 'optimization' | 'follow';
export type RoutePhase = 'none' | 'candidates' | 'optimizing' | 'final';

/** Objective weights; normalized to sum 1 before use. */
export interface Weights { time: number; dist: number; cong: number; fuel: number; risk: number }

export interface Place { id: string; name: string }

export interface Road {
  id: string;
  from: string;
  to: string;
  street: string;
  lengthKm: number;
  arterial: boolean;
  state: RoadState;
  load: number;
  speedKmh: number;
}

export interface Vehicle { id: string; type: VehicleType; roadId: string; progress: number; speedKmh: number }

export interface Incident {
  id: string;
  roadId: string;
  type: IncidentType;
  createdAt: string;
  severity?: 1 | 2 | 3;
  status?: 'active' | 'cleared';
}

export interface Route {
  id: string;
  nodeIds: string[];
  roadIds: string[];
  /** polyline in scene coordinates (x, z) — backend converts from PostGIS geometry */
  geometry: Array<[number, number]>;
  streets: string[];
  etaMin: number;
  distanceKm: number;
  fuelL: number;
  totalCost: number;
  congestion: Level;
  risk: Level;
  riskIndex: number;
}

export interface RouteAlternative extends Route { rank: number; status: 'alternative' | 'rejected' }

/** One entry of the quantum-inspired search state (Q-bit inclusion probability). */
export interface QState { label: string; probability: number; selected: boolean }

export interface RouteSet {
  source: DataSource;
  primary: Route | null;
  alternatives: RouteAlternative[];
  rejected: RouteAlternative[];
  /** converged Q-bit probabilities for the decision streets */
  qState: QState[];
  candidates: number;
  rerouted: boolean;
  /** the remaining old route evaluated under current conditions (reroutes only) */
  replaced: Route | null;
  reason?: 'same' | 'unreachable';
}

export interface RouteRequest {
  origin: string;
  destination: string;
  vehicle: VehicleType;
  profile?: ProfileKey;
  weights?: Weights;
  /** reroute from the tracked vehicle's current position */
  fromVehicle?: boolean;
  alternatives?: number;
}

export type OptimizationStatus = 'IDLE' | 'INITIALIZING' | 'RUNNING' | 'CONVERGED' | 'ERROR' | 'NO ROUTE';

export interface OptimizationRun {
  id: string;
  source: DataSource;
  status: OptimizationStatus;
  iteration: number;
  maxIterations: number;
  population: number;
  bestCost: number | null;
  bestFitness: number | null;
  runtimeMs: number;
  convergence: Array<{ iteration: number; cost: number }>;
  qState: QState[];
  result: RouteSet | null;
}

export interface TrafficStats {
  source: DataSource;
  vehicles: number;
  avgSpeedKmh: number;
  congestedPct: number;
  utilizationPct: number;
  incidents: number;
  stateCounts: Record<RoadState, number>;
  nodes: number;
  links: number;
  /** simulation clock, seconds since midnight */
  clock: number;
}

export interface SimulationState { running: boolean; speed: number; scenario: ScenarioKey; rain: boolean }

export type AlgorithmKey = 'dijkstra' | 'astar' | 'ga' | 'pso' | 'qirto';

export interface AlgorithmResult {
  experimentId: string;
  algorithm: AlgorithmKey;
  travelTimeMin: number;
  distanceKm: number;
  congestion: number;
  fuelL: number;
  risk: number;
  totalCost: number;
  runtimeMs: number;
  iterations: number;
  runs: number;
  convergence?: Array<{ iteration: number; cost: number }>;
}

export type Weather = 'clear' | 'rain' | 'heavy_rain' | 'fog';

export interface Scenario {
  id: string;
  name: string;
  preset: boolean;
  density: number;
  weather: Weather;
  closures: string[];
  accidents: number;
  vehicleMix: Record<VehicleType, number>;
  origin: string;
  destination: string;
}

export type Conn = 'CONNECTED' | 'DISCONNECTED';
export type OptimizerState = 'READY' | 'RUNNING' | 'ERROR';

export interface SystemHealth {
  sumo: Conn;
  fastapi: Conn;
  optimizer: OptimizerState;
  websocket: Conn;
  database: Conn;
  checkedAt: string;
}

/** Events carried on /ws/traffic, /ws/optimization, /ws/simulation */
export type WsEventType =
  | 'TRAFFIC_UPDATE'
  | 'VEHICLE_UPDATE'
  | 'INCIDENT_CREATED'
  | 'INCIDENT_UPDATED'
  | 'OPTIMIZATION_STARTED'
  | 'OPTIMIZATION_ITERATION'
  | 'OPTIMIZATION_COMPLETE'
  | 'ROUTE_UPDATED'
  | 'SIMULATION_STATE';

export interface WsEvent<T = unknown> { type: WsEventType; payload: T; ts: string }

export interface TrafficState {
  timestamp: string;
  source: DataSource | 'sumo';
  roads: Road[];
  vehicles: Vehicle[];
  incidents: Incident[];
}
