import { randomUUID } from 'node:crypto';
import type { InstagramProvider, ProviderContext } from './base';
import { config } from '@/server/config';
import { normalizeProfile, normalizeMedia } from './normalization';
import {
  PermissionMissing,
  ProfileNotFound,
  ProviderUnavailable,
  RateLimited,
  TokenExpired,
  UnsupportedCapability,
} from './exceptions';
import { cacheGet, cacheSet, limit } from '@/server/cache';
import { query } from '@/server/db';
import { inspectLink } from '@/services/links';
const inFlight = new Map<string, Promise<Record<string, unknown>>>();
const safeFields = (value: string) =>
  value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^[a-z_]+$/.test(s));
export function normalizeMetaError(status: number, code?: number, retry?: string | null): Error {
  if (status === 429 || [4, 17, 32, 613].includes(code ?? 0))
    return new RateLimited(Math.max(60, Math.min(Number(retry) || 3600, 86400)));
  if (code === 190 || status === 401) return new TokenExpired();
  if ([10, 200].includes(code ?? 0) || status === 403) return new PermissionMissing();
  if (status === 404) return new ProfileNotFound();
  if (code === 100)
    return new UnsupportedCapability(
      'The requested field or metric is not available for this account and API version.',
    );
  return new ProviderUnavailable();
}
export class MetaProvider implements InstagramProvider {
  readonly name = 'meta' as const;
  private async graph(path: string, params: Record<string, string>, context: ProviderContext) {
    if (!context.accessToken || !context.accountId) throw new PermissionMissing();
    if (context.expiresAt && Date.parse(context.expiresAt) <= Date.now()) throw new TokenExpired();
    if (!/^v\d+\.\d+$/.test(config.META_API_VERSION ?? ''))
      throw new UnsupportedCapability(
        'Set a verified Meta API version before using the live provider.',
      );
    const key = `provider:${context.userId}:${context.accountId}:${path}:${JSON.stringify(params)}`;
    const cached = await cacheGet<Record<string, unknown>>(key);
    if (cached) return cached;
    if (inFlight.has(key)) return inFlight.get(key)!;
    const promise = (async () => {
      const start = performance.now(),
        id = randomUUID();
      let status = 503;
      try {
        const pause = await cacheGet<number>(`meta-pause:${context.accountId}`);
        if (pause && pause > Date.now())
          throw new RateLimited(Math.ceil((pause - Date.now()) / 1000));
        // Deliberately below a universal quota claim: actual usage headers can stop calls sooner.
        await limit(`provider:${context.accountId}`, 60, 3600);
        const url = new URL(`https://graph.instagram.com/${config.META_API_VERSION}/${path}`);
        url.search = new URLSearchParams(params).toString();
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${context.accessToken}` },
          cache: 'no-store',
          redirect: 'error',
          signal: AbortSignal.timeout(15000),
        });
        status = response.status;
        const data = await response.json();
        if (!response.ok) {
          const error = normalizeMetaError(
            status,
            data.error?.code,
            response.headers.get('retry-after'),
          );
          if (error instanceof RateLimited)
            await cacheSet(
              `meta-pause:${context.accountId}`,
              Date.now() + (error.retryAfter ?? 3600) * 1000,
              error.retryAfter ?? 3600,
            );
          throw error;
        }
        const usage = response.headers.get('x-app-usage');
        if (usage) {
          try {
            const parsed = JSON.parse(usage);
            if (
              Math.max(parsed.call_count ?? 0, parsed.total_cputime ?? 0, parsed.total_time ?? 0) >=
              80
            )
              await cacheSet(`meta-pause:${context.accountId}`, Date.now() + 3600000, 3600);
          } catch {}
        }
        await cacheSet(key, data, 900);
        return data as Record<string, unknown>;
      } catch (e) {
        if (
          e instanceof Error &&
          [
            'RATE_LIMITED',
            'TOKEN_EXPIRED',
            'PERMISSION_MISSING',
            'UNSUPPORTED_CAPABILITY',
            'PROFILE_NOT_AVAILABLE',
          ].includes(e.name)
        )
          throw e;
        throw new ProviderUnavailable();
      } finally {
        await query(
          'INSERT INTO provider_requests(id,user_id,request_id,provider,operation,status,duration_ms,cache_hit) VALUES($1,$2,$3,$4,$5,$6,$7,false)',
          [
            randomUUID(),
            context.userId,
            id,
            'meta',
            path.includes('insights') ? 'insights' : path.includes('media') ? 'media' : 'profile',
            status,
            Math.round(performance.now() - start),
          ],
        ).catch(() => {});
      }
    })();
    inFlight.set(key, promise);
    try {
      return await promise;
    } finally {
      inFlight.delete(key);
    }
  }
  async getProfile(username: string, c: ProviderContext) {
    if (username && c.username && username !== c.username && username !== c.accountId)
      throw new UnsupportedCapability(
        'This provider can read only your connected professional account. Other-account discovery is not configured.',
      );
    return normalizeProfile(
      await this.graph(
        'me',
        {
          fields: ['id', 'username', ...safeFields(config.META_VERIFIED_PROFILE_FIELDS)].join(','),
        },
        c,
      ),
    );
  }
  async getProfileMedia(profileId: string, c: ProviderContext) {
    if (profileId !== c.accountId) throw new PermissionMissing();
    if (!config.META_VERIFIED_MEDIA_FIELDS)
      throw new UnsupportedCapability(
        'Media field compatibility has not been verified for this Meta app.',
      );
    const data = await this.graph(
      `${c.accountId}/media`,
      {
        fields: [
          'id',
          'timestamp',
          'media_type',
          ...safeFields(config.META_VERIFIED_MEDIA_FIELDS),
        ].join(','),
        limit: '50',
      },
      c,
    );
    return (Array.isArray(data.data) ? data.data : []).map((raw) =>
      normalizeMedia(raw as Record<string, unknown>, profileId, c.username ?? ''),
    );
  }
  async getMedia(id: string, c: ProviderContext) {
    const list = await this.getProfileMedia(c.accountId!, c);
    const m = list.find((m) => m.id === id);
    if (!m) throw new ProfileNotFound();
    return m;
  }
  async getMediaInsights(id: string, c: ProviderContext) {
    await this.getMedia(id, c);
    return this.insights(id, c);
  }
  async getAccountInsights(c: ProviderContext) {
    return this.insights(c.accountId!, c, true);
  }
  private async insights(id: string, c: ProviderContext, account = false) {
    if (!c.scopes?.includes('instagram_business_manage_insights')) throw new PermissionMissing();
    const metrics = safeFields(config.META_VERIFIED_INSIGHT_METRICS);
    if (!metrics.length)
      throw new UnsupportedCapability('Insight metrics have not been verified for this Meta app.');
    const result: Record<string, number | null> = {};
    for (const metric of metrics) {
      try {
        const raw = await this.graph(
          `${id}/insights`,
          { metric, ...(account ? { period: 'day' } : {}) },
          c,
        );
        const data = raw.data as
          { total_value?: { value?: number }; values?: { value?: number }[] }[] | undefined;
        const value = data?.[0]?.total_value?.value ?? data?.[0]?.values?.at(-1)?.value;
        result[metric] = typeof value === 'number' ? value : null;
      } catch (e) {
        if (e instanceof UnsupportedCapability) {
          result[metric] = null;
        } else throw e;
      }
    }
    return result;
  }
  async getComments(): Promise<unknown[]> {
    throw new UnsupportedCapability(
      'Comment retrieval requires a separately approved permission and is not enabled.',
    );
  }
  async getMentions(): Promise<unknown[]> {
    throw new UnsupportedCapability();
  }
  async getStoryInsights(): Promise<unknown[]> {
    throw new UnsupportedCapability(
      'Third-party Story retrieval is not supported by the configured official provider. Own Story retrieval has not been verified for this app.',
    );
  }
  async resolveUrl(url: string) {
    return inspectLink(url);
  }
}
