import { z } from 'zod';
const schema = z.object({
  INSTAGRAM_PROVIDER: z.enum(['mock', 'meta']).default('mock'),
  APP_URL: z.url().default('http://127.0.0.1:3000'),
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  PGLITE_PATH: z.string().default('.data/postgres'),
  TOKEN_ENCRYPTION_KEY: z.string().optional(),
  WORKER_SECRET: z.string().optional(),
  META_APP_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  META_REDIRECT_URI: z.string().optional(),
  META_AUTHORIZATION_URL: z.string().optional(),
  META_TOKEN_URL: z.string().optional(),
  META_API_VERSION: z.string().optional(),
  META_VERIFIED_PROFILE_FIELDS: z.string().default(''),
  META_VERIFIED_MEDIA_FIELDS: z.string().default(''),
  META_VERIFIED_INSIGHT_METRICS: z.string().default(''),
  META_SCOPES: z.string().default('instagram_business_basic,instagram_business_manage_insights'),
  ALLOW_DEMO: z.enum(['true', 'false']).default('true'),
  ALLOW_REGISTRATION: z.enum(['true', 'false']).default('true'),
  TRUST_PROXY: z.enum(['true', 'false']).default('false'),
});
export const config = schema.parse(process.env);
export const production = process.env.NODE_ENV === 'production';
export const secureCookies = new URL(config.APP_URL).protocol === 'https:';
export function metaConfigured() {
  return Boolean(
    config.META_APP_ID &&
    config.META_APP_SECRET &&
    config.META_REDIRECT_URI &&
    config.META_AUTHORIZATION_URL &&
    config.META_TOKEN_URL &&
    /^v\d+\.\d+$/.test(config.META_API_VERSION ?? '') &&
    /^[a-f0-9]{64}$/i.test(config.TOKEN_ENCRYPTION_KEY ?? ''),
  );
}
export function productionCheck() {
  if (production && (!config.DATABASE_URL || !config.REDIS_URL))
    throw new Error('Production requires PostgreSQL and Redis.');
  if (production && !secureCookies && process.env.ALLOW_INSECURE_LOCAL_DOCKER !== 'true')
    throw new Error('Production requires an HTTPS APP_URL.');
  if (config.INSTAGRAM_PROVIDER === 'meta' && !metaConfigured())
    throw new Error('Meta mode requires verified OAuth, API version and encryption configuration.');
}
