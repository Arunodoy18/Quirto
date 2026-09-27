# Build guide — screen by screen

Each step below matches one commit (`git log --oneline --reverse`). Every commit builds and runs, so you can check out any step, look at it with `npm run dev`, and continue from there.

If you are rebuilding a step yourself (by hand, or with Lovable / Claude / Cursor), paste the **Prompt** block — it carries the constraints that keep the product honest and consistent.

**Rules for every step**

- Colours, type and spacing come only from `src/styles/tokens.css`. No new hex values in components.
- Components get data from `src/services/*` or props. Never import `src/mock/*` in a component.
- Demo / simulated values are always labelled in the UI (*Demo data*, *Simulated*, *Demo fixture*).
- Say *quantum-inspired optimization*. Never *quantum computing* or *quantum hardware*. No claims that QIRTO beats other algorithms.
- Sentence-case labels, monospace only for numbers, status values and technical ids.

---

## Step 1 — Foundation

**Build:** Vite + React + TypeScript, router, design tokens, app shell (76 px icon rail, 52 px top bar), placeholder screens.

**Files:** `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/config.ts`, `src/styles/tokens.css`, `src/styles/base.css`, `src/components/shell/*`

**Check:** `npm run dev` → all 7 nav items route to a placeholder, top bar shows *Demo data*.

**Prompt**
```
Set up a Vite + React 19 + TypeScript app called QIRTO with react-router. Create a
dark "graphite console" design system in CSS variables: neutral charcoal surfaces
(#111214 bg, #17181b panel, #2a2c31 lines), text #e6e6e3 / muted #898b90, ONE accent
signal amber #d99a2b used only for actions and selection, muted status colours
(ok #5dae7b, warn #c9a23c, danger #d0493f). IBM Plex Sans for UI, IBM Plex Mono only
for numbers/status. Square-ish 3px radii, 1px hairline borders, no gradients, no glow,
no glassmorphism, sentence-case labels. App shell: 76px icon rail (Command Center,
Route Optimization, Live Simulation, Algorithm Lab, Analytics, Scenarios, System) and a
52px top bar (QIRTO / page title, Demo-data indicator, simulation status, scenario,
health, settings, profile).
```

## Step 2 — Data layer

**Build:** domain types, the demo traffic engine, the service layer with demo and live adapters, the WebSocket client, the world store.

**Files:** `src/types/domain.ts`, `src/mock/*`, `src/services/*`, `src/hooks/useWorld.ts`, `src/lib/format.ts`

**Key ideas**
- `TrafficEngine` (demo) models link loads, incident spill-back (1–2 links), vehicles, a tracked vehicle, and solves routes with a weighted multi-objective cost (time, distance, congestion, fuel, risk). It returns primary + 2 alternatives + 4 rejected candidates and converged Q-bit inclusion probabilities per street.
- `optimizationService.start()` — live: `POST /api/routes/optimize` then stream `/ws/optimization`. Demo: solve locally, animate the run (labelled *Simulated*); the final best cost equals the solved route cost.
- `world.ts` is a tiny external store read with `useSyncExternalStore` (≈2.5 updates/s).

**Check:** top bar scenario/simulation values come from the world store.

**Prompt**
```
Add a typed service layer. Types: TrafficState, Road, Vehicle, Incident, Route,
RouteAlternative, RouteSet, OptimizationRun, AlgorithmResult, Scenario, SystemHealth,
WsEvent. Services: api.ts (fetch wrapper on VITE_API_URL), trafficService,
routeService, optimizationService, simulationService, websocketService (channels
/ws/traffic, /ws/optimization, /ws/simulation, auto-reconnect with backoff),
scenarioService, experimentService, analyticsService, healthService. Each service has
a demo branch (local mock engine + local event bus emitting the same event names) and a
live branch (REST + WebSocket). Components must never import the mock folder.
```

## Step 3 — 3D digital twin

**Build:** `ThreeCity` with React Three Fiber — ground, water, park, instanced roads (base + state-coloured stripe whose width grows with load + congestion halo), instanced buildings with a merged edge outline, instanced vehicles, signals, rain, route layer, incident layer, O/D pins and landmark labels, and a `CameraController` with 6 eased modes.

**Files:** `src/components/three/*`

**Camera modes:** overview (slow drift) · network (frames O/D) · route (frames the route) · incident (orbits the latest incident) · optimization (analytical top-down, north up) · follow (chases the tracked vehicle). Drag orbits, wheel zooms, double-click resets.

**Check:** the city renders, vehicles move, road colours change with scenario.

**Prompt**
```
Build a lightweight stylized digital twin with React Three Fiber (not photorealistic).
Read live scene state every frame from trafficService.scene() inside useFrame; use
InstancedMesh for roads, buildings and vehicles. Road states FREE/MODERATE/CONGESTED/
SEVERE/CLOSED use the road colour tokens and differ in lightness too. Routes: primary
= off-white with dark casing, draws itself from origin to destination with moving
dashes; alternatives = mid-grey dashed; rejected = dark grey dotted. Incidents: pulsing
ground ring + marker. Camera modes overview/network/route/incident/optimization/follow
with smooth easing. Performance over decoration: no particles, no bloom.
```

## Step 4 — Command Center

**Build:** the landing screen. Left: route request + result card. Centre: digital twin with camera switcher, stage banner, legend. Right: live intelligence (6 stats, road-state distribution), Demo mode (12 steps), event stream. Bottom: optimization stats, convergence chart, quantum-inspired search state.

**Files:** `src/features/command-center/*`, `src/components/charts/LineChart.tsx`

**The director** (`useCommandCenter.ts`) owns the request, the run, the camera, the banner and the demo sequence. Incident flow: accident placed on the road just ahead of the tracked vehicle → cost rises → congestion spreads → re-optimization from the vehicle's position → vehicle reroutes → old-vs-new ETA shown on the card.

**Check:** *Run demo sequence* completes all 12 steps; *Optimize route* then *Simulate incident* reroutes the vehicle.

**Prompt**
```
Build the Command Center: left control panel (origin, destination, vehicle
car/bike/bus/truck/emergency, profile balanced/fastest/fuel/safety, scenario, primary
"Optimize route", secondary "Simulate incident"), centre 3D twin, right live
intelligence, bottom optimization panel (iteration, population, best cost, best
fitness, runtime, status), a convergence chart and a "Quantum-inspired search state"
panel of street inclusion probabilities that animate during the run and end as
SELECTED / PRUNED. Implement Demo Mode as a timed 12-step sequence driven only through
services. Label simulated values.
```

## Step 5 — Route Optimization

**Build:** request form, 5 objective-weight sliders + presets (live recompute via `routeService.evaluate`), top-down map with rejected candidates visible, candidate table, ETA-vs-risk scatter, backend request preview.

**Files:** `src/features/route-optimization/*`

**Check:** dragging *Risk* up changes the primary route and the table re-sorts.

## Step 6 — Live Simulation

**Build:** toolbar (play, pause, reset, speed 0.5/1/2/5×, accident, congestion, rain, road closure), large twin with clock, network-state panel, active-incident list with clear, three 30-second trend charts.

**Files:** `src/features/simulation/*`

**Check:** inject an accident → camera jumps to it, severe link appears, avg speed drops on the trend chart.

## Step 7 — Algorithm Lab

**Build:** experiment config, banner that states the data source, 5 algorithm cards, comparison table with lowest-value-per-metric highlight, metric bar chart, convergence chart. Demo mode shows a **labelled layout fixture** that can be hidden to show the empty state.

**Files:** `src/features/algorithm-lab/*`, `src/components/charts/BarList.tsx`

**Rule:** never present fixture numbers as results. Live mode reads `GET /api/experiments/latest`.

## Step 8 — Analytics

**Build:** filter bar (scenario, algorithm, run, origin, destination) and 7 charts.

**Files:** `src/features/analytics/*`

## Step 9 — Scenario Manager

**Build:** scenario library (6 presets + custom), editor (name, density, weather, O/D, accidents, closures, vehicle mix normalised to 100 %), save / revert / duplicate / delete, payload preview, apply to simulation.

**Files:** `src/features/scenarios/*`

## Step 10 — System Health

**Build:** data-source bar, 5 service cards (with *Cycle mock state* in demo mode to preview every state), WebSocket channel table, event contract, health log.

**Files:** `src/features/system/*`

## Step 11 — Polish & docs

Route-level code splitting (the 3D engine loads only where used), README, these docs, CI.

---

## Next: connecting the backend

1. Implement the endpoints and events in [`BACKEND_CONTRACT.md`](BACKEND_CONTRACT.md) in FastAPI.
2. Set `VITE_DATA_SOURCE=live` in `.env`.
3. Road ids must match the scene network, or replace `src/mock/network.ts` geometry with PostGIS geometry projected to scene coordinates (see ARCHITECTURE.md → *Replacing the demo network*).
4. Algorithm Lab and Analytics switch to backend data automatically; the fixture labels disappear.
