import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { trafficService } from '@/services';

const GREEN = new THREE.Color('#5dae7b'), RED = new THREE.Color('#c8463f');

/** Traffic signals at arterial intersections, cycling every 4 simulated seconds. */
export function SignalLayer() {
  const scene = trafficService.scene();
  const list = useMemo(() => scene.net.nodes.filter((n) => (n.i === 4 || n.i === 7 || n.j === 3) && n.adj.length >= 3), [scene]);
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    list.forEach((n, i) => { o.position.set(n.x + 11, 13, n.z + 11); o.updateMatrix(); ref.current!.setMatrixAt(i, o.matrix); });
    ref.current!.instanceMatrix.needsUpdate = true;
  }, [list]);
  useFrame(() => {
    list.forEach((n, i) => ref.current!.setColorAt(i, Math.floor((scene.clock + n.i * 0.7 + n.j * 1.1) / 4) % 2 === 0 ? GREEN : RED));
    if (ref.current!.instanceColor) ref.current!.instanceColor.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, list.length]}>
      <sphereGeometry args={[2.6, 10, 8]} />
      <meshBasicMaterial />
    </instancedMesh>
  );
}
