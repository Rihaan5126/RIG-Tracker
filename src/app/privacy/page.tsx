import Link from 'next/link';
import { Logo } from '@/components/ui';
export default function Privacy() {
  return (
    <main className="legal">
      <Logo />
      <h1>Privacy & data</h1>
      <p>
        RIGtracker is an independent research application. It is not affiliated with Meta or
        Instagram. This notice describes this local MVP; the operator must provide their contact
        details and applicable retention policy before offering a hosted service.
      </p>
      <h2>What this application stores</h2>
      <p>
        Your RIGtracker email and name, a securely hashed RIGtracker password, your saved accounts
        and notes, authorized profile observations, available media metrics, tracking events, and
        notifications. Demo accounts and all demo metrics are fictional. Each signed-in user has a
        separate workspace.
      </p>
      <h2>Instagram authorization</h2>
      <p>
        You authenticate directly with Meta. RIGtracker never asks for or stores your Instagram
        password, browser session cookies, recovery details, or hidden contact information. If
        connected, an access token is encrypted on the server alongside the granted scopes, account
        ID, and expiry.
      </p>
      <h2>Your controls</h2>
      <p>
        Settings lets you export your workspace, disconnect a locally stored connection, or
        permanently delete your local account and associated records. Disconnecting removes the
        local token and pauses live tracking; you can revoke the grant itself in Instagram’s
        connected-app settings. Deletion does not delete Instagram content. Operators must also
        apply deletion to their backups according to their published retention policy.
      </p>
      <h2>Cookies, media and telemetry</h2>
      <p>
        Two first-party cookies support sign-in and request verification. There are no advertising
        cookies. Media files are not downloaded or archived; where allowed, provider-hosted image
        URLs may be displayed. Loading a remote image sends an ordinary browser request to that
        host. Request logs contain route, status, timing and a random request ID, never
        authentication secrets.
      </p>
      <h2>Retention</h2>
      <p>
        Workspace observations are retained until you delete them or the operator applies a
        documented retention policy. The worker removes expired sessions and OAuth states, old
        telemetry after 30 days, and temporary demo workspaces after 7 days. Production backups need
        a separate operator-managed retention policy.
      </p>
      <h2>Unsupported access</h2>
      <p>
        RIGtracker does not access private accounts without authorization, collect Instagram
        credentials, identify hidden contacts or link sharers, or bypass platform access controls.
      </p>
      <Link className="button" href="/settings">
        Manage your data →
      </Link>
    </main>
  );
}
