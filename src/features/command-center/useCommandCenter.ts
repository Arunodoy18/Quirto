/**
 * Command Center director.
 * Owns the route request, the optimization run, the camera, the banner and
 * the 12-step Demo Mode sequence. Talks only to services.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CameraMode, OptimizationRun, ProfileKey, RoutePhase, RouteSet, ScenarioKey, VehicleType, WsEvent } from '@/types/domain';
import { optimizationService, simulationService, websocketService } from '@/services';
import { placeName, streetOfRoad } from '@/mock/network';
import { PROFILES, clockStr } from '@/lib/format';
import { trafficService } from '@/services';

export type BannerLevel = 'info' | 'ok' | 'warn' | 'danger';
export interface Banner { title: string; detail: string; level: BannerLevel }
export interface LogRow { id: number; t: string; type: string; msg: string }
export type DemoState = 'off' | 'running' | 'done';

export const DEMO_STEPS = [
  'Load city', 'Normal traffic', 'Select origin / destination', 'Run optimization', 'Candidate routes', 'QIRTO optimization',
  'Optimized route', 'Accident triggered', 'Congestion propagates', 'Re-optimization', 'Vehicle reroutes', 'Final metrics'
];

export interface CommandCenterState {
  origin: string;
  destination: string;
  vehicle: VehicleType;
  profile: ProfileKey;
  phase: RoutePhase;
  camera: CameraMode;
  routes: RouteSet | null;
  run: OptimizationRun | null;
  optT: number;
  showOD: boolean;
  tracking: boolean;
  stage: number;
  demo: DemoState;
  banner: Banner | null;
  busy: boolean;
  stale: boolean;
  log: LogRow[];
}

const INITIAL: CommandCenterState = {
  origin: 'station', destination: 'techpark', vehicle: 'car', profile: 'balanced',
  phase: 'none', camera: 'overview', routes: null, run: null, optT: 0, showOD: true, tracking: false,
  stage: -1, demo: 'off', banner: null, busy: false, stale: false, log: []
};

export function useCommandCenter() {
  const [s, setS] = useState<CommandCenterState>(INITIAL);
  const ref = useRef(s);
  ref.current = s;
  const set = useCallback((p: Partial<CommandCenterState>) => setS((prev) => ({ ...prev, ...p })), []);

  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const runHandle = useRef<{ cancel: () => void } | null>(null);
  const demoOn = useRef(false);
  const bannerTok = useRef(0);
  const logId = useRef(0);

  const after = (ms: number, fn: () => void) => { timers.current.push(setTimeout(fn, ms)); };
  const clearAll = () => { timers.current.forEach(clearTimeout); timers.current = []; runHandle.current?.cancel(); runHandle.current = null; };
  useEffect(() => () => clearAll(), []);

  const log = useCallback((type: string, msg: string) => {
    const t = clockStr(trafficService.getSnapshot().stats.clock);
    setS((prev) => ({ ...prev, log: [{ id: ++logId.current, t, type, msg }, ...prev.log].slice(0, 14) }));
  }, []);

  // Mirror backend-style events into the stream (local bus in DEMO, websockets in LIVE).
  useEffect(() => {
    const on = (e: WsEvent) => {
      const p = e.payload as Record<string, unknown>;
      if (e.type === 'OPTIMIZATION_ITERATION') log(e.type, `iter ${p.iteration} · best cost ${Number(p.bestCost).toFixed(3)}`);
      else if (e.type === 'OPTIMIZATION_COMPLETE') log(e.type, `Converged · cost ${Number(p.bestCost).toFixed(3)}`);
      else if (e.type === 'INCIDENT_CREATED') log(e.type, `${String(p.type)} on ${streetOfRoad(String(p.roadId))}`);
      else if (e.type === 'SIMULATION_STATE') log(e.type, `Scenario ${String(p.scenario)}${p.running ? '' : ' · paused'}`);
    };
    const offs = [websocketService.on('/ws/optimization', on), websocketService.on('/ws/traffic', on), websocketService.on('/ws/simulation', on)];
    return () => offs.forEach((f) => f());
  }, [log]);

  const banner = useCallback((title: string, detail: string, level: BannerLevel) => {
    const tok = ++bannerTok.current;
    set({ banner: { title, detail, level } });
    if (!demoOn.current) after(4200, () => { if (bannerTok.current === tok) set({ banner: null }); });
  }, [set]);

  const stage = (n: number) => { if (demoOn.current) set({ stage: n }); };

  // ------------------------------------------------------------------ optimize
  const optimize = useCallback((reopt = false, done?: (ok: boolean) => void) => {
    runHandle.current?.cancel();
    const st = ref.current;
    const prof = PROFILES.find((p) => p[0] === st.profile)?.[1] ?? '';
    stage(reopt ? 9 : 3);
    banner(reopt ? 'QIRTO re-optimization' : 'Run optimization', reopt ? 'Recomputing from the vehicle position under updated link costs' : `${placeName(st.origin)} → ${placeName(st.destination)} · ${prof}`, 'info');
    log('OPTIMIZATION_STARTED', reopt ? 'Re-optimization after incident' : `${placeName(st.origin)} → ${placeName(st.destination)} · ${prof}`);
    if (!reopt) simulationService.untrackVehicle();
    set({ busy: true, stale: false, phase: 'candidates', camera: reopt ? 'route' : 'network', showOD: true, run: null, optT: 0, tracking: reopt ? st.tracking : false });

    let started = false;
    const handle = optimizationService.start(
      { origin: st.origin, destination: st.destination, vehicle: st.vehicle, profile: st.profile, fromVehicle: reopt },
      (run) => {
        if (run.status === 'INITIALIZING') { set({ routes: run.result }); return; }
        if (run.status === 'NO ROUTE') return;
        if (!started) {
          started = true;
          if (!reopt) stage(5);
          banner('QIRTO optimization', `Quantum-inspired population search · ${run.result?.candidates ?? ref.current.routes?.candidates ?? ''} seeded candidates`, 'info');
          set({ phase: 'optimizing', camera: 'optimization' });
        }
        set({ run, optT: run.maxIterations ? run.iteration / run.maxIterations : 0 });
      },
      { short: reopt, delayMs: reopt ? 1400 : 2700 }
    );
    runHandle.current = handle;
    if (!reopt) after(900, () => { stage(4); banner('Candidate routes', `${ref.current.routes?.candidates ?? 'Multiple'} candidate paths generated from the network graph`, 'info'); });

    void handle.done.then((run) => {
      const rs = run.result ?? ref.current.routes;
      if (!rs?.primary) {
        const why = rs?.reason === 'same' ? 'Origin and destination are the same' : 'Destination unreachable under current closures';
        set({ busy: false, phase: 'none', run: { ...run, status: 'NO ROUTE' } });
        banner('No feasible route', why, 'danger');
        done?.(false);
        return;
      }
      const p = rs.primary;
      log('ROUTE_UPDATED', `${reopt ? 'Reroute' : 'Route'} via ${p.streets.slice(0, 3).join(' → ')}`);
      if (!reopt) stage(6);
      banner(reopt ? 'New route' : 'Optimized route', `ETA ${p.etaMin} min · ${p.distanceKm.toFixed(1)} km · cost ${p.totalCost.toFixed(3)}`, 'ok');
      set({ busy: false, phase: 'final', camera: 'route', routes: rs });
      if (!reopt) after(1400, () => { simulationService.trackVehicle(p, ref.current.vehicle); set({ tracking: true }); });
      done?.(true);
    });
  }, [banner, log, set]);

  // ------------------------------------------------------------------ incident
  const incident = useCallback((done?: () => void) => {
    const snap = trafficService.getSnapshot();
    const taken = new Set(snap.incidents.map((i) => i.roadId));
    let road = simulationService.trackedAheadRoad();
    const primary = ref.current.routes?.primary;
    if (!road && primary) road = primary.roadIds[Math.floor(primary.roadIds.length / 2)];
    if (!road || taken.has(road)) road = simulationService.randomRoad();
    const street = streetOfRoad(road);
    stage(7);
    simulationService.injectIncident(road, 'accident');
    set({ camera: 'incident', busy: true });
    banner('Accident detected', `${street} · link ${road}`, 'danger');
    after(1900, () => { banner('Road cost increases', `${street} → SEVERE · link cost rising`, 'warn'); log('TRAFFIC_UPDATE', `${street} state SEVERE`); });
    after(3900, () => { stage(8); banner('Congestion propagates', 'Spill-back into adjacent links', 'warn'); log('INCIDENT_UPDATED', `Congestion propagating from ${street}`); });
    after(6200, () => {
      if (!simulationService.isTracking() || !ref.current.routes?.primary) { set({ busy: false }); done?.(); return; }
      optimize(true, () => {
        stage(10);
        set({ camera: demoOn.current ? 'follow' : 'route' });
        after(1800, () => { banner('Vehicle reroutes', 'Continuing on the updated route', 'ok'); log('VEHICLE_UPDATE', 'Vehicle rerouted'); done?.(); });
      });
    });
  }, [banner, log, optimize, set]);

  // ------------------------------------------------------------------ demo
  const stopDemo = useCallback(() => {
    clearAll();
    demoOn.current = false;
    set({ demo: 'off', stage: -1, busy: false, banner: null });
  }, [set]);

  const reset = useCallback(() => {
    clearAll();
    demoOn.current = false;
    simulationService.untrackVehicle();
    setS((prev) => ({ ...INITIAL, origin: prev.origin, destination: prev.destination, vehicle: prev.vehicle, profile: prev.profile, log: prev.log }));
  }, []);

  const runDemo = useCallback(() => {
    clearAll();
    demoOn.current = true;
    simulationService.untrackVehicle();
    simulationService.setScenario('normal');
    simulationService.setRain(false);
    setS({ ...INITIAL, demo: 'running', stage: 0, showOD: false, busy: true });
    banner('Load city', 'Demo road network · synthetic traffic model', 'info');
    log('SIMULATION_STATE', 'Demo network loaded');
    after(2200, () => { set({ stage: 1 }); banner('Normal traffic', 'Free-flow conditions · no active incidents', 'ok'); });
    after(5600, () => { set({ stage: 2, showOD: true, camera: 'network' }); banner('Origin → destination', 'Central Station → Tech Park · Car · Balanced', 'info'); });
    after(8800, () => optimize(false, (ok) => {
      if (!ok) { stopDemo(); return; }
      after(2600, () => { set({ camera: 'follow' }); banner('Vehicle en route', 'Camera following the optimized vehicle', 'info'); log('VEHICLE_UPDATE', 'Vehicle departed Central Station'); });
      after(7400, () => incident(() => {
        after(6500, () => {
          demoOn.current = false;
          set({ stage: 11, camera: 'route', busy: false, demo: 'done' });
          banner('Final metrics', 'Demo sequence complete — see the route card', 'ok');
          log('SIMULATION_STATE', 'Demo sequence complete');
        });
      }));
    }));
  }, [banner, incident, log, optimize, set, stopDemo]);

  return {
    state: s,
    setOrigin: (origin: string) => set({ origin, stale: !!ref.current.routes }),
    setDestination: (destination: string) => set({ destination, stale: !!ref.current.routes }),
    setVehicle: (vehicle: VehicleType) => set({ vehicle, stale: !!ref.current.routes }),
    setProfile: (profile: ProfileKey) => set({ profile, stale: !!ref.current.routes }),
    setScenario: (sc: ScenarioKey) => { simulationService.setScenario(sc); set({ stale: !!ref.current.routes }); },
    setCamera: (camera: CameraMode) => set({ camera }),
    optimize: () => optimize(false),
    incident: () => incident(),
    runDemo,
    stopDemo,
    reset
  };
}
