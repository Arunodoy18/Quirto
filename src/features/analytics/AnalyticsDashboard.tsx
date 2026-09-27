import { useState } from 'react';
import { analyticsService, type AnalyticsFilters } from '@/services/analyticsService';
import { useAsync } from '@/hooks/useAsync';
import { PLACES } from '@/mock/network';
import { ALGORITHM_FIXTURE, ALGORITHM_META } from '@/mock/fixtures';
import { SCENARIOS } from '@/lib/format';
import { LineChart } from '@/components/charts/LineChart';
import { BarList } from '@/components/charts/BarList';
import { isDemo } from '@/services';
import './analytics.css';

const hourLabels = [6, 9, 12, 15, 18, 21].map((h) => ({ at: (h - 6) * 2, label: `${String(h).padStart(2, '0')}:00` }));

function Card({ title, meta, children, wide }: { title: string; meta: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <section className="panel" style={{ gridColumn: wide ? 'span 2' : undefined }}>
      <div className="panel-head"><span className="panel-title">{title}</span><span className="panel-meta">{meta}</span></div>
      <div style={{ padding: '10px 10px 6px', flex: 1, minHeight: 0 }}>{children}</div>
    </section>
  );
}

export default function AnalyticsDashboard() {
  const [f, setF] = useState<AnalyticsFilters>({ scenario: 'peak', algorithm: 'all', run: 'last10', origin: 'station', destination: 'techpark' });
  const { data } = useAsync(() => analyticsService.get(f), [f.scenario, f.algorithm, f.run, f.origin, f.destination]);
  const set = (k: keyof AnalyticsFilters) => (e: React.ChangeEvent<HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const filters: Array<[keyof AnalyticsFilters, string, Array<[string, string]>]> = [
    ['scenario', 'Scenario', SCENARIOS],
    ['algorithm', 'Algorithm', [['all', 'All algorithms'], ...Object.entries(ALGORITHM_META).map(([k, m]) => [k, m.name] as [string, string])]],
    ['run', 'Run', [['last10', 'Last 10 runs'], ['today', 'Today'], ['week', 'Past 7 days']]],
    ['origin', 'Origin', PLACES.map((p) => [p.id, p.name])],
    ['destination', 'Destination', PLACES.map((p) => [p.id, p.name])]
  ];

  return (
    <div className="an">
      <div className="panel an-filters" role="search" aria-label="Filters">
        {filters.map(([k, label, opts]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label className="label" htmlFor={`f-${k}`}>{label}</label>
            <select id={`f-${k}`} className="field" style={{ width: 140, height: 32 }} value={f[k]} onChange={set(k)}>{opts.map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select>
          </div>
        ))}
        <span className="panel-meta" style={{ marginLeft: 'auto' }}>{isDemo ? 'Demo · generated series' : 'Live · /api/analytics'}</span>
      </div>
      {data && (
        <div className="an-grid">
          <Card title="Congestion over time" meta="% links congested · 06:00–23:00" wide>
            <LineChart ariaLabel="Congestion over time" height={250} min={0} max={100} yTicks={4} xLabels={hourLabels}
              series={[{ values: data.baseline, color: 'var(--muted)', dashed: true, width: 1.3 }, { values: data.congestion, color: 'var(--road-congested)', area: true }]} />
            <div style={{ display: 'flex', gap: 16, fontSize: 11.5, color: 'var(--text-3)', paddingLeft: 6 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 14, height: 3, background: 'var(--road-congested)' }} />Selected scenario</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 14, borderTop: '2px dashed var(--muted)' }} />Normal baseline</span>
            </div>
          </Card>
          <Card title="Average speed" meta="km/h">
            <LineChart ariaLabel="Average speed" height={270} min={0} max={50} yTicks={5} xLabels={[{ at: 0, label: '06:00' }, { at: 34, label: '23:00' }]} series={[{ values: data.speed, color: 'var(--accent)' }]} />
          </Card>
          <Card title="Travel time by run" meta="min · last 10">
            <BarList bars={data.travelTime.map((v, i) => ({ label: `Run ${i + 1}`, value: v, display: `${v.toFixed(1)} min` }))} max={30} height={10} labelWidth={48} />
          </Card>
          <Card title="Optimization cost" meta="best cost per run">
            <LineChart ariaLabel="Optimization cost per run" height={270} decimals={2} yTicks={4} dot series={[{ values: data.cost, color: 'var(--accent)' }]} xLabels={[{ at: 0, label: 'run 1' }, { at: 9, label: 'run 10' }]} />
          </Card>
          <Card title="Convergence" meta="latest run">
            <LineChart ariaLabel="Convergence of the latest run" height={270} decimals={3} yTicks={4} series={[{ values: data.convergence, color: 'var(--accent)', area: true }]} xLabels={[{ at: 0, label: '0' }, { at: data.convergence.length - 1, label: `iter ${data.convergence.length - 1}` }]} />
          </Card>
          <Card title="Route distribution" meta="share of routed trips">
            <BarList bars={data.routeShare.map((r) => ({ label: r.street, value: r.share, display: `${r.share}%` }))} max={40} height={8} labelWidth={110} />
          </Card>
          <Card title="Algorithm comparison" meta="demo fixture">
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 12 }}>Mean total cost</div>
            <BarList bars={ALGORITHM_FIXTURE.map((r) => ({ label: ALGORITHM_META[r.algorithm].name, value: r.totalCost, display: r.totalCost.toFixed(3), color: ALGORITHM_META[r.algorithm].color, muted: f.algorithm !== 'all' && f.algorithm !== r.algorithm }))} max={0.4} height={12} labelWidth={58} />
            <p style={{ fontSize: 11, lineHeight: 1.5, color: 'var(--muted)', margin: '14px 0 0' }}>Synthetic values for layout. Measured results come from Algorithm Lab experiments.</p>
          </Card>
        </div>
      )}
    </div>
  );
}
