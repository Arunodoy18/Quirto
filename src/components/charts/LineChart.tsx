/**
 * Minimal SVG line chart (no chart library). Measures its container and draws
 * at true pixel size, so text never stretches.
 */
import { useElementWidth } from '@/hooks/useElementWidth';
export interface Series { values: number[]; color: string; dashed?: boolean; area?: boolean; width?: number; label?: string }

interface Props {
  series: Series[];
  height?: number;
  /** fixed domain; defaults to data extent with padding */
  min?: number;
  max?: number;
  /** total x slots (e.g. max iterations) so a growing series fills left→right */
  xCount?: number;
  yTicks?: number;
  decimals?: number;
  xLabels?: Array<{ at: number; label: string }>;
  empty?: string;
  dot?: boolean;
  ariaLabel: string;
}

export function LineChart({ series, height = 180, min, max, xCount, yTicks = 3, decimals, xLabels, empty, dot, ariaLabel }: Props) {
  const [ref, W] = useElementWidth<HTMLDivElement>();
  const all = series.flatMap((s) => s.values);
  const has = all.length > 1;
  let lo = min ?? Math.min(...all), hi = max ?? Math.max(...all);
  if (!has) { lo = 0; hi = 1; }
  if (min == null && max == null && has) {
    const p = (hi - lo) * 0.12 || Math.max(1, Math.abs(hi) * 0.1);
    const nonNeg = lo >= 0;
    lo -= p; hi += p;
    if (nonNeg) lo = Math.max(0, lo);
  }
  const dec = decimals ?? (hi - lo < 6 ? 1 : 0);
  const padL = 44, padR = 10, padT = 10, padB = xLabels ? 22 : 10;
  const H = height;
  const n = Math.max(2, xCount ?? Math.max(...series.map((s) => s.values.length)));
  const X = (i: number) => padL + (i / (n - 1)) * (W - padL - padR);
  const Y = (v: number) => padT + ((hi - v) / (hi - lo || 1)) * (H - padT - padB);
  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => lo + ((hi - lo) * i) / yTicks);
  return (
    <div ref={ref} style={{ width: '100%' }}>
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={ariaLabel} style={{ display: 'block' }}>
      {ticks.map((v, i) => (
        <g key={i}>
          <line x1={padL} x2={W - padR} y1={Y(v)} y2={Y(v)} stroke="var(--line-soft)" />
          <text x={padL - 6} y={Y(v) + 3} textAnchor="end" fill="var(--muted)" fontSize="10" fontFamily="var(--font-mono)">{v.toFixed(dec)}</text>
        </g>
      ))}
      {xLabels?.map((l) => (
        <text key={l.at} x={X(l.at)} y={H - 6} textAnchor={l.at <= 0 ? 'start' : l.at >= n - 1 ? 'end' : 'middle'} fill="var(--muted)" fontSize="10" fontFamily="var(--font-mono)">{l.label}</text>
      ))}
      {has && series.map((s, k) => {
        if (s.values.length < 2) return null;
        const pts = s.values.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
        const last = s.values.length - 1;
        return (
          <g key={k}>
            {s.area && <path d={`M${X(0)},${H - padB} L${pts.split(' ').join(' L')} L${X(last)},${H - padB} Z`} fill={s.color} fillOpacity={0.08} />}
            <polyline points={pts} fill="none" stroke={s.color} strokeWidth={s.width ?? 1.8} strokeDasharray={s.dashed ? '4 4' : undefined} strokeLinejoin="round" />
            {dot && <circle cx={X(last)} cy={Y(s.values[last])} r={3} fill={s.color} />}
          </g>
        );
      })}
      {!has && empty && <text x={W / 2} y={H / 2} textAnchor="middle" fill="var(--muted)" fontSize="12">{empty}</text>}
    </svg>
    </div>
  );
}
