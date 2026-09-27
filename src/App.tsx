import { Route, Routes } from 'react-router-dom';
import { AppShell } from './components/shell/AppShell';
import { Placeholder } from './components/ui/Placeholder';
import CommandCenter from './features/command-center/CommandCenter';
import RouteOptimization from './features/route-optimization/RouteOptimization';
import LiveSimulation from './features/simulation/LiveSimulation';
import AlgorithmLab from './features/algorithm-lab/AlgorithmLab';
import AnalyticsDashboard from './features/analytics/AnalyticsDashboard';
import Scenarios from './features/scenarios/Scenarios';
import { useWorld } from './hooks/useWorld';
import { scenarioLabel } from './lib/format';
import { isDemo } from './services';

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
      <Routes>
        <Route path="/" element={<CommandCenter />} />
        <Route path="/route" element={<RouteOptimization />} />
        <Route path="/simulation" element={<LiveSimulation />} />
        <Route path="/lab" element={<AlgorithmLab />} />
        <Route path="/analytics" element={<AnalyticsDashboard />} />
        <Route path="/scenarios" element={<Scenarios />} />
        <Route path="/system" element={<Placeholder title="System" step={10} />} />
      </Routes>
    </AppShell>
  );
}
