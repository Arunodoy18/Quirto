import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppShell } from './components/shell/AppShell';
import { useWorld } from './hooks/useWorld';
import { scenarioLabel } from './lib/format';
import { isDemo } from './services';

// Each screen is its own chunk; the 3D engine only loads on screens that use it.
const CommandCenter = lazy(() => import('./features/command-center/CommandCenter'));
const RouteOptimization = lazy(() => import('./features/route-optimization/RouteOptimization'));
const LiveSimulation = lazy(() => import('./features/simulation/LiveSimulation'));
const AlgorithmLab = lazy(() => import('./features/algorithm-lab/AlgorithmLab'));
const AnalyticsDashboard = lazy(() => import('./features/analytics/AnalyticsDashboard'));
const Scenarios = lazy(() => import('./features/scenarios/Scenarios'));
const SystemHealth = lazy(() => import('./features/system/SystemHealth'));

export default function App() {
  const { sim } = useWorld();
  const status = {
    sim: sim.running ? 'RUNNING' : 'PAUSED',
    scenario: scenarioLabel(sim.scenario) + (sim.rain && sim.scenario !== 'rain' ? ' + Rain' : ''),
    health: isDemo ? 'Backend not connected' : 'Connected',
    healthOk: !isDemo
  };
  return (
    <AppShell status={status}>
      <Suspense fallback={<div className="empty">Loading…</div>}>
        <Routes>
          <Route path="/" element={<CommandCenter />} />
          <Route path="/route" element={<RouteOptimization />} />
          <Route path="/simulation" element={<LiveSimulation />} />
          <Route path="/lab" element={<AlgorithmLab />} />
          <Route path="/analytics" element={<AnalyticsDashboard />} />
          <Route path="/scenarios" element={<Scenarios />} />
          <Route path="/system" element={<SystemHealth />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}
