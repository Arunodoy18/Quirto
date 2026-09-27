import { useState } from 'react';
import type { CameraMode } from '@/types/domain';
import { useWorld } from '@/hooks/useWorld';
import { ThreeCity } from './ThreeCity';
import { MapLegend } from './MapLegend';

/** Step-3 checkpoint: the digital twin on its own with camera modes. */
export function TwinPreview() {
  const { incidents } = useWorld();
  const [camera, setCamera] = useState<CameraMode>('overview');
  return (
    <section style={{ position: 'relative', height: '100%', border: '1px solid var(--line)', overflow: 'hidden' }}>
      <ThreeCity camera={camera} incidents={incidents} showOD={false} />
      <div className="seg" style={{ position: 'absolute', right: 10, top: 10 }}>
        {(['overview', 'optimization', 'incident'] as CameraMode[]).map((m) => (
          <button key={m} aria-pressed={camera === m} onClick={() => setCamera(m)}>{m}</button>
        ))}
      </div>
      <div style={{ position: 'absolute', left: 10, bottom: 10 }}><MapLegend /></div>
    </section>
  );
}
