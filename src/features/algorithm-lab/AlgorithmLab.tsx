import { useState } from 'react';
import { experimentService, isDemo } from '@/services';
import { useAsync } from '@/hooks/useAsync';
import { AlgorithmComparison } from './AlgorithmComparison';
import './algorithm-lab.css';

const CONFIG: Array<[string, string]> = [
  ['Scenario', 'peak_hour'], ['Origin', 'central_station'], ['Destination', 'tech_park'], ['Runs per algorithm', '30'],
  ['Random seed', '2026'], ['Population (GA / PSO / QIRTO)', '50'], ['Max iterations', '100'], ['Objective profile', 'balanced']
];

export default function AlgorithmLab() {
  const { data, loading, error } = useAsync(() => experimentService.latest(), []);
  const [showFixture, setShowFixture] = useState(true);
  const fixture = !!data?.fixture;
  const visible = data && (!fixture || showFixture);

  return (
    <div className="lab">
      <div className="panel lab-banner" style={{ borderColor: fixture && showFixture ? '#4a4030' : undefined }}>
        <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: fixture ? 'var(--warn)' : data ? 'var(--ok)' : 'var(--muted)' }}>
          {loading ? 'Loading' : error ? 'Unavailable' : fixture ? (showFixture ? 'Demo fixture' : 'No data') : `Experiment ${data?.experimentId}`}
        </span>
        <span style={{ fontSize: 13, color: 'var(--text-2)', flex: 1 }}>
          {error ? `Could not load experiments: ${error.message}` : fixture
            ? 'Synthetic values for layout only — not measured results and not a performance claim. Real comparisons load from backend experiment runs.'
            : 'Results from the backend experiment runner.'}
        </span>
        {fixture && <button className="btn-ghost" onClick={() => setShowFixture((v) => !v)}>{showFixture ? 'Hide fixture' : 'Show layout fixture'}</button>}
        <button className="btn" style={{ height: 32, fontSize: 12.5 }} disabled={isDemo} title={isDemo ? 'Requires the FastAPI experiment endpoint' : undefined} onClick={() => void experimentService.run({})}>Run experiment</button>
      </div>

      <section className="panel lab-config" aria-label="Experiment configuration">
        <div className="panel-head"><span className="panel-title">Experiment config</span><span className="panel-meta">read-only</span></div>
        <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          {CONFIG.map(([k, v], i) => (
            <div key={k} className="stack" style={{ gap: 5 }}>
              <label className="label" htmlFor={`cfg-${i}`}>{k}</label>
              <input id={`cfg-${i}`} className="field mono" style={{ height: 32, fontSize: 12.5 }} value={v} readOnly />
            </div>
          ))}
          <p style={{ margin: '4px 0 0', fontSize: 11.5, lineHeight: 1.5, color: 'var(--muted)' }}>Each algorithm runs on the same network snapshot and O/D pair; metrics are averaged over runs.</p>
        </div>
        <div style={{ marginTop: 'auto', padding: 12, borderTop: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="label">Endpoint</span>
          <span className="mono" style={{ fontSize: 11, color: 'var(--accent)' }}>GET /api/experiments/latest</span>
          <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>→ AlgorithmResult[]</span>
        </div>
      </section>

      {visible ? (
        <AlgorithmComparison results={data!.results} labelled={fixture ? 'fixture' : 'measured'} />
      ) : (
        <section className="panel lab-empty">
          <span style={{ fontSize: 16, fontWeight: 600 }}>No experiment results loaded</span>
          <span style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--muted)', maxWidth: 460, textAlign: 'center' }}>Comparison table, bar charts and convergence curves render here once the backend returns AlgorithmResult records for Dijkstra, A*, GA, PSO and QIRTO.</span>
        </section>
      )}
    </div>
  );
}
