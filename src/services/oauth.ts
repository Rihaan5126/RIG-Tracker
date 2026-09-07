import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { config, metaConfigured } from '@/server/config';
import { query } from '@/server/db';
import { randomToken, hash, encrypt } from '@/server/crypto';
import { session, type Session } from '@/server/auth';
import { AppError, PermissionMissing } from '@/providers/instagram/exceptions';
export function verifiedOAuthUrls() {
  if (!metaConfigured())
    throw new AppError(
      'META_NOT_CONFIGURED',
      'Connect Instagram requires verified Meta app settings. See the capability matrix and setup guide.',
      503,
    );
  const authorize = new URL(config.META_AUTHORIZATION_URL!),
    token = new URL(config.META_TOKEN_URL!);
  if (
    authorize.origin !== 'https://www.instagram.com' ||
    authorize.pathname !== '/oauth/authorize' ||
    token.origin !== 'https://api.instagram.com' ||
    token.pathname !== '/oauth/access_token' ||
    authorize.username ||
    token.username
  )
    throw new AppError(
      'INVALID_META_CONFIGURATION',
      'OAuth endpoints must match the official Instagram Login endpoints.',
      503,
    );
  return { authorize, token };
}
export async function oauthStart(s: Session) {
  if (config.INSTAGRAM_PROVIDER !== 'meta')
    throw new AppError(
      'MOCK_MODE',
      'Switch the server to the Meta provider after configuring your app. Demo workspaces never connect to real accounts.',
      422,
    );
  const { authorize } = verifiedOAuthUrls(),
    state = randomToken();
  await query('INSERT INTO oauth_states(id,user_id,session_id,expires_at) VALUES($1,$2,$3,$4)', [
    hash(state),
    s.user.id,
    s.id,
    new Date(Date.now() + 600000),
  ]);
  authorize.search = new URLSearchParams({
    client_id: config.META_APP_ID!,
    redirect_uri: config.META_REDIRECT_URI!,
    response_type: 'code',
    scope: config.META_SCOPES,
    state,
  }).toString();
  return { url: authorize.href };
}
export async function consumeState(value: string, s: Session) {
  if (!/^[a-f0-9]{64}$/.test(value)) return false;
  const rows = await query(
    'DELETE FROM oauth_states WHERE id=$1 AND user_id=$2 AND session_id=$3 AND expires_at>now() RETURNING id',
    [hash(value), s.user.id, s.id],
  );
  return rows.length === 1;
}
export async function oauthCallback(req: NextRequest) {
  const s = await session(req);
  if (!(await consumeState(req.nextUrl.searchParams.get('state') ?? '', s)))
    throw new AppError(
      'OAUTH_STATE_INVALID',
      'The authorization request expired or could not be verified. Please reconnect.',
      400,
    );
  if (req.nextUrl.searchParams.has('error'))
    return NextResponse.redirect(new URL('/settings?connection=denied', config.APP_URL));
  const code = req.nextUrl.searchParams.get('code');
  if (!code || code.length > 4096)
    throw new AppError(
      'OAUTH_CODE_MISSING',
      'Instagram did not return a valid authorization code.',
    );
  const { token } = verifiedOAuthUrls();
  const response = await fetch(token, {
    method: 'POST',
    body: new URLSearchParams({
      client_id: config.META_APP_ID!,
      client_secret: config.META_APP_SECRET!,
      grant_type: 'authorization_code',
      redirect_uri: config.META_REDIRECT_URI!,
      code,
    }),
    signal: AbortSignal.timeout(15000),
    redirect: 'error',
    cache: 'no-store',
  });
  if (!response.ok)
    throw new AppError(
      'OAUTH_EXCHANGE_FAILED',
      'Meta rejected the authorization exchange. Please reconnect.',
      502,
    );
  const raw = await response.json();
  const grant = raw.data?.[0] ?? raw;
  if (typeof grant.access_token !== 'string' || !grant.user_id)
    throw new AppError(
      'OAUTH_INVALID_RESPONSE',
      'Meta returned an incomplete authorization response.',
      502,
    );
  // Never assume requested scopes were granted. Persist only provider-reported scopes.
  const scopes = Array.isArray(grant.permissions)
    ? grant.permissions.filter((v: unknown) => typeof v === 'string')
    : typeof grant.scope === 'string'
      ? grant.scope.split(',')
      : [];
  if (!scopes.includes('instagram_business_basic')) throw new PermissionMissing();
  const { MetaProvider } = await import('@/providers/instagram/meta-api');
  const provider = new MetaProvider();
  const context = {
    userId: s.user.id,
    accessToken: grant.access_token,
    accountId: String(grant.user_id),
    scopes,
  };
  const profile = await provider.getProfile('', context);
  // If the provider omits expires_in, use a conservative one-hour local expiry, never claim a long-lived token.
  const lifetime =
    typeof grant.expires_in === 'number' && grant.expires_in > 0 ? grant.expires_in : 3600;
  await query(
    'INSERT INTO oauth_connections(id,user_id,provider,provider_account_id,username,scopes,encrypted_token,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(user_id,provider_account_id) DO UPDATE SET scopes=EXCLUDED.scopes,encrypted_token=EXCLUDED.encrypted_token,expires_at=EXCLUDED.expires_at,username=EXCLUDED.username',
    [
      randomUUID(),
      s.user.id,
      'meta',
      profile.instagram_id,
      profile.username,
      scopes,
      encrypt(grant.access_token),
      new Date(Date.now() + lifetime * 1000),
    ],
  );
  const { persistProfile } = await import('@/services/tracking');
  await persistProfile(s.user.id, profile);
  return NextResponse.redirect(new URL('/settings?connection=connected', config.APP_URL));
}
