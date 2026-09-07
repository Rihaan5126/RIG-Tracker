import Link from 'next/link';
import { Logo } from '@/components/ui';
export default function Terms() {
  return (
    <main className="legal">
      <Logo />
      <h1>Terms of use</h1>
      <p>
        RIGtracker is independent of Meta and Instagram. This local MVP supports research with
        fictional demo data or data from accounts you are authorized to connect. These product terms
        require operator-specific legal review and contact details before a public commercial
        launch.
      </p>
      <h2>Permitted research</h2>
      <p>
        Use only data you are entitled to access and monitor. Respect Meta’s applicable platform
        terms, provider limits, privacy rights and consent requirements. Do not use RIGtracker to
        bypass technical controls, obtain hidden personal information, or target people for
        harassment.
      </p>
      <h2>Understanding the data</h2>
      <p>
        Fictional data is labeled as demo data. Historical observations reflect what RIGtracker
        stored at a particular time. Derived metrics are calculations, not Instagram-confirmed
        conclusions. Missing values remain unavailable. A growth spike is an unusual numerical
        change, not evidence of purchased followers or misconduct.
      </p>
      <h2>Availability and limitations</h2>
      <p>
        Meta permissions, account eligibility and APIs can change. Features can become unavailable
        or return partial data. RIGtracker does not promise access to arbitrary public profiles,
        private accounts, third-party Stories or complete historical records. Live integrations
        require the operator’s verified configuration and approval.
      </p>
      <h2>Your workspace</h2>
      <p>
        You control your local notes, tracking configuration and stored observations. You can export
        and delete local data in Settings. Keep your RIGtracker sign-in secure and only connect
        Instagram accounts you are authorized to use.
      </p>
      <Link className="button" href="/">
        Back to RIGtracker →
      </Link>
    </main>
  );
}
