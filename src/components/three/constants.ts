import { CITY_CENTER } from '@/mock/network';

/** Scene is centred on the city; network coords (x, z) → scene = (x - CX, z - CZ). */
export const CX = CITY_CENTER[0];
export const CZ = CITY_CENTER[1];

/** Hex colours for WebGL (mirrors tokens.css). */
export const C = {
  bg: '#0e0f11',
  ground: '#151619',
  water: '#121519',
  park: '#162019',
  road: '#26272c',
  building: '#303237',
  buildingTech: '#373a40',
  vehicle: '#cfcfcb',
  bus: '#9c9ea3',
  accent: '#d99a2b',
  accentInk: '#1a1407',
  text: '#e6e6e3',
  routePrimary: '#f0eee8',
  routeCasing: '#0e0f11',
  routeAlt: '#8e9096',
  routeRejected: '#55575d',
  routeCandidate: '#9c9ea3',
  routePrev: '#6c6e74',
  danger: '#d0493f',
  closed: '#9a9ca1',
  congestion: '#cf713a',
  ok: '#5dae7b',
  states: ['#5dae7b', '#c9a23c', '#cf713a', '#c8463f', '#6c6e74']
} as const;
