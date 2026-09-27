import type { OptimizationRun, RouteSet } from '@/types/domain';
import { LineChart } from '@/components/charts/LineChart';

const STATUS_COLOR: Record<string, string> = { IDLE: 'var(--muted)', INITIALIZING: 'var(--warn)', RUNNING: 'var(--accent)', CONVERGED: 'var(--ok)', 'NO ROUTE': 'var(--danger)', ERROR: 'var(--danger)' };

export function OptimizationPanel({ run, routes, busy }: { run: OptimizationRun | null; routes: RouteSet | null; busy: boolean }) {
  const status = run?.status ?? (busy ? 'INITIALIZING' : 'IDLE');
  const idle = status === 'IDLE';
  const rows: Array<[string, string]> = [
    ['Iteration', idle ? '—' : String(run?.iteration ?? 0)],
    ['Population', idle ? '—' : String(run?.population ?? 50)],
    ['Best cost', run?.bestCost != null ? run.bestCost.toFixed(3) : '—'],
    ['Best fitness', run?.bestFitness != null ? run.bestFitness.toFixed(3) : '—'],
    ['Runtime', run ? `${run.runtimeMs} ms` : '—'],
    ['Candidates', routes?.candidates ? String(routes.candidates) : '—']
  ];
  const converged = status === 'CONVERGED';
  const q = run?.qState ?? [];
  const simulated = run?.source !== 'live';
  return (
    <section className="panel" style={{ display: 'grid', gridTemplateColumns: '200px minmax(0, 1fr) 240px' }} aria-label="Optimization">
      <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--line)' }}>
        <div className="panel-head"><span className="panel-title">QIRTO optimization</span></div>
        <div style={{ padding: '8px 12px' }}>
          {rows.map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 23, borderBottom: '1px solid var(--line-soft)' }}>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{k}</span><span className="mono" style={{ fontSize: 12.5 }}>{v}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 28 }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Status</span>
            <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: STATUS_COLOR[status] }}>{status}</span>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--line)', minWidth: 0 }}>
        <div className="panel-head"><span className="panel-title">Convergence</span><span className="panel-meta">{simulated ? 'Simulated' : 'Live'}</span></div>
        <div style={{ padding: '6px 8px 0' }}>
          <LineChart
            ariaLabel="Best cost by iteration"
            height={180}
            decimals={3}
            xCount={(run?.maxIterations ?? 0) + 1}
            series={[{ values: run?.convergence.map((c) => c.cost) ?? [], color: 'var(--accent)', area: true }]}
            xLabels={run?.maxIterations ? [{ at: 0, label: '0' }, { at: run.maxIterations, label: `iter ${run.maxIterations}` }] : undefined}
            empty="Awaiting optimization run"
            dot
          />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="panel-head"><span className="panel-title">Quantum-inspired search state</span></div>
        <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 7 }}>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>Street inclusion probability · Q-bit encoding</span>
          {q.length === 0 && <span className="empty" style={{ padding: '8px 0' }}>Idle. Probabilities populate while an optimization runs.</span>}
          {q.map((s) => {
            const pct = Math.round(s.probability * 100);
            const color = converged ? (s.selected ? 'var(--accent)' : 'var(--route-rejected)') : 'var(--text-3)';
            return (
              <div key={s.label} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11.5, color: 'var(--text-2)' }}>{s.label}</span>
                  <span className="mono" style={{ fontSize: 11, color }}>{pct}% <span style={{ fontSize: 9.5, color: 'var(--muted)' }}>{converged ? (s.selected ? 'SELECTED' : 'PRUNED') : ''}</span></span>
                </div>
                <div style={{ height: 4, background: 'var(--line-soft)' }}><div style={{ height: 4, width: `${pct}%`, background: color, transition: 'width 0.15s linear' }} /></div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
