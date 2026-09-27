import { NavLink } from 'react-router-dom';
import { NAV } from './nav';
import { Logo } from './Logo';
import { DATA_SOURCE } from '@/config';
import './shell.css';

export function Sidebar() {
  return (
    <nav className="rail" aria-label="Primary">
      <NavLink to="/" className="rail-logo" aria-label="QIRTO — Command Center">
        <Logo />
      </NavLink>
      <div className="rail-items">
        {NAV.map((n) => (
          <NavLink key={n.path} to={n.path} end={n.path === '/'} className="rail-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={n.icon} />
            </svg>
            <span>{n.label}</span>
          </NavLink>
        ))}
      </div>
      <div className="rail-foot mono">
        <span>v0.1</span>
        <span style={{ color: DATA_SOURCE === 'live' ? 'var(--ok)' : 'var(--warn)' }}>{DATA_SOURCE === 'live' ? 'LIVE' : 'DEMO'}</span>
      </div>
    </nav>
  );
}
