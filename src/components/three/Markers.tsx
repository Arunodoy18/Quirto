import { Html } from '@react-three/drei';
import { LANDMARKS, NX } from '@/mock/network';
import { trafficService } from '@/services';
import { C } from './constants';

function Pin({ node, letter, name, color, ink }: { node: number; letter: string; name: string; color: string; ink: string }) {
  const n = trafficService.scene().net.nodes[node];
  return (
    <group position={[n.x, 0, n.z]}>
      <mesh position={[0, 23, 0]}>
        <cylinderGeometry args={[0.7, 0.7, 46, 6]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={[0, 1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[4, 24]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <Html position={[0, 50, 0]} center style={{ pointerEvents: 'none' }} zIndexRange={[20, 0]}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', transform: 'translateX(40%)' }}>
          <span style={{ width: 20, height: 20, borderRadius: '50%', background: color, color: ink, display: 'grid', placeItems: 'center', font: '600 11px var(--font-mono)' }}>{letter}</span>
          <span style={{ padding: '3px 7px', background: 'rgba(20,21,24,0.9)', border: '1px solid var(--line)', font: '500 11.5px var(--font-sans)', color: 'var(--text-strong)' }}>{name}</span>
        </div>
      </Html>
    </group>
  );
}

/** Origin/destination pins and landmark labels. */
export function Markers({ origin, destination, showOD }: { origin: string; destination: string; showOD: boolean }) {
  const nodes = trafficService.scene().net.nodes;
  return (
    <group>
      {Object.entries(LANDMARKS).map(([key, l]) => {
        if (showOD && (key === origin || key === destination)) return null;
        const n = nodes[l[1] * NX + l[0]];
        return (
          <Html key={key} position={[n.x, 2, n.z]} style={{ pointerEvents: 'none' }} zIndexRange={[10, 0]}>
            <span style={{ font: '500 10px var(--font-mono)', color: 'var(--muted)', whiteSpace: 'nowrap', marginLeft: 6 }}>{l[2].toUpperCase()}</span>
          </Html>
        );
      })}
      {showOD && (
        <>
          <Pin node={LANDMARKS[origin][1] * NX + LANDMARKS[origin][0]} letter="A" name={LANDMARKS[origin][2]} color={C.text} ink="#151619" />
          <Pin node={LANDMARKS[destination][1] * NX + LANDMARKS[destination][0]} letter="B" name={LANDMARKS[destination][2]} color={C.accent} ink={C.accentInk} />
        </>
      )}
    </group>
  );
}
