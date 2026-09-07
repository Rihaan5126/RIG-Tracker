'use client';
import Link from 'next/link';
import { useState } from 'react';
import { CheckCheck, Check, Zap, TrendingUp } from 'lucide-react';
import { useWorkspace } from '@/components/workspace-context';
import { Heading, Panel, Empty } from '@/components/ui';
import { api, date } from '@/lib/client';
export function Notifications() {
  const { data, reload, toast } = useWorkspace(),
    [unread, setUnread] = useState(false);
  async function read(id?: string) {
    try {
      await api(`/api/v1/notifications${id ? `/${id}` : ''}`, 'PATCH');
      await reload();
    } catch (e) {
      toast(String(e));
    }
  }
  const items = data.notifications.filter((n) => !unread || !n.read_at);
  return (
    <>
      <Heading
        eyebrow="THE CHANGES THAT MATTER"
        title="Notifications"
        description="Meaningful updates from your tracking workspace."
        actions={
          <button className="button" onClick={() => void read()}>
            <CheckCheck size={16} />
            Mark all as read
          </button>
        }
      />
      <div className="toolbar">
        <div className="segmented">
          <button className={!unread ? 'selected' : ''} onClick={() => setUnread(false)}>
            All notifications
          </button>
          <button className={unread ? 'selected' : ''} onClick={() => setUnread(true)}>
            Unread ({data.notifications.filter((n) => !n.read_at).length})
          </button>
        </div>
        <span className="hint">In-app delivery · preferences live in Tracker</span>
      </div>
      <Panel>
        {items.map((n) => (
          <article key={n.id} className={`notification-item ${n.read_at ? '' : 'unread'}`}>
            <span className={`event-icon ${n.event_type === 'growth_spike' ? 'mint' : 'violet'}`}>
              {n.event_type === 'growth_spike' ? <TrendingUp size={18} /> : <Zap size={18} />}
            </span>
            <div>
              <h3>{n.title}</h3>
              <p>{n.body}</p>
              <time>{date(n.created_at, true)} UTC</time>
              {n.username && (
                <Link
                  href={`/history/${n.username}`}
                  className="text-link"
                  style={{ marginTop: 8 }}
                >
                  Review profile history →
                </Link>
              )}
            </div>
            {!n.read_at && (
              <button
                className="icon-button"
                aria-label={`Mark notification read: ${n.title}`}
                onClick={() => void read(n.id)}
              >
                <Check size={17} />
              </button>
            )}
          </article>
        ))}
        {!items.length && (
          <Empty title="You’re all caught up">New tracking notifications will appear here.</Empty>
        )}
      </Panel>
    </>
  );
}
