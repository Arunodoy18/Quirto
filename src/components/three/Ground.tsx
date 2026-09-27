import { useMemo } from 'react';
import * as THREE from 'three';
import { BLOCK, PARK_BLOCK } from '@/mock/network';
import { C } from './constants';

/** Ground plane, harbour water, park and a faint survey grid. */
export function Ground() {
  const grid = useMemo(() => {
    const pts: number[] = [];
    for (let x = -50; x <= 950; x += 50) pts.push(x, 0.05, -70, x, 0.05, 770);
    for (let z = -50; z <= 750; z += 50) pts.push(-46, 0.05, z, 966, 0.05, z);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  const px = PARK_BLOCK[0] * BLOCK + 50, pz = PARK_BLOCK[1] * BLOCK + 50;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-193, -0.2, 350]}>
        <planeGeometry args={[294, 1020]} />
        <meshBasicMaterial color={C.water} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[460, -0.1, 350]}>
        <planeGeometry args={[1012, 840]} />
        <meshBasicMaterial color={C.ground} />
      </mesh>
      <lineSegments geometry={grid}>
        <lineBasicMaterial color="#ffffff" transparent opacity={0.035} />
      </lineSegments>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[px, 0.02, pz]}>
        <planeGeometry args={[72, 72]} />
        <meshBasicMaterial color={C.park} />
      </mesh>
    </group>
  );
}
