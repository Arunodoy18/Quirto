export const clockStr = (sec: number | null | undefined) => {
  if (sec == null) return '--:--:--';
  const s = Math.floor(sec) % 86400;
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((v) => String(v).padStart(2, '0')).join(':');
};

export const LEVEL_COLOR = { LOW: 'var(--ok)', MODERATE: 'var(--warn)', HIGH: 'var(--danger)' } as const;
export const ROAD_COLOR = { FREE: 'var(--road-free)', MODERATE: 'var(--road-moderate)', CONGESTED: 'var(--road-congested)', SEVERE: 'var(--road-severe)', CLOSED: 'var(--road-closed)' } as const;

export const SCENARIOS: Array<[import('@/types/domain').ScenarioKey, string]> = [
  ['normal', 'Normal'], ['peak', 'Peak Hour'], ['accident', 'Accident'], ['rain', 'Heavy Rain'], ['closure', 'Road Closure'], ['multi', 'Multi-Incident']
];
export const scenarioLabel = (k: string) => SCENARIOS.find((s) => s[0] === k)?.[1] ?? k;

export const VEHICLES: Array<[import('@/types/domain').VehicleType, string]> = [['car', 'Car'], ['bike', 'Bike'], ['bus', 'Bus'], ['truck', 'Truck'], ['emergency', 'Emergency']];
export const PROFILES: Array<[import('@/types/domain').ProfileKey, string]> = [['balanced', 'Balanced'], ['fastest', 'Fastest'], ['fuel', 'Fuel Efficient'], ['safety', 'Safety']];
