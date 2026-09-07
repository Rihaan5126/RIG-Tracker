import { AppError } from '@/providers/instagram/exceptions';
const hosts = new Set(['instagram.com', 'www.instagram.com', 'm.instagram.com', 'ig.me']);
export function inspectLink(input: string) {
  if (input.length > 2048)
    throw new AppError('INVALID_URL', 'Use a URL shorter than 2,048 characters.');
  let url: URL;
  try {
    url = new URL(input.match(/^https?:\/\//i) ? input : `https://${input}`);
  } catch {
    throw new AppError('INVALID_URL', 'Enter a valid Instagram URL.');
  }
  if (
    !['https:', 'http:'].includes(url.protocol) ||
    !hosts.has(url.hostname.toLowerCase()) ||
    url.username ||
    url.password ||
    (url.port && url.port !== '443' && url.port !== '80')
  )
    throw new AppError('INVALID_URL', 'Only ordinary Instagram and ig.me URLs are supported.');
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.some((p) => !/^[-A-Za-z0-9_.]+$/.test(p)))
    throw new AppError('INVALID_URL', 'The resource identifier contains unsupported characters.');
  const tracking = [...url.searchParams.keys()].filter((k) =>
    /^(utm_|igsh|igshid|fbclid|gclid|si$)/i.test(k),
  );
  const type =
    url.hostname === 'ig.me'
      ? 'short_link'
      : parts[0] === 'p'
        ? 'post'
        : parts[0] === 'reel' || parts[0] === 'reels'
          ? 'reel'
          : parts[0] === 'stories'
            ? 'story'
            : parts.length === 1
              ? 'profile'
              : 'unknown';
  const identifier =
    type === 'story' ? (parts[2] ?? null) : type === 'profile' ? parts[0] : (parts[1] ?? null);
  const cleaned = new URL(url.href);
  cleaned.protocol = 'https:';
  cleaned.port = '';
  cleaned.hostname = url.hostname === 'ig.me' ? 'ig.me' : 'www.instagram.com';
  cleaned.hash = '';
  for (const k of tracking) cleaned.searchParams.delete(k);
  cleaned.pathname = `/${parts.join('/')}${parts.length ? '/' : ''}`;
  return {
    original_url: input,
    canonical_url: cleaned.href,
    type,
    identifier,
    tracking_parameters: tracking,
    redirect_chain: [],
    redirects_followed: false,
    note: 'URL syntax inspected locally. No remote request was made; short links are not expanded and resource existence is not verified.',
    checked_at: new Date().toISOString(),
  };
}
