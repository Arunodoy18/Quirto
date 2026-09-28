import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { CameraMode, RouteSet, Incident } from '@/types/domain';
import { nodeOf } from '@/mock/network';
import { trafficService } from '@/services';
import { CX, CZ } from './constants';

interface Props {
  mode: CameraMode;
  routes?: RouteSet | null;
  incidents: Incident[];
  origin?: string;
  destination?: string;
}

interface Cam { tx: number; tz: number; yaw: number; pitch: number; dist: number }

const ang = (a: number) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

/**
 * Eased camera modes: overview · network · route · incident · optimization · follow.
 * Drag orbits, wheel zooms, double-click resets the manual offset.
 */
export function CameraController({ mode, routes, incidents, origin = 'station', destination = 'techpark' }: Props) {
  const { camera, gl } = useThree();
  const cam = useRef<Cam>({ tx: 450, tz: 350, yaw: Math.PI + 0.9, pitch: 0.7, dist: 1650 });
  const user = useRef({ yaw: 0, pitch: 0, zoom: 1 });
  const head = useRef<number | null>(null);
  const clock = useRef(0);

  useEffect(() => {
    const el = gl.domElement;
    let drag: { x: number; y: number } | null = null;
    const down = (e: PointerEvent) => { drag = { x: e.clientX, y: e.clientY }; el.style.cursor = 'grabbing'; };
    const move = (e: PointerEvent) => {
      if (!drag) return;
      user.current.yaw -= (e.clientX - drag.x) * 0.006;
      user.current.pitch = Math.max(-0.5, Math.min(0.5, user.current.pitch + (e.clientY - drag.y) * 0.004));
      drag = { x: e.clientX, y: e.clientY };
    };
    const up = () => { drag = null; el.style.cursor = 'grab'; };
    const wheel = (e: WheelEvent) => { e.preventDefault(); user.current.zoom = Math.max(0.4, Math.min(2.2, user.current.zoom * (1 + e.deltaY * 0.001))); };
    const reset = () => { user.current = { yaw: 0, pitch: 0, zoom: 1 }; };
    el.style.cursor = 'grab';
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    el.addEventListener('wheel', wheel, { passive: false });
    el.addEventListener('dblclick', reset);
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      el.removeEventListener('wheel', wheel);
      el.removeEventListener('dblclick', reset);
    };
  }, [gl]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(0.05, dtRaw);
    clock.current += dt;
    const scene = trafficService.scene();
    const nodes = scene.net.nodes;
    const box = (pts: Array<[number, number]>) => {
      let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
      for (const [x, z] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
      return { x: (x0 + x1) / 2, z: (z0 + z1) / 2, s: Math.max(x1 - x0, z1 - z0) };
    };
    let t: Cam | null = null;
    if (mode === 'network') {
      const a = nodes[nodeOf(origin)], b = nodes[nodeOf(destination)];
      const bx = box([[a.x, a.z], [b.x, b.z]]);
      t = { tx: bx.x, tz: bx.z, yaw: Math.PI + 0.35, pitch: 0.95, dist: 640 + bx.s * 0.9 };
    } else if (mode === 'route' && routes?.primary) {
      const prev = scene.prevPath?.map((n) => [nodes[n].x, nodes[n].z] as [number, number]) ?? [];
      const bx = box([...routes.primary.geometry, ...prev]);
      t = { tx: bx.x, tz: bx.z, yaw: Math.PI + 0.25, pitch: 1.12, dist: 480 + bx.s * 1.15 };
    } else if (mode === 'incident' && incidents.length) {
      const e = scene.net.byId.get(incidents[incidents.length - 1].roadId);
      if (e) {
        const a = nodes[e.a], b = nodes[e.b];
        t = { tx: (a.x + b.x) / 2, tz: (a.z + b.z) / 2, yaw: Math.PI + 0.9 + clock.current * 0.06, pitch: 0.8, dist: 470 };
      }
    } else if (mode === 'optimization') {
      t = { tx: 450, tz: 350, yaw: Math.PI, pitch: 1.5, dist: 1180 };
    } else if (mode === 'follow') {
      const p = scene.egoPose();
      if (p) {
        const ty = Math.atan2(p.hx, p.hz);
        head.current = head.current == null ? ty : head.current + ang(ty - head.current) * Math.min(1, dt * 2.5);
        t = { tx: p.x + p.hx * 60, tz: p.z + p.hz * 60, yaw: head.current, pitch: 0.72, dist: 340 };
      }
    }
    if (!t) t = { tx: 450, tz: 350, yaw: Math.PI + 0.55 + 0.1 * Math.sin(clock.current * 0.06), pitch: 0.84, dist: 1320 };

    const c = cam.current;
    const k = 1 - Math.exp(-dt * (mode === 'follow' ? 3.5 : 1.8));
    c.tx += (t.tx - c.tx) * k;
    c.tz += (t.tz - c.tz) * k;
    c.dist += (t.dist - c.dist) * k;
    c.pitch += (t.pitch - c.pitch) * k;
    c.yaw += ang(t.yaw - c.yaw) * k;

    const yaw = c.yaw + user.current.yaw;
    const pitch = Math.max(0.35, Math.min(1.54, c.pitch + user.current.pitch));
    const dist = c.dist * user.current.zoom;
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    const tx = c.tx - CX, tz = c.tz - CZ;
    camera.position.set(tx - fx * dist * Math.cos(pitch), dist * Math.sin(pitch), tz - fz * dist * Math.cos(pitch));
    camera.lookAt(tx, 0, tz);
  });

  return null;
}
