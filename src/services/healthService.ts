import type { SystemHealth } from '@/types/domain';
import { http, isDemo } from './api';

/** Mock state lets designers preview every service state in DEMO mode. */
let mock: SystemHealth = { sumo: 'DISCONNECTED', fastapi: 'DISCONNECTED', optimizer: 'READY', websocket: 'DISCONNECTED', database: 'DISCONNECTED', checkedAt: new Date().toISOString() };

export const healthService = {
  get: (): Promise<SystemHealth> => (isDemo ? Promise.resolve({ ...mock }) : http<SystemHealth>('/api/health')),
  setMock(patch: Partial<SystemHealth>) { mock = { ...mock, ...patch, checkedAt: new Date().toISOString() }; }
};
