import { Route, Routes } from 'react-router-dom';
import { AppShell } from './components/shell/AppShell';
import { Placeholder } from './components/ui/Placeholder';

export default function App() {
  return (
    <AppShell status={{ sim: 'IDLE', scenario: 'Normal', health: 'Backend not connected', healthOk: false }}>
      <Routes>
        <Route path="/" element={<Placeholder title="Command Center" step={4} />} />
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
