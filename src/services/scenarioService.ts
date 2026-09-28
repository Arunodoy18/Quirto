import type { Scenario } from '@/types/domain';
import { PRESET_SCENARIOS } from '@/mock/fixtures';
import { del, http, isDemo, put } from './api';

let demoStore: Scenario[] = PRESET_SCENARIOS.map((s) => structuredClone(s));

/** Scenario CRUD. DEMO keeps scenarios in memory for the session. */
export const scenarioService = {
  list: (): Promise<Scenario[]> => (isDemo ? Promise.resolve(demoStore.map((s) => structuredClone(s))) : http<Scenario[]>('/api/scenarios')),
  save(s: Scenario): Promise<Scenario> {
    if (!isDemo) return put<Scenario>(`/api/scenarios/${s.id}`, s);
    const i = demoStore.findIndex((x) => x.id === s.id);
    demoStore = i >= 0 ? demoStore.map((x) => (x.id === s.id ? structuredClone(s) : x)) : [...demoStore, structuredClone(s)];
    return Promise.resolve(structuredClone(s));
  },
  remove(id: string): Promise<void> {
    if (!isDemo) return del<void>(`/api/scenarios/${id}`);
    demoStore = demoStore.filter((x) => x.id !== id || x.preset);
    return Promise.resolve();
  }
};
