import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { trafficService } from '@/services';

const N = 1400;

/** Falling rain streaks when the scenario has rain. */
export function RainLayer() {
  const ref = useRef<THREE.LineSegments>(null);
  const geo = useMemo(() => {
    const p = new Float32Array(N * 6);
    for (let i = 0; i < N; i++) {
      const x = -150 + Math.random() * 1200, z = -150 + Math.random() * 1000, y = Math.random() * 300;
      p.set([x, y, z, x - 2, y - 12, z], i * 6);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    return g;
  }, []);
  useFrame((_, dt) => {
    const on = trafficService.scene().params().rain;
    ref.current!.visible = on;
    if (!on) return;
    const a = geo.getAttribute('position') as THREE.BufferAttribute;
    const p = a.array as Float32Array;
    for (let i = 0; i < N; i++) {
      let y = p[i * 6 + 1] - dt * 260;
      if (y < 0) y += 300;
      p[i * 6 + 1] = y;
      p[i * 6 + 4] = y - 12;
    }
    a.needsUpdate = true;
  });
  return (
    <lineSegments ref={ref} geometry={geo}>
      <lineBasicMaterial color="#c8c8c8" transparent opacity={0.22} />
    </lineSegments>
  );
}
