import { Route, Routes } from 'react-router-dom';
import { AppShell } from './components/shell/AppShell';
import { Placeholder } from './components/ui/Placeholder';
import { TwinPreview } from './components/three/TwinPreview';
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
        <Route path="/" element={<TwinPreview />} />
        <Route path="/route" element={<Placeholder title="Route Optimization" step={5} />} />
        <Route path="/simulation" element={<Placeholder title="Live Simulation" step={6} />} />
        <Route path="/lab" element={<Placeholder title="Algorithm Lab" step={7} />} />
        <Route path="/analytics" element={<Placeholder title="Analytics" step={8} />} />
        <Route path="/scenarios" element={<Placeholder title="Scenario Manager" step={9} />} />
        <Route path="/system" element={<Placeholder title="System" step={10} />} />
      </Routes>
    </AppShell>
  );
}
