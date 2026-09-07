'use client';
import { useState } from 'react';
import { Play, Code2 } from 'lucide-react';
import { Heading, Panel, Hint } from '@/components/ui';
import { endpoints } from '@/domain/endpoints';
import { api } from '@/lib/client';
export function Developers() {
  const [result, setResult] = useState(''),
    [busy, setBusy] = useState(false);
  async function test() {
    setBusy(true);
    try {
      setResult(JSON.stringify(await api('/api/v1/profile/rigtracker_demo'), null, 2));
    } catch (e) {
      setResult(String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Heading
        eyebrow="BUILT TO BE CONNECTED"
        title="Developer API"
        description="A consistent interface for profiles, observations, and derived intelligence."
      />
      <div className="stack">
        <div className="two-column">
          <Panel title="Make your first request" action={<Code2 size={19} className="muted" />}>
            <div className="content-pad stack">
              <p className="muted">
                The internal API uses your workspace session. Each request is scoped to the
                signed-in user.
              </p>
              <pre className="docs-code">
                {
                  'GET /api/v1/profile/rigtracker_demo\nAccept: application/json\nCookie: rig_session=<your session>'
                }
              </pre>
              <button className="button primary" disabled={busy} onClick={() => void test()}>
                <Play size={14} />
                {busy ? 'Requesting…' : 'Run sample request'}
              </button>
              {result && (
                <pre className="docs-code" style={{ maxHeight: 330, overflow: 'auto' }}>
                  {result}
                </pre>
              )}
            </div>
          </Panel>
          <Panel title="Response contract">
            <div className="content-pad stack">
              <pre className="docs-code">
                {JSON.stringify(
                  {
                    success: true,
                    data: { username: 'rigtracker_demo', verified: null, source: 'mock' },
                    meta: {
                      provider: 'mock',
                      retrieved_at: 'ISO-8601 timestamp',
                      cached: false,
                      request_id: 'uuid',
                    },
                  },
                  null,
                  2,
                )}
              </pre>
              <Hint>
                Nullable values mean unavailable. Fictional records carry source: mock. Dates use
                UTC. Mutations require the same-origin Origin header and X-CSRF-Token from
                /api/auth/session.
              </Hint>
            </div>
          </Panel>
        </div>
        <Panel title="Endpoints" subtitle="Expand an endpoint for its parameters and result type.">
          {endpoints.map(([method, url, description, parameters, response]) => (
            <details key={`${method}:${url}`}>
              <summary className="endpoint">
                <span className={`method ${method}`}>{method}</span>
                <code>{url}</code>
                <span>{description}</span>
              </summary>
              <div className="content-pad">
                <p className="muted">Parameters: {parameters}</p>
                <p style={{ marginTop: 9 }}>
                  Response data: <code>{response}</code>
                </p>
                <p className="hint" style={{ marginTop: 9 }}>
                  All internal endpoints require a session. Errors: 400 validation, 401
                  sign-in/expiry, 403 scope/CSRF, 404 unavailable resource, 409 conflict, 413 body
                  too large, 422 unsupported, 429 rate limit, 503 provider unavailable. The response
                  includes an error code, safe message, and request ID.
                </p>
              </div>
            </details>
          ))}
        </Panel>
        <Panel title="Error response and usage limits">
          <div className="content-pad stack">
            <pre className="docs-code">
              {JSON.stringify(
                {
                  success: false,
                  error: {
                    code: 'UNSUPPORTED_CAPABILITY',
                    message:
                      'Instagram currently does not expose this capability through the configured official API.',
                    request_id: 'uuid',
                  },
                },
                null,
                2,
              )}
            </pre>
            <p className="muted">
              Internal API: 180 requests per minute per workspace. Authentication: 20 per minute per
              trusted client address (or a shared local bucket). Refresh: once per account per
              minute. Meta requests have a conservative 60-call hourly budget per connected account,
              a 15-minute cache, usage-header checks and Retry-After backoff.
            </p>
            <Hint>
              Public API keys, email delivery and external webhooks are future modules. No API
              exposes passwords, encrypted tokens, or raw provider responses.
            </Hint>
          </div>
        </Panel>
      </div>
    </>
  );
}
