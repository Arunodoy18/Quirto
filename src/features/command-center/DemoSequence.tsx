import { DEMO_STEPS, type DemoState } from './useCommandCenter';

export function DemoSequence({ demo, stage, onRun, onStop }: { demo: DemoState; stage: number; onRun(): void; onStop(): void }) {
  const running = demo === 'running', done = demo === 'done';
  return (
    <>
      <div className="panel-head">
        <span className="panel-title">Demo mode</span>
        <span className="panel-meta" style={{ color: running ? 'var(--accent)' : done ? 'var(--ok)' : undefined }}>{running ? 'RUNNING' : done ? 'COMPLETE' : 'READY'}</span>
      </div>
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, borderBottom: '1px solid var(--line)' }}>
        {running
          ? <button className="btn-ghost" style={{ width: '100%' }} onClick={onStop}>Stop demo</button>
          : <button className="btn-ghost" style={{ width: '100%', borderColor: 'var(--accent-line)', color: 'var(--accent-text)' }} onClick={onRun}>Run demo sequence</button>}
        <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 1 }}>
          {DEMO_STEPS.map((label, i) => {
            const act = running && i === stage;
            const ok = (running || done) && (done || i < stage);
            return (
              <li key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, height: 20 }}>
                <span className="mono" style={{ width: 18, fontSize: 10, color: act ? 'var(--accent)' : 'var(--muted)' }}>{String(i + 1).padStart(2, '0')}</span>
                <span className="dot" style={{ width: 6, height: 6, background: act ? 'var(--accent)' : ok ? 'var(--ok)' : '#3a3c41' }} />
                <span style={{ fontSize: 12, color: act ? 'var(--text-strong)' : ok ? 'var(--text-3)' : 'var(--muted)', fontWeight: act ? 600 : 400 }}>{label}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </>
  );
}
