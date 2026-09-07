'use client';
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { WorkspaceData } from '@/domain/models';
import { api } from '@/lib/client';
const Context = createContext<{
  data: WorkspaceData;
  reload: () => Promise<void>;
  toast: (message: string) => void;
} | null>(null);
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<WorkspaceData | null>(null),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const router = useRouter();
  const reload = useCallback(async () => {
    try {
      const result = await api<WorkspaceData>('/api/v1/workspace');
      setData(result);
      setError('');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unable to load workspace';
      if (message.startsWith('UNAUTHORIZED')) router.replace('/login');
      else setError(message);
    }
  }, [router]);
  useEffect(() => {
    let active = true;
    api<WorkspaceData>('/api/v1/workspace')
      .then((result) => {
        if (active) setData(result);
      })
      .catch((e) => {
        if (!active) return;
        const message = e instanceof Error ? e.message : 'Unable to load workspace';
        if (message.startsWith('UNAUTHORIZED')) router.replace('/login');
        else setError(message);
      });
    return () => {
      active = false;
    };
  }, [router]);
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(''), 5000);
    return () => clearTimeout(t);
  }, [message]);
  if (error)
    return (
      <div className="app-loading">
        <h2>We couldn’t load your workspace</h2>
        <p>{error}</p>
        <button className="button primary" onClick={() => void reload()}>
          Try again
        </button>
      </div>
    );
  if (!data)
    return (
      <div className="app-loading" aria-busy="true" aria-label="Loading workspace">
        <div className="skeleton" style={{ width: 220, height: 28 }} />
        <div className="skeleton" style={{ width: 360, maxWidth: '90vw', height: 160 }} />
        <p>Opening your workspace…</p>
      </div>
    );
  return (
    <Context.Provider value={{ data, reload, toast: setMessage }}>
      {children}
      {message && (
        <div className="toast" role="status">
          {message}
          <button aria-label="Dismiss message" onClick={() => setMessage('')}>
            ×
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
export function useWorkspace() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('Workspace provider is required');
  return ctx;
}
