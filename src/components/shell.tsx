'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, type FormEvent, type ReactNode } from 'react';
import {
  LayoutDashboard,
  Search,
  Clapperboard,
  ScanLine,
  History,
  Link2,
  Bookmark,
  Bell,
  Code2,
  Settings,
  GitCompareArrows,
  ChevronDown,
  Menu,
  X,
  ArrowUpRight,
  ShieldCheck,
  LogOut,
} from 'lucide-react';
import { Logo } from './ui';
import { useWorkspace } from './workspace-context';
import { api } from '@/lib/client';
const navigation = [
  ['Dashboard', '/dashboard', LayoutDashboard],
  ['Profile Lookup', '/lookup', Search],
  ['Media Analyzer', '/media', Clapperboard],
  ['Tracker', '/tracker', ScanLine],
  ['History', '/history', History],
  ['Link Inspector', '/link-inspector', Link2],
  ['Saved Accounts', '/saved', Bookmark],
  ['Compare', '/compare', GitCompareArrows],
] as const;
export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname(),
    router = useRouter(),
    [search, setSearch] = useState(''),
    [mobile, setMobile] = useState(false);
  const { data, toast } = useWorkspace();
  const unread = data.notifications.filter((n) => !n.read_at).length;
  function lookup(e: FormEvent) {
    e.preventDefault();
    const name = search.trim().replace(/^@/, '');
    if (/^[A-Za-z0-9_.]{1,30}$/.test(name)) {
      router.push(`/profile/${name.toLowerCase()}`);
      setSearch('');
      setMobile(false);
    } else toast('Enter a valid Instagram username.');
  }
  async function logout() {
    try {
      await api('/api/auth/logout', 'POST');
      router.push('/');
    } catch (e) {
      toast(String(e));
    }
  }
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobile ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <Logo />
          <button
            className="mobile-only icon-button"
            aria-label="Close navigation"
            onClick={() => setMobile(false)}
          >
            <X size={20} />
          </button>
        </div>
        <button className="workspace-switch" onClick={() => router.push('/settings')}>
          <span className="workspace-icon">R</span>
          <span>
            Research workspace<small>{data.user.is_demo ? 'Demo workspace' : data.user.name}</small>
          </span>
          <ChevronDown size={15} />
        </button>
        <span className="nav-label">WORKSPACE</span>
        <nav aria-label="Main navigation">
          {navigation.map(([name, href, Icon]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobile(false)}
              className={`nav-item ${path === href || (href === '/lookup' && path.startsWith('/profile')) || (href !== '/dashboard' && path.startsWith(`${href}/`)) ? 'active' : ''}`}
            >
              <Icon size={18} />
              {name}
              {href === '/tracker' && <span className="nav-count">{data.tracked.length}</span>}
            </Link>
          ))}
        </nav>
        <span className="nav-label second">MANAGE</span>
        <nav aria-label="Workspace management">
          {[
            ['Notifications', '/notifications', Bell],
            ['Developer API', '/developers', Code2],
            ['Settings', '/settings', Settings],
          ].map(([label, href, Icon]) => {
            const I = Icon as typeof Bell;
            return (
              <Link
                key={String(href)}
                href={String(href)}
                onClick={() => setMobile(false)}
                className={`nav-item ${path === href ? 'active' : ''}`}
              >
                <I size={18} />
                {String(label)}
                {href === '/notifications' && unread > 0 && <span className="notification-dot" />}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="trust-card">
            <ShieldCheck size={19} />
            <strong>Intelligence with integrity</strong>
            <p>Know where every data point comes from.</p>
            <Link href="/developers">
              Explore data sources <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="user-row">
            <span className="user-avatar">{data.user.name.slice(0, 1)}</span>
            <div>
              {data.user.name}
              <small>
                {data.provider === 'mock'
                  ? 'Fictional data environment'
                  : 'Authorized data environment'}
              </small>
            </div>
            <button className="icon-button" aria-label="Sign out" onClick={() => void logout()}>
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      {mobile && (
        <button
          className="nav-scrim"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="main-column">
        <header className="topbar">
          <button
            className="mobile-only icon-button"
            aria-label="Open navigation"
            onClick={() => setMobile(true)}
          >
            <Menu />
          </button>
          <form className="global-search" onSubmit={lookup}>
            <Search size={18} />
            <input
              aria-label="Search Instagram username"
              placeholder="Search Instagram username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <kbd>↵</kbd>
          </form>
          <div className="topbar-right">
            <span className="environment">
              <i />
              {data.provider === 'mock' ? 'Demo environment' : 'Meta provider'}
            </span>
            <Link
              className="icon-button bell"
              aria-label={`Notifications, ${unread} unread`}
              href="/notifications"
            >
              <Bell size={19} />
              {unread > 0 && <i />}
            </Link>
          </div>
        </header>
        <main className="workspace-main">
          {data.provider === 'mock' && (
            <div className="demo-banner">
              <span>
                <span className="demo-pill">DEMO</span>Explore with confidence. All accounts,
                metrics, and activity shown here are fictional.
              </span>
              <Link href="/settings">
                About this workspace <ArrowUpRight size={14} />
              </Link>
            </div>
          )}
          {children}
          <footer className="workspace-footer">
            <span>RIGtracker · Independent of Meta and Instagram</span>
            <div>
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
              <span>All times UTC</span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
