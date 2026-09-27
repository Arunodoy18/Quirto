/** Runtime configuration. Copy .env.example to .env to change it. */
export type DataSource = 'demo' | 'live';

export const DATA_SOURCE: DataSource = import.meta.env.VITE_DATA_SOURCE === 'live' ? 'live' : 'demo';
export const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
export const WS_URL: string = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8000';
