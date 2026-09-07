'use client';
import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/ui';
import { api } from '@/lib/client';
export function Login() {
  const params = useSearchParams(),
    router = useRouter();
  const [register, setRegister] = useState(params.has('register')),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function demo() {
    setBusy(true);
    setError('');
    try {
      await api('/api/auth/demo', 'POST');
      router.push('/dashboard');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to open demo');
      setBusy(false);
    }
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(e.currentTarget);
    try {
      await api(`/api/auth/${register ? 'register' : 'login'}`, 'POST', {
        name: form.get('name') || undefined,
        email: form.get('email'),
        password: form.get('password'),
      });
      router.push('/dashboard');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to sign in');
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <Logo />
      <div className="auth-card">
        <span className="eyebrow">YOUR NEXT OBSERVATION STARTS HERE</span>
        <h1>{register ? 'Create a workspace.' : 'Welcome to RIGtracker.'}</h1>
        <p className="muted">A clearer view of the accounts that matter.</p>
        <button className="button primary full large" disabled={busy} onClick={() => void demo()}>
          {busy ? 'Opening workspace…' : 'Explore the fictional demo'}
          <ArrowRight size={17} />
        </button>
        <div className="auth-divider">or use your RIGtracker account</div>
        <div className="segmented full">
          <button className={!register ? 'selected' : ''} onClick={() => setRegister(false)}>
            Sign in
          </button>
          <button className={register ? 'selected' : ''} onClick={() => setRegister(true)}>
            Create account
          </button>
        </div>
        <form onSubmit={submit} className="form-stack">
          {register && (
            <label>
              Your name
              <input name="name" autoComplete="name" minLength={2} maxLength={80} required />
            </label>
          )}
          <label>
            Email
            <input type="email" name="email" autoComplete="email" required />
          </label>
          <label>
            RIGtracker password
            <input
              type="password"
              name="password"
              autoComplete={register ? 'new-password' : 'current-password'}
              minLength={12}
              maxLength={128}
              required
              placeholder="At least 12 characters"
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="button full" disabled={busy}>
            {register ? 'Create workspace' : 'Sign in'}
            <ArrowRight size={16} />
          </button>
        </form>
        <p className="auth-footnote">
          <ShieldCheck size={17} />
          This is your RIGtracker login. We never ask for your Instagram password.
        </p>
      </div>
    </div>
  );
}
