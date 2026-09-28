import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { trafficService } from '@/services';
import { C } from './constants';

/** Instanced massing blocks with a single merged edge outline. */
export function Buildings() {
  const blds = trafficService.scene().net.buildings;
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const edges = useMemo(() => {
    const pts: number[] = [];
    for (const b of blds) {
      const x0 = b.x, x1 = b.x + b.w, z0 = b.z, z1 = b.z + b.d, h = b.h;
      const c = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
      for (let k = 0; k < 4; k++) {
        const [ax, az] = c[k], [bx, bz] = c[(k + 1) % 4];
        pts.push(ax, h, az, bx, h, bz, ax, 0, az, ax, h, az);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, [blds]);

  useLayoutEffect(() => {
    const m = ref.current!;
    const o = new THREE.Object3D();
    const cA = new THREE.Color(C.building), cB = new THREE.Color(C.buildingTech);
    blds.forEach((b, i) => {
      o.position.set(b.x + b.w / 2, b.h / 2, b.z + b.d / 2);
      o.scale.set(b.w, b.h, b.d);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, b.tech ? cB : cA);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [blds]);

  return (
    <group>
      <instancedMesh ref={ref} args={[geo, undefined, blds.length]}>
        <meshLambertMaterial />
      </instancedMesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color="#ffffff" transparent opacity={0.09} />
      </lineSegments>
    </group>
  );
}
