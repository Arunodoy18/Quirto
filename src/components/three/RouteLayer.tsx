import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import type { Route, RoutePhase, RouteSet } from '@/types/domain';
import { trafficService } from '@/services';
import { C } from './constants';

type Pt = [number, number, number];
interface LineHandle { geometry: { setPositions(a: number[]): void }; computeLineDistances(): void; material: { dashOffset: number }; visible: boolean }

const OFFSETS = [0, 6, -6, 11, -11, 15, -15, 19];
const Y = 1.2;

/** Polyline offset sideways so overlapping candidates stay distinguishable. */
function offsetLine(geo: Array<[number, number]>, off: number): Pt[] {
  return geo.map((p, i) => {
    const a = geo[Math.max(0, i - 1)], b = geo[Math.min(geo.length - 1, i + 1)];
    const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1;
    return [p[0] + (dz / L) * off, Y, p[1] - (dx / L) * off];
  });
}

function partial(pts: Pt[], prog: number): number[] {
  const lim = Math.max(0, Math.min(1, prog)) * (pts.length - 1);
  const out: number[] = [];
  for (let i = 0; i < pts.length; i++) {
    if (i > lim) {
      const a = pts[i - 1], b = pts[i], f = lim - (i - 1);
      out.push(a[0] + (b[0] - a[0]) * f, Y, a[2] + (b[2] - a[2]) * f);
      break;
    }
    out.push(...pts[i]);
  }
  if (out.length === 3) out.push(...out);
  return out;
}

interface AnimProps { points: Pt[]; color: string; width: number; opacity?: number; dashed?: boolean; dash?: [number, number]; delay?: number; duration?: number; animKey: string; flow?: boolean }

/** A fat line that draws itself from start to end, optionally with moving dashes. */
function AnimatedLine({ points, color, width, opacity = 1, dashed, dash = [10, 6], delay = 0, duration = 0, animKey, flow }: AnimProps) {
  const ref = useRef<LineHandle>(null);
  const t0 = useRef(0);
  const clock = useRef(0);
  const last = useRef(-1);
  useEffect(() => { t0.current = clock.current; last.current = -1; }, [animKey]);
  useFrame((_, dt) => {
    clock.current += dt;
    const l = ref.current;
    if (!l) return;
    const prog = duration > 0 ? Math.max(0, Math.min(1, (clock.current - t0.current - delay) / duration)) : 1;
    l.visible = prog > 0;
    if (prog !== last.current && prog > 0) {
      l.geometry.setPositions(partial(points, prog));
      if (dashed) l.computeLineDistances();
      last.current = prog;
    }
    if (flow) l.material.dashOffset -= dt * 40;
  });
  return (
    <Line
      ref={ref as never}
      points={points}
      color={color}
      lineWidth={width}
      transparent
      opacity={opacity}
      dashed={dashed}
      dashSize={dash[0]}
      gapSize={dash[1]}
      depthWrite={false}
    />
  );
}

interface Props { routes: RouteSet | null | undefined; phase: RoutePhase; optT?: number; showRejected?: boolean }

/** Primary (dominant), alternatives (secondary), rejected (muted), previous route after a reroute. */
export function RouteLayer({ routes, phase, optT = 0, showRejected }: Props) {
  const [probe, setProbe] = useState(0);
  const [prevGeo, setPrevGeo] = useState<Array<[number, number]> | null>(null);
  const key = useMemo(() => (routes?.primary ? routes.primary.geometry.map((p) => p.join(',')).join(';') : 'none'), [routes]);

  useEffect(() => {
    const s = trafficService.scene();
    setPrevGeo(routes?.rerouted && s.prevPath ? s.prevPath.map((n) => [s.net.nodes[n].x, s.net.nodes[n].z] as [number, number]) : null);
  }, [routes]);

  useEffect(() => {
    if (phase !== 'optimizing' || !routes) return;
    const n = 1 + routes.alternatives.length + routes.rejected.length;
    const id = setInterval(() => setProbe(Math.random() < optT ? 0 : (Math.random() * n) | 0), 140);
    return () => clearInterval(id);
  }, [phase, routes, optT]);

  if (!routes?.primary || phase === 'none') return null;
  const cand: Route[] = [routes.primary, ...routes.alternatives, ...routes.rejected];
  const na = routes.alternatives.length;
  const primaryPts = offsetLine(routes.primary.geometry, 0);

  if (phase === 'candidates') {
    return (
      <group>
        {cand.map((r, i) => (
          <AnimatedLine key={r.id + key} animKey={key} points={offsetLine(r.geometry, OFFSETS[i] ?? 0)} color={C.routeCandidate} width={2.5} opacity={0.8} delay={i * 0.18} duration={0.9} />
        ))}
      </group>
    );
  }

  if (phase === 'optimizing') {
    const pr = cand[probe];
    return (
      <group>
        {routes.rejected.map((r, i) => (
          <AnimatedLine key={r.id} animKey={key} points={offsetLine(r.geometry, OFFSETS[i + 1 + na] ?? 0)} color={C.routeRejected} width={2} opacity={Math.max(0.15, 0.75 - 0.55 * optT)} dashed dash={[6, 6]} />
        ))}
        {routes.alternatives.map((r, i) => (
          <AnimatedLine key={r.id} animKey={key} points={offsetLine(r.geometry, OFFSETS[i + 1])} color={C.routeAlt} width={2.5} opacity={0.85} />
        ))}
        <AnimatedLine animKey={key} points={primaryPts} color={C.routePrimary} width={2.5 + 2.5 * optT} opacity={0.45 + 0.55 * optT} />
        {pr && <AnimatedLine key={`probe-${probe}`} animKey={key} points={offsetLine(pr.geometry, OFFSETS[probe] ?? 0)} color="#ffffff" width={2} opacity={0.9} />}
      </group>
    );
  }

  return (
    <group>
      {showRejected && routes.rejected.map((r, i) => (
        <AnimatedLine key={r.id} animKey={key} points={offsetLine(r.geometry, OFFSETS[i + 1 + na] ?? 0)} color={C.routeRejected} width={2} opacity={0.7} dashed dash={[4, 6]} />
      ))}
      {prevGeo && <AnimatedLine animKey={key + 'prev'} points={offsetLine(prevGeo, 0)} color={C.routePrev} width={3} opacity={0.8} dashed dash={[6, 7]} />}
      {routes.alternatives.map((r, i) => (
        <AnimatedLine key={r.id} animKey={key} points={offsetLine(r.geometry, OFFSETS[i + 1])} color={C.routeAlt} width={2.5} opacity={0.9} dashed dash={[12, 7]} />
      ))}
      <AnimatedLine animKey={key} points={primaryPts} color={C.routeCasing} width={10} opacity={0.9} duration={1.6} />
      <AnimatedLine animKey={key} points={primaryPts} color={C.routePrimary} width={5} duration={1.6} />
      <AnimatedLine animKey={key} points={primaryPts} color="#55575d" width={1.6} dashed dash={[5, 16]} duration={1.6} delay={0.1} flow />
    </group>
  );
}
