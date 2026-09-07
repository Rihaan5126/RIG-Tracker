import Link from 'next/link';
import {
  ArrowUpRight,
  ArrowRight,
  ScanLine,
  ChartNoAxesCombined,
  History,
  ShieldCheck,
  Radar,
} from 'lucide-react';
import { Logo } from '@/components/ui';
export default function Landing() {
  return (
    <div className="landing">
      <nav className="landing-nav">
        <Logo />
        <div>
          <a href="#intelligence">Platform</a>
          <Link href="/developers">Developers</Link>
          <Link href="/privacy">Our approach</Link>
        </div>
        <Link className="button" href="/login">
          Open workspace <ArrowUpRight size={16} />
        </Link>
      </nav>
      <main>
        <section className="landing-hero">
          <div className="hero-copy">
            <span className="eyebrow">
              <i className="tiny-dot" />A CLEARER VIEW OF YOUR INSTAGRAM WORLD
            </span>
            <h1>
              Instagram intelligence,
              <br />
              <em>organized.</em>
            </h1>
            <p>
              Analyze accounts, monitor public changes, inspect media performance, and build
              historical profiles from one dashboard.
            </p>
            <div className="hero-actions">
              <Link className="button primary large" href="/login?demo=true">
                Explore the demo <ArrowRight size={18} />
              </Link>
              <Link className="button ghost large" href="/login?register=true">
                Create your workspace
              </Link>
            </div>
            <span className="hero-note">
              <ShieldCheck size={15} />
              Authorized data. Clear sources. No guesswork.
            </span>
          </div>
          <div className="hero-visual">
            <div className="preview-top">
              <span>
                <Radar size={17} />
                RIGtracker workspace
              </span>
              <span className="demo-pill">FICTIONAL PREVIEW</span>
            </div>
            <div className="preview-title">
              A little perspective.
              <br />A lot of possibility.
            </div>
            <div className="preview-stat">
              <strong>118,670</strong>
              <span>
                +3.42% <ArrowUpRight size={14} />
              </span>
            </div>
            <span className="muted">Observed audience · fictional example</span>
            <svg
              className="hero-chart"
              viewBox="0 0 500 170"
              role="img"
              aria-label="Illustrative fictional audience growth"
            >
              <defs>
                <linearGradient id="heroFill" x1="0" x2="0" y1="0" y2="1">
                  <stop stopColor="#a4f2ce" stopOpacity=".3" />
                  <stop offset="1" stopColor="#a4f2ce" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[35, 80, 125].map((y) => (
                <path key={y} d={`M0 ${y} H500`} stroke="#28372f" strokeDasharray="3 5" />
              ))}
              <path
                d="M0 153 L25 148 L50 149 L75 139 L100 142 L125 124 L150 127 L175 118 L200 101 L225 108 L250 94 L275 89 L300 76 L325 79 L350 59 L375 64 L400 46 L425 43 L450 27 L475 32 L500 10 L500 170 L0 170 Z"
                fill="url(#heroFill)"
              />
              <path
                d="M0 153 L25 148 L50 149 L75 139 L100 142 L125 124 L150 127 L175 118 L200 101 L225 108 L250 94 L275 89 L300 76 L325 79 L350 59 L375 64 L400 46 L425 43 L450 27 L475 32 L500 10"
                fill="none"
                stroke="#a4f2ce"
                strokeWidth="2.5"
              />
            </svg>
            <div className="preview-observation">
              <span className="event-icon mint">
                <ScanLine size={20} />
              </span>
              <span>
                <strong>Turn changes into context.</strong>
                <small>Profiles, media and history. Connected.</small>
              </span>
              <ArrowUpRight size={19} />
            </div>
          </div>
        </section>
        <section className="landing-features" id="intelligence">
          {[
            [
              ScanLine,
              'See the whole profile',
              'Bring available account data into one considered workspace.',
            ],
            [
              History,
              'Build a longer memory',
              'See what changed, when it changed, and what it means over time.',
            ],
            [
              ChartNoAxesCombined,
              'Find useful signals',
              'Explore growth and media performance with explicit formulas.',
            ],
          ].map(([Icon, title, text]) => {
            const I = Icon as typeof ScanLine;
            return (
              <article key={String(title)}>
                <I size={25} />
                <h2>{String(title)}</h2>
                <p>{String(text)}</p>
              </article>
            );
          })}
        </section>
        <section className="landing-principle">
          <div>
            <span className="eyebrow">BUILT ON CLEAR BOUNDARIES</span>
            <h2>
              Good intelligence starts
              <br />
              with knowing your sources.
            </h2>
          </div>
          <p>
            Every observation has an origin. RIGtracker distinguishes what Instagram reports, what
            you previously observed, what we calculate, and what is unavailable. The demo uses
            entirely fictional data.
          </p>
        </section>
      </main>
      <footer className="landing-footer">
        <Logo />
        <span>Independent of Meta and Instagram.</span>
        <div>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </div>
      </footer>
    </div>
  );
}
