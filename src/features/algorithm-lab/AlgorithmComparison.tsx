import { useState } from 'react';
import type { AlgorithmResult } from '@/types/domain';
import { ALGORITHM_META } from '@/mock/fixtures';
import { BarList } from '@/components/charts/BarList';
import { LineChart } from '@/components/charts/LineChart';

type MetricKey = 'travelTimeMin' | 'distanceKm' | 'congestion' | 'fuelL' | 'risk' | 'totalCost' | 'runtimeMs' | 'iterations';
const METRICS: Array<[MetricKey, string, string, number]> = [
  ['travelTimeMin', 'Travel time', 'min', 1], ['distanceKm', 'Distance', 'km', 1], ['congestion', 'Congestion', '', 2], ['fuelL', 'Fuel', 'L', 2],
  ['risk', 'Risk', '', 2], ['totalCost', 'Total cost', '', 3], ['runtimeMs', 'Runtime', 'ms', 0], ['iterations', 'Iterations', '', 0]
];
const fmt = (v: number, d: number, u: string) => v.toFixed(d) + (u ? ` ${u}` : '');

export function AlgorithmComparison({ results, labelled }: { results: AlgorithmResult[]; labelled: string }) {
  const [metric, setMetric] = useState<MetricKey>('totalCost');
  const best = Object.fromEntries(METRICS.map(([k]) => [k, Math.min(...results.map((r) => r[k]))])) as Record<MetricKey, number>;
  const cur = METRICS.find((m) => m[0] === metric)!;
  const iterative = results.filter((r) => r.convergence?.length);
  const deterministic = results.find((r) => !r.convergence?.length);
  const maxIt = Math.max(...iterative.map((r) => r.iterations), 1);

  return (
    <div className="lab-main">
      <div className="lab-cards">
        {results.map((r) => {
          const m = ALGORITHM_META[r.algorithm];
          return (
            <div key={r.algorithm} className="panel" style={{ padding: '11px 12px', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-strong)' }}>{m.name}</span>
                <span style={{ width: 10, height: 10, background: m.color }} />
              </div>
              <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{m.family}</span>
              <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-2)' }}><span>cost {r.totalCost.toFixed(3)}</span><span>{r.runtimeMs} ms</span></div>
            </div>
          );
        })}
      </div>

      <section className="panel">
        <div className="panel-head"><span className="panel-title">Comparison</span><span style={{ fontSize: 11.5, color: 'var(--muted)' }}><span style={{ color: 'var(--ok)' }}>■</span> lowest value per metric ({labelled})</span></div>
        <table className="data">
          <thead><tr><th>Algorithm</th>{METRICS.map(([k, l]) => <th key={k} className="num">{l}</th>)}</tr></thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.algorithm}>
                <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span style={{ width: 8, height: 8, background: ALGORITHM_META[r.algorithm].color }} /><b style={{ fontWeight: 600 }}>{ALGORITHM_META[r.algorithm].name}</b></span></td>
                {METRICS.map(([k, , u, d]) => {
                  const isBest = k !== 'iterations' && r[k] === best[k];
                  return <td key={k} className="num" style={{ color: isBest ? 'var(--ok)' : 'var(--text-2)', fontWeight: isBest ? 600 : 400 }}>{fmt(r[k], d, u)}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="lab-charts">
        <section className="panel">
          <div className="panel-head"><span className="panel-title">By metric</span><span className="panel-meta">{labelled}</span></div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '10px 12px 4px' }}>
            {METRICS.map(([k, l]) => <button key={k} className="chip" style={{ height: 28 }} aria-pressed={metric === k} onClick={() => setMetric(k)}>{l}</button>)}
          </div>
          <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <BarList bars={results.map((r) => ({ label: ALGORITHM_META[r.algorithm].name, value: r[metric], display: fmt(r[metric], cur[3], cur[2]), color: ALGORITHM_META[r.algorithm].color }))} height={14} />
            <span className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>{metric === 'iterations' ? 'Iteration count is not a quality metric; deterministic methods run once.' : `Lower is better for ${cur[1].toLowerCase()}.`}</span>
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><span className="panel-title">Convergence</span><span className="panel-meta">{labelled}</span></div>
          <div style={{ padding: '8px 8px 0' }}>
            <LineChart
              ariaLabel="Best cost by iteration for iterative algorithms"
              height={230}
              decimals={2}
              xCount={maxIt + 1}
              series={[
                ...(deterministic ? [{ values: Array(maxIt + 1).fill(deterministic.totalCost), color: 'var(--algo-dijkstra)', dashed: true, width: 1.2 }] : []),
                ...iterative.map((r) => ({ values: r.convergence!.map((c) => c.cost), color: ALGORITHM_META[r.algorithm].color }))
              ]}
              xLabels={[{ at: 0, label: '0' }, { at: maxIt, label: `iteration ${maxIt}` }]}
            />
          </div>
          <div style={{ display: 'flex', gap: 16, padding: '4px 14px', flexWrap: 'wrap' }}>
            {deterministic && <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-2)' }}><span style={{ width: 14, borderTop: '2px dashed var(--algo-dijkstra)' }} />Dijkstra / A* (single pass)</span>}
            {iterative.map((r) => <span key={r.algorithm} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-2)' }}><span style={{ width: 14, height: 3, background: ALGORITHM_META[r.algorithm].color }} />{ALGORITHM_META[r.algorithm].name}</span>)}
          </div>
        </section>
      </div>
    </div>
  );
}
