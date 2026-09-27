import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { trafficService } from '@/services';
import { C } from './constants';

const tmp = new THREE.Object3D();
const col = new THREE.Color();
const STATE_COLORS = C.states.map((c) => new THREE.Color(c));
const HALO = [null, null, new THREE.Color(C.congestion), new THREE.Color('#c8463f'), null];

/**
 * Roads as three instanced layers: asphalt base, a state-coloured traffic
 * stripe whose width grows with load, and a soft halo under congested links.
 */
export function RoadNetwork() {
  const scene = trafficService.scene();
  const edges = scene.net.edges;
  const nodes = scene.net.nodes;
  const base = useRef<THREE.InstancedMesh>(null);
  const stripe = useRef<THREE.InstancedMesh>(null);
  const halo = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);

  const place = (m: THREE.InstancedMesh, i: number, width: number, y: number, h: number) => {
    const e = edges[i], a = nodes[e.a], b = nodes[e.b];
    const horiz = a.z === b.z;
    tmp.position.set((a.x + b.x) / 2, y, (a.z + b.z) / 2);
    tmp.scale.set(horiz ? 100 : width, h, horiz ? width : 100);
    tmp.updateMatrix();
    m.setMatrixAt(i, tmp.matrix);
  };

  useLayoutEffect(() => {
    const m = base.current!;
    edges.forEach((e, i) => place(m, i, e.arterial ? 18 : 12, 0.2, 0.4));
    m.instanceMatrix.needsUpdate = true;
  });

  useFrame(() => {
    const s = stripe.current!, h = halo.current!;
    for (let i = 0; i < edges.length; i++) {
      const st = scene.state(i);
      const L = Math.min(1.2, scene.load[i]);
      const art = edges[i].arterial;
      place(s, i, st === 4 ? 2.5 : (art ? 4.5 : 3) * (0.7 + 0.6 * L), 0.6, 0.5);
      col.copy(STATE_COLORS[st]);
      if (st === 0) col.multiplyScalar(0.55);
      s.setColorAt(i, col);
      const hc = HALO[st];
      place(h, i, hc ? (art ? 30 : 24) * L : 0.001, 0.45, 0.1);
      h.setColorAt(i, hc ?? STATE_COLORS[0]);
    }
    s.instanceMatrix.needsUpdate = true;
    h.instanceMatrix.needsUpdate = true;
    if (s.instanceColor) s.instanceColor.needsUpdate = true;
    if (h.instanceColor) h.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={base} args={[geo, undefined, edges.length]}>
        <meshBasicMaterial color={C.road} />
      </instancedMesh>
      <instancedMesh ref={halo} args={[geo, undefined, edges.length]}>
        <meshBasicMaterial transparent opacity={0.14} depthWrite={false} />
      </instancedMesh>
      <instancedMesh ref={stripe} args={[geo, undefined, edges.length]}>
        <meshBasicMaterial />
      </instancedMesh>
    </group>
  );
}
