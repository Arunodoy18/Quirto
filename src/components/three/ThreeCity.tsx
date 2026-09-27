import { Canvas } from '@react-three/fiber';
import type { CameraMode, Incident, RoutePhase, RouteSet } from '@/types/domain';
import { CameraController } from './CameraController';
import { Ground } from './Ground';
import { RoadNetwork } from './RoadNetwork';
import { Buildings } from './Buildings';
import { VehicleLayer } from './VehicleLayer';
import { SignalLayer } from './SignalLayer';
import { RouteLayer } from './RouteLayer';
import { IncidentLayer } from './IncidentLayer';
import { Markers } from './Markers';
import { RainLayer } from './RainLayer';
import { C, CX, CZ } from './constants';

export interface ThreeCityProps {
  camera: CameraMode;
  incidents: Incident[];
  routes?: RouteSet | null;
  phase?: RoutePhase;
  optT?: number;
  origin?: string;
  destination?: string;
  showOD?: boolean;
  showRejected?: boolean;
}

/**
 * The digital twin. Reads live scene state every frame from trafficService;
 * everything else (routes, camera, incidents) comes in as props.
 */
export function ThreeCity({ camera, incidents, routes, phase = 'none', optT, origin = 'station', destination = 'techpark', showOD = true, showRejected }: ThreeCityProps) {
  return (
    <Canvas dpr={[1, 2]} gl={{ antialias: true }} camera={{ fov: 42, near: 5, far: 8000, position: [0, 1200, 1200] }} style={{ position: 'absolute', inset: 0, touchAction: 'none' }} aria-label="3D digital twin of the road network">
      <color attach="background" args={[C.bg]} />
      <fog attach="fog" args={[C.bg, 1400, 3200]} />
      <ambientLight intensity={1.3} />
      <directionalLight position={[400, 900, 300]} intensity={1.6} />
      <CameraController mode={camera} routes={routes} incidents={incidents} origin={origin} destination={destination} />
      <group position={[-CX, 0, -CZ]}>
        <Ground />
        <RoadNetwork />
        <Buildings />
        <SignalLayer />
        <VehicleLayer />
        <RouteLayer routes={routes} phase={phase} optT={optT} showRejected={showRejected} />
        <IncidentLayer incidents={incidents} />
        <Markers origin={origin} destination={destination} showOD={showOD} />
        <RainLayer />
      </group>
    </Canvas>
  );
}
