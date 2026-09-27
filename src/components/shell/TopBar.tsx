import { useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { NAV } from './nav';
import { DATA_SOURCE } from '@/config';

export interface TopBarStatus { sim: string; scenario: string; health: string; healthOk: boolean }

export function TopBar({ status }: { status: TopBarStatus }) {
  const { pathname } = useLocation();
  const page = NAV.find((n) => (n.path === '/' ? pathname === '/' : pathname.startsWith(n.path)))?.title ?? 'QIRTO';
  const live = DATA_SOURCE === 'live';
  return (
    <header className="topbar">
      <div className="topbar-brand">
        <span className="topbar-name">QIRTO</span>
        <span className="muted">/</span>
        <span className="topbar-page">{page}</span>
      </div>
      <div className="topbar-status">
        <div className="topbar-kv">
          <span className="dot" style={{ background: live ? 'var(--ok)' : 'var(--warn)' }} />
          <span className="topbar-v" style={{ color: live ? 'var(--ok)' : 'var(--warn)', fontSize: 11 }}>{live ? 'LIVE' : 'Demo data'}</span>
        </div>
        <div className="topbar-kv"><span className="topbar-k">Simulation</span><span className="topbar-v">{status.sim}</span></div>
        <div className="topbar-kv"><span className="topbar-k">Scenario</span><span className="topbar-v">{status.scenario}</span></div>
        <div className="topbar-kv">
          <span className="topbar-k">Health</span>
          <span className="dot" style={{ background: status.healthOk ? 'var(--ok)' : 'var(--warn)' }} />
          <span className="topbar-v">{status.health}</span>
        </div>
        <div className="topbar-kv">
          <Link to="/system" className="icon-btn" aria-label="Settings">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
              <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />
            </svg>
          </Link>
          <button className="icon-btn" aria-label="Operator profile">OP</button>
        </div>
      </div>
    </header>
  );
}
