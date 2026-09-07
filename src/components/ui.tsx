'use client';
import Link from 'next/link';
import { useEffect, useRef, type ReactNode } from 'react';
import { ArrowUpRight, X, Info, ShieldCheck, Radar, ArrowRight } from 'lucide-react';
import type { Profile, Source } from '@/domain/models';
export function Logo() {
  return (
    <Link className="logo" href="/">
      <span className="logo-mark">
        <Radar size={24} />
      </span>
      <span>
        RIG<span className="logo-light">tracker</span>
        <i />
      </span>
    </Link>
  );
}
export function SourceBadge({ source = 'mock' }: { source?: Source }) {
  const labels: Record<Source, string> = {
    mock: 'Fictional demo',
    official: 'Official Instagram API',
    authorized: 'Authorized account',
    historical_observation: 'Historical observation',
    derived: 'Calculated by RIGtracker',
    unavailable: 'Unavailable',
    user_supplied: 'User supplied',
  };
  return (
    <span className={`source ${source}`}>
      <span />
      {labels[source]}
    </span>
  );
}
export function Avatar({
  profile,
  size = 'normal',
}: {
  profile: Pick<Profile, 'username' | 'display_name' | 'color' | 'profile_picture_url'>;
  size?: 'normal' | 'large' | 'small';
}) {
  return (
    <span
      className={`avatar ${size}`}
      style={{
        background: `${profile.color}18`,
        color: profile.color,
        borderColor: `${profile.color}30`,
      }}
    >
      {profile.profile_picture_url ? (
        <img src={profile.profile_picture_url} alt="" />
      ) : (
        (profile.display_name ?? profile.username).slice(0, 2).toUpperCase()
      )}
    </span>
  );
}
export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Radar size={28} />
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export function Unsupported({ children }: { children?: ReactNode }) {
  return (
    <div className="notice">
      <ShieldCheck size={20} />
      <div>
        <strong>Capability unavailable</strong>
        <p>
          {children ??
            'Instagram currently does not expose this capability through the configured official API.'}
        </p>
      </div>
    </div>
  );
}
export function Heading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      <div className="heading-actions">{actions}</div>
    </div>
  );
}
export function Stat({
  title,
  value,
  detail,
  icon,
  positive = true,
}: {
  title: string;
  value: ReactNode;
  detail?: ReactNode;
  icon?: ReactNode;
  positive?: boolean;
}) {
  return (
    <div className="stat">
      <div className="stat-label">
        {title}
        <span>{icon ?? <ArrowUpRight size={17} />}</span>
      </div>
      <div className="stat-value">{value}</div>
      {detail && <div className={`stat-detail ${positive ? 'positive' : ''}`}>{detail}</div>}
    </div>
  );
}
export function Panel({
  title,
  subtitle,
  action,
  children,
  className = '',
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <div className="panel-heading">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <button className="icon-button" aria-label="Close dialog" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function ViewLink({ href, children = 'View all' }: { href: string; children?: ReactNode }) {
  return (
    <Link href={href} className="text-link">
      {children}
      <ArrowRight size={15} />
    </Link>
  );
}
export function Hint({ children }: { children: ReactNode }) {
  return (
    <p className="hint">
      <Info size={15} />
      <span>{children}</span>
    </p>
  );
}
