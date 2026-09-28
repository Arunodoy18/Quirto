import { analyticsSeries, type AnalyticsData, type AnalyticsFilters } from '@/mock/fixtures';
import { http, isDemo } from './api';

export type { AnalyticsData, AnalyticsFilters };

export const analyticsService = {
  get(f: AnalyticsFilters): Promise<AnalyticsData> {
    if (isDemo) return Promise.resolve(analyticsSeries(f));
    const q = new URLSearchParams(f as unknown as Record<string, string>).toString();
    return http<AnalyticsData>(`/api/analytics?${q}`);
  }
};
