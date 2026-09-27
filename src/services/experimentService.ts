import type { AlgorithmResult } from '@/types/domain';
import { ALGORITHM_FIXTURE } from '@/mock/fixtures';
import { http, isDemo, post } from './api';

export interface ExperimentResults { experimentId: string; fixture: boolean; results: AlgorithmResult[] }

/** Algorithm Lab data. DEMO returns a clearly labelled layout fixture. */
export const experimentService = {
  latest: (): Promise<ExperimentResults | null> =>
    isDemo ? Promise.resolve({ experimentId: 'fixture', fixture: true, results: ALGORITHM_FIXTURE }) : http<ExperimentResults>('/api/experiments/latest'),
  run: (config: Record<string, unknown>) => (isDemo ? Promise.reject(new Error('Requires backend')) : post<{ experimentId: string }>('/api/experiments/run', config))
};
