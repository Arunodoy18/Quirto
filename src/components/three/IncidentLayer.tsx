import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Incident } from '@/types/domain';
import { trafficService } from '@/services';
import { C } from './constants';

function IncidentMarker({ inc }: { inc: Incident }) {
  const scene = trafficService.scene();
  const ring = useRef<THREE.Mesh>(null);
  const t = useRef(Math.random());
  const e = scene.net.byId.get(inc.roadId);
  useFrame((_, dt) => {
    t.current += dt;
    const k = (t.current * 0.7) % 1;
    if (ring.current) {
      ring.current.scale.setScalar(14 + k * 62);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = 0.75 * (1 - k);
    }
  });
  if (!e) return null;
  const a = scene.net.nodes[e.a], b = scene.net.nodes[e.b];
  const color = inc.type === 'closure' ? C.closed : inc.type === 'congestion' ? C.congestion : C.danger;
  return (
    <group position={[(a.x + b.x) / 2, 0, (a.z + b.z) / 2]}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 1, 0]}>
        <ringGeometry args={[0.94, 1, 48]} />
        <meshBasicMaterial color={color} transparent depthWrite={false} />
      </mesh>
      <mesh position={[0, 17, 0]}>
        <cylinderGeometry args={[0.6, 0.6, 34, 6]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {inc.type === 'closure' ? (
        <mesh position={[0, 36, 0]}>
          <boxGeometry args={[24, 10, 3]} />
          <meshBasicMaterial color={color} />
        </mesh>
      ) : (
        <mesh position={[0, 38, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[9, 14, 3]} />
          <meshBasicMaterial color={color} />
        </mesh>
      )}
    </group>
  );
}

export function IncidentLayer({ incidents }: { incidents: Incident[] }) {
  return <group>{incidents.map((i) => <IncidentMarker key={i.id} inc={i} />)}</group>;
}
