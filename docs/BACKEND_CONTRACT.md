# Backend contract (proposed)

This is what the frontend calls in **live** mode (`VITE_DATA_SOURCE=live`). It is a proposal: align names with your FastAPI routers and update `src/services/*` if they differ. Types refer to `src/types/domain.ts` — mirror them as Pydantic models.

Base URL: `VITE_API_URL` (default `http://localhost:8000`). WebSocket base: `VITE_WS_URL`.

## REST

| Method | Path | Body | Returns | Used by |
|---|---|---|---|---|
| GET | `/api/health` | — | `SystemHealth` | System, top bar |
| GET | `/api/traffic/state` | — | `TrafficState` | trafficService |
| POST | `/api/routes/evaluate` | `RouteRequest` | `RouteSet` | Route Optimization (instant) |
| POST | `/api/routes/optimize` | `RouteRequest` | `{ runId }` | Command Center |
| GET | `/api/optimization/runs/{id}` | — | `OptimizationRun` | optimizationService |
| POST | `/api/simulation/play` · `/pause` · `/reset` | `{}` | — | Live Simulation |
| POST | `/api/simulation/speed` | `{ speed }` | — | Live Simulation |
| POST | `/api/simulation/scenario` | `{ scenario }` | — | Command Center, Scenarios |
| POST | `/api/simulation/weather` | `{ weather }` | — | Live Simulation |
| POST | `/api/simulation/incidents` | `Incident` | — | Simulate incident |
| DELETE | `/api/simulation/incidents/{id}` | — | — | Clear incident |
| GET | `/api/scenarios` | — | `Scenario[]` | Scenarios |
| PUT | `/api/scenarios/{id}` | `Scenario` | `Scenario` | Scenarios |
| DELETE | `/api/scenarios/{id}` | — | — | Scenarios |
| GET | `/api/experiments/latest` | — | `{ experimentId, fixture: false, results: AlgorithmResult[] }` | Algorithm Lab |
| POST | `/api/experiments/run` | config | `{ experimentId }` | Algorithm Lab |
| GET | `/api/analytics?scenario=&algorithm=&run=&origin=&destination=` | — | `AnalyticsData` | Analytics |

### RouteRequest

```json
{
  "origin": "station",
  "destination": "techpark",
  "vehicle": "car",
  "profile": "balanced",
  "weights": { "time": 0.35, "dist": 0.15, "cong": 0.2, "fuel": 0.1, "risk": 0.2 },
  "fromVehicle": false,
  "alternatives": 2
}
```

`weights` overrides `profile` when present. `fromVehicle: true` means reroute the tracked vehicle from its next node, and fill `RouteSet.replaced` with the remaining old route evaluated under current conditions.

### Route geometry

`Route.geometry` is `Array<[x, z]>` in **scene units** (1 block = 100 = 0.45 km in the demo). Project PostGIS coordinates server-side, or add a projection step in the service.

## WebSockets

Every message: `{ "type": WsEventType, "payload": …, "ts": ISO-8601 }`.

| Channel | Event | Payload |
|---|---|---|
| `/ws/traffic` | `TRAFFIC_UPDATE` | `{ roads: Road[], timestamp }` — `Road.load` 0…1.35 drives colour and stripe width |
| | `VEHICLE_UPDATE` | `{ vehicles: Vehicle[] }` |
| | `INCIDENT_CREATED` | `Incident` |
| | `INCIDENT_UPDATED` | `Incident` (`status: "cleared"` removes it) |
| `/ws/optimization` | `OPTIMIZATION_STARTED` | `OptimizationRun` (status `RUNNING`, iteration 0) |
| | `OPTIMIZATION_ITERATION` | `OptimizationRun` (partial is fine: id, iteration, bestCost, bestFitness, runtimeMs, convergence, qState) |
| | `OPTIMIZATION_COMPLETE` | `OptimizationRun` with `status: "CONVERGED"` and `result: RouteSet` |
| | `ROUTE_UPDATED` | `{ route: Route, alternatives: RouteAlternative[] }` |
| `/ws/simulation` | `SIMULATION_STATE` | `{ running, speed, scenario, clock }` (clock = seconds since midnight) |

The optimization client filters events by `payload.id === runId`.

### qState

```json
[{ "label": "Harbor Ave", "probability": 0.97, "selected": true }]
```

The Q-bit inclusion probability per decision (street or road id) at that iteration. Send 3–6 entries; the panel animates between updates.

## Road states

The frontend derives state from `load` unless you send `state` explicitly:

| load | state |
|---|---|
| < 0.45 | FREE |
| < 0.68 | MODERATE |
| < 0.88 | CONGESTED |
| ≥ 0.88 | SEVERE |
| closed | CLOSED |
