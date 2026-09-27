import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Scenario, ScenarioKey } from '@/types/domain';
import { scenarioService, simulationService } from '@/services';
import { ScenarioEditor, weatherLabel } from './ScenarioEditor';
import './scenarios.css';

const clone = (s: Scenario) => structuredClone(s);
const PRESET_KEYS = new Set(['normal', 'peak', 'accident', 'rain', 'closure', 'multi']);

export default function Scenarios() {
  const [list, setList] = useState<Scenario[]>([]);
  const [sel, setSel] = useState('peak');
  const [draft, setDraft] = useState<Scenario | null>(null);
  const [n, setN] = useState(1);

  useEffect(() => { void scenarioService.list().then((l) => { setList(l); const s = l.find((x) => x.id === 'peak') ?? l[0]; setSel(s.id); setDraft(clone(s)); }); }, []);

  const saved = list.find((x) => x.id === sel);
  const clean = !!saved && !!draft && JSON.stringify(saved) === JSON.stringify(draft);
  const select = (s: Scenario) => { setSel(s.id); setDraft(clone(s)); };
  const add = (base?: Scenario) => {
    const id = `custom-${n}`;
    const s: Scenario = base
      ? { ...clone(base), id, name: `${base.name} (copy)`, preset: false }
      : { id, name: `Custom scenario ${n}`, preset: false, density: 1, weather: 'clear', accidents: 0, closures: [], vehicleMix: { car: 62, bike: 14, bus: 10, truck: 12, emergency: 2 }, origin: 'station', destination: 'techpark' };
    void scenarioService.save(s).then(() => { setList((l) => [...l, s]); select(s); setN(n + 1); });
  };
  const apply = () => {
    if (!draft) return;
    const key: ScenarioKey = PRESET_KEYS.has(draft.id) ? (draft.id as ScenarioKey) : draft.weather === 'clear' ? (draft.density > 1.3 ? 'peak' : 'normal') : 'rain';
    simulationService.setScenario(key);
  };

  if (!draft) return null;
  const payload = { ...draft, vehicleMix: Object.fromEntries(Object.entries(draft.vehicleMix).map(([k, v]) => [k, Math.round((v / (Object.values(draft.vehicleMix).reduce((a, b) => a + b, 0) || 1)) * 1000) / 1000])) };

  return (
    <div className="scn">
      <section className="panel" aria-label="Scenario library">
        <div className="panel-head"><span className="panel-title">Scenarios</span><button className="btn-ghost" style={{ height: 26, fontSize: 11.5 }} onClick={() => add()}>+ New</button></div>
        <div style={{ overflow: 'auto' }}>
          {list.map((s) => (
            <button key={s.id} className="scn-row" aria-current={s.id === sel} onClick={() => select(s)}>
              <span style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>{s.name}</span>
                <span className="mono" style={{ fontSize: 10, color: s.preset ? 'var(--muted)' : 'var(--accent)' }}>{s.preset ? 'PRESET' : 'CUSTOM'}</span>
              </span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{s.density.toFixed(2)}× · {weatherLabel(s.weather)} · {s.accidents} acc · {s.closures.length} closed</span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel" aria-label="Scenario editor">
        <div className="panel-head"><span className="panel-title">Scenario editor</span><span className="panel-meta" style={{ color: clean ? 'var(--ok)' : 'var(--warn)' }}>{clean ? 'Saved' : 'Unsaved changes'}</span></div>
        <ScenarioEditor draft={draft} onChange={setDraft} />
        <div style={{ marginTop: 'auto', padding: '12px 16px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn" style={{ height: 36 }} disabled={clean} onClick={() => void scenarioService.save(draft).then((s) => setList((l) => l.map((x) => (x.id === s.id ? s : x))))}>Save scenario</button>
          <button className="btn-ghost" style={{ height: 36 }} disabled={clean} onClick={() => saved && select(saved)}>Revert</button>
          <button className="btn-ghost" style={{ height: 36 }} onClick={() => add(draft)}>Duplicate</button>
          <button className="btn-ghost" style={{ height: 36, marginLeft: 'auto' }} disabled={draft.preset} onClick={() => void scenarioService.remove(draft.id).then(() => { const l = list.filter((x) => x.id !== draft.id); setList(l); select(l[0]); })}>Delete</button>
        </div>
      </section>

      <section className="panel" aria-label="Scenario payload">
        <div className="panel-head"><span className="panel-title">Payload</span><span className="panel-meta">Scenario</span></div>
        <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minHeight: 0 }}>
          <span className="mono" style={{ fontSize: 11, color: 'var(--accent)' }}>PUT /api/scenarios/{draft.id}</span>
          <pre className="code" style={{ flex: 1 }}>{JSON.stringify(payload, null, 2)}</pre>
          <span style={{ fontSize: 11.5, lineHeight: 1.5, color: 'var(--muted)' }}>Demo mode keeps scenarios for this session only; the backend persists them in PostgreSQL.</span>
          <button className="btn-ghost" style={{ height: 36 }} onClick={apply}>Apply to simulation</button>
          <Link to="/" className="btn-ghost" style={{ height: 36, borderColor: 'var(--accent-line)', color: 'var(--accent-text)' }}>Open Command Center →</Link>
        </div>
      </section>
    </div>
  );
}
