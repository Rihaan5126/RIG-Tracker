'use client';
import { Dashboard } from './dashboard';
import { Lookup, ProfileView } from './profiles';
import { HistoryView } from './history';
import { MediaScreen } from './media';
import { Tracker } from './tracker';
import { Compare } from './compare';
import { Saved } from './saved';
import { LinkInspector } from './link-inspector';
import { Notifications } from './notifications';
import { Settings } from './settings';
import { Developers } from './developers';
import { Empty } from '@/components/ui';
export function Screen({ view }: { view: string[] }) {
  switch (view[0]) {
    case 'dashboard':
      return <Dashboard />;
    case 'lookup':
      return <Lookup />;
    case 'profile':
      return <ProfileView key={view[1]} username={view[1] ?? ''} />;
    case 'history':
      return <HistoryView key={view[1]} username={view[1]} />;
    case 'media':
      return <MediaScreen key={view[1]} id={view[1]} />;
    case 'tracker':
      return <Tracker />;
    case 'compare':
      return <Compare />;
    case 'saved':
      return <Saved />;
    case 'link-inspector':
      return <LinkInspector />;
    case 'notifications':
      return <Notifications />;
    case 'settings':
      return <Settings />;
    case 'developers':
    case 'api':
      return <Developers />;
    default:
      return <Empty title="Page not found">Use the navigation to return to your workspace.</Empty>;
  }
}
