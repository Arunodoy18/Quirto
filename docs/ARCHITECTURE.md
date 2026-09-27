# Architecture

## Layers

```
┌──────────────────────────────────────────────────────────────┐
│ features/*            screens (Command Center, Route Opt, …) │
│ components/*          shell · three (digital twin) · charts  │
├──────────────────────────────────────────────────────────────┤
│ hooks/                useWorld · useAsync · useElementWidth  │
├──────────────────────────────────────────────────────────────┤
│ services/             one module per domain, same API in     │
│                       demo and live                          │
│   ├─ demo branch  →   mock/  (TrafficEngine, optimizerSim,   │
│   │                           fixtures, eventBus)            │
│   └─ live branch  →   FastAPI REST  +  /ws/* WebSockets      │
├──────────────────────────────────────────────────────────────┤
│ types/domain.ts       the contract shared by all of the above │
└──────────────────────────────────────────────────────────────┘
```

Rule: `features/` and `components/` import from `services/`, `hooks/`, `types/`, `lib/` — never from `mock/`. (The two exceptions are static reference data: `mock/network` for place names/landmarks and `mock/fixtures` metadata for algorithm names and colours. Move those to the backend when it exists.)

## World store

`services/world.ts` holds the live traffic state:

- `scene` — the object the 3D view reads every frame (loads, closures, vehicles, tracked vehicle). In demo it is a `TrafficEngine` ticking on `requestAnimationFrame`; in live mode `services/live/liveWorld.ts` applies `TRAFFIC_UPDATE`, `INCIDENT_*` and `SIMULATION_STATE` payloads to it.
- `getSnapshot()` — `{ stats, sim, incidents }`, rebuilt ~2.5×/s and on every action; React reads it with `useWorld()` (`useSyncExternalStore`).

High-frequency data (vehicle positions) never goes through React state — only the Three.js layers read it, inside `useFrame`.

## Optimization flow

```
Command Center ──start(req)──▶ optimizationService
                                 │ live: POST /api/routes/optimize → runId
                                 │       /ws/optimization OPTIMIZATION_* events (filtered by runId)
                                 │ demo: TrafficEngine.solve(req) → RouteSet
                                 │       simulateRun() animates iterations (labelled SIMULATED)
                                 ▼
                     onUpdate(OptimizationRun)  … status RUNNING → CONVERGED
```

`OptimizationRun.result` is a `RouteSet`: primary, alternatives, rejected, `qState` (quantum-inspired search state: per-street inclusion probability), candidate count, and for reroutes `replaced` — the old remaining route re-evaluated under current conditions, which powers the *Old route vs Rerouted* line.

## Command Center director

`features/command-center/useCommandCenter.ts` is a small state machine:

| Stage | Trigger | Camera | Route phase |
|---|---|---|---|
| 1 Load city | demo start | overview | none |
| 2 Normal traffic | +2.2 s | overview | none |
| 3 Select O/D | +5.6 s | network | none |
| 4 Run optimization | +8.8 s → `optimize()` | network | candidates |
| 5 Candidate routes | +0.9 s | network | candidates |
| 6 QIRTO optimization | first RUNNING update | optimization (top-down) | optimizing |
| 7 Optimized route | CONVERGED | route → follow | final |
| 8 Accident | `incident()` on the road ahead of the vehicle | incident | final |
| 9 Congestion propagates | +3.9 s | incident | final |
| 10 Re-optimization | +6.2 s → `optimize(true)` from vehicle position | route → optimization | candidates → optimizing |
| 11 Vehicle reroutes | CONVERGED | follow | final |
| 12 Final metrics | +6.5 s | route | final |

All timers live in one ref and are cleared on stop/reset/unmount.

## 3D scene

`components/three/ThreeCity.tsx` composes:

| Layer | Technique |
|---|---|
| `Ground` | planes + one `lineSegments` grid |
| `RoadNetwork` | 3 `InstancedMesh`: asphalt, state stripe (width ∝ load), congestion halo |
| `Buildings` | `InstancedMesh` + one merged edge `lineSegments` |
| `VehicleLayer` | `InstancedMesh` cars + buses, tracked vehicle mesh + pulse ring |
| `SignalLayer` | instanced spheres, colour per frame |
| `RouteLayer` | Drei `Line` (fat lines); primary animates via `geometry.setPositions` |
| `IncidentLayer` | ring + marker per incident |
| `Markers` | O/D pins and landmark labels via Drei `Html` |
| `RainLayer` | 1 400 falling line segments |
| `CameraController` | eased yaw / pitch / distance / target per mode + drag/zoom offsets |

Scene units: 1 block = 100 units = 0.45 km. The group is offset by the city centre so the camera orbits (0, 0, 0).

### Replacing the demo network

1. Serve nodes and roads (PostGIS) with a `projection` to scene units, e.g. local metres ÷ 4.5.
2. Build a `Network` object with the same shape as `mock/network.ts#buildNetwork()` from that payload.
3. Instantiate `world.scene` with it (add a constructor argument to `TrafficEngine`, or a thin `LiveScene` class exposing the same fields: `net`, `load`, `state(i)`, `vehicles`, `egoPose()`, `prevPath`, `clock`, `params()`).

Nothing in `components/three` needs to change.

## Adding a screen

1. `src/features/<name>/<Name>.tsx` (+ css).
2. Add a lazy route in `App.tsx` and an entry in `components/shell/nav.ts`.
3. Read data through a service; add a demo branch in the service if the backend is not ready, and label it in the UI.
