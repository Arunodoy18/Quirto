import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar, type TopBarStatus } from './TopBar';
import './shell.css';

export function AppShell({ children, status }: { children: ReactNode; status: TopBarStatus }) {
  return (
    <div className="app">
      <Sidebar />
      <div className="app-main">
        <TopBar status={status} />
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
