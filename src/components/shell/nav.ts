export interface NavItem {
  path: string;
  label: string;
  title: string;
  icon: string;
}

/** Primary navigation. `icon` is a 24×24 stroke path. */
export const NAV: NavItem[] = [
  { path: '/', label: 'Command\nCenter', title: 'Command Center', icon: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z' },
  { path: '/route', label: 'Route\nOptimization', title: 'Route Optimization', icon: 'M6 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM6 17V11a4 4 0 0 1 4-4h6M18 7v4a4 4 0 0 1-4 4H9' },
  { path: '/simulation', label: 'Live\nSimulation', title: 'Live Simulation', icon: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM10 8.5l5.5 3.5-5.5 3.5z' },
  { path: '/lab', label: 'Algorithm\nLab', title: 'Algorithm Lab', icon: 'M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3M7.5 14h9' },
  { path: '/analytics', label: 'Analytics', title: 'Analytics', icon: 'M4 20V11M10 20V5M16 20v-6M21 20H3' },
  { path: '/scenarios', label: 'Scenarios', title: 'Scenario Manager', icon: 'M12 3l9 5-9 5-9-5 9-5zM3 12.5l9 5 9-5M3 17l9 5 9-5' },
  { path: '/system', label: 'System', title: 'System', icon: 'M3 12h4l3-8 4 16 3-8h4' }
];
