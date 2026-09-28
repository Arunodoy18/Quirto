import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { trafficService } from '@/services';
import { C } from './constants';

const MAX = 340;
const o = new THREE.Object3D();

/** All simulated vehicles (instanced) plus the tracked vehicle. */
export function VehicleLayer() {
  const scene = trafficService.scene();
  const cars = useRef<THREE.InstancedMesh>(null);
  const buses = useRef<THREE.InstancedMesh>(null);
  const ego = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const geo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const t = useRef(0);

  useFrame((_, dt) => {
    t.current += dt;
    const { nodes, edges } = scene.net;
    let nc = 0, nb = 0;
    for (const v of scene.vehicles) {
      const e = edges[v.e], a = nodes[e.a], b = nodes[e.b];
      const f = v.dir > 0 ? v.t : 1 - v.t;
      const hx = ((b.x - a.x) / 100) * v.dir, hz = ((b.z - a.z) / 100) * v.dir;
      o.position.set(a.x + (b.x - a.x) * f + hz * 5, 1.8, a.z + (b.z - a.z) * f - hx * 5);
      o.rotation.set(0, Math.atan2(hx, hz), 0);
      if (v.bus) { o.scale.set(4.2, 3.6, 13); o.updateMatrix(); if (nb < MAX) buses.current!.setMatrixAt(nb++, o.matrix); }
      else { o.scale.set(3.4, 2.6, 7); o.updateMatrix(); if (nc < MAX) cars.current!.setMatrixAt(nc++, o.matrix); }
    }
    cars.current!.count = nc;
    buses.current!.count = nb;
    cars.current!.instanceMatrix.needsUpdate = true;
    buses.current!.instanceMatrix.needsUpdate = true;

    const p = scene.egoPose();
    ego.current!.visible = !!p;
    if (p) {
      ego.current!.position.set(p.x, 0, p.z);
      ego.current!.rotation.set(0, Math.atan2(p.hx, p.hz), 0);
      const k = (t.current * 1.2) % 1;
      ring.current!.scale.setScalar(8 + k * 22);
      (ring.current!.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - k);
    }
  });

  return (
    <group>
      <instancedMesh ref={cars} args={[geo, undefined, MAX]}>
        <meshLambertMaterial color={C.vehicle} />
      </instancedMesh>
      <instancedMesh ref={buses} args={[geo, undefined, MAX]}>
        <meshLambertMaterial color={C.bus} />
      </instancedMesh>
      <group ref={ego} visible={false}>
        <mesh position={[0, 3, 0]}>
          <boxGeometry args={[6, 5, 14]} />
          <meshBasicMaterial color={C.accent} />
        </mesh>
        <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.8, 0]}>
          <ringGeometry args={[0.9, 1, 40]} />
          <meshBasicMaterial color={C.accent} transparent depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}
