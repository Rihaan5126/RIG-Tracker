import { endpoints } from './endpoints';
type Schema = Record<string, unknown>;
const nullableNumber = { type: ['number', 'null'] };
const nullableString = { type: ['string', 'null'] };
const source = {
  type: 'string',
  enum: [
    'official',
    'authorized',
    'historical_observation',
    'derived',
    'unavailable',
    'mock',
    'user_supplied',
  ],
};
const profile: Schema = {
  type: 'object',
  required: ['provider', 'instagram_id', 'username', 'source', 'field_sources', 'retrieved_at'],
  properties: {
    provider: { enum: ['mock', 'meta'] },
    instagram_id: { type: 'string' },
    username: { type: 'string' },
    display_name: nullableString,
    biography: nullableString,
    profile_picture_url: nullableString,
    website: nullableString,
    followers_count: nullableNumber,
    following_count: nullableNumber,
    media_count: nullableNumber,
    account_type: nullableString,
    verified: { type: ['boolean', 'null'] },
    source,
    field_sources: { type: 'object', additionalProperties: source },
    retrieved_at: { type: 'string', format: 'date-time' },
  },
};
const schemas: Record<string, Schema> = {
  NormalizedProfile: profile,
  Snapshot: {
    allOf: [
      profile,
      { type: 'object', properties: { id: { type: 'string' }, profile_id: { type: 'string' } } },
    ],
  },
  Media: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      profile_id: { type: 'string' },
      username: { type: 'string' },
      type: { enum: ['IMAGE', 'VIDEO', 'CAROUSEL_ALBUM', 'REEL'] },
      caption: nullableString,
      permalink: nullableString,
      thumbnail_url: nullableString,
      media_url: nullableString,
      timestamp: { type: 'string', format: 'date-time' },
      likes: nullableNumber,
      comments: nullableNumber,
      views: nullableNumber,
      reach: nullableNumber,
      saved: nullableNumber,
      shares: nullableNumber,
      impressions: nullableNumber,
      duration: nullableNumber,
      source,
      field_sources: { type: 'object', additionalProperties: source },
    },
  },
  TrackingEvent: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      profile_id: { type: 'string' },
      snapshot_id: nullableString,
      event_type: { type: 'string' },
      old_value: { type: ['string', 'number', 'boolean', 'null'] },
      new_value: { type: ['string', 'number', 'boolean', 'null'] },
      detected_at: { type: 'string', format: 'date-time' },
      username: { type: 'string' },
      source,
    },
  },
  Error: {
    type: 'object',
    required: ['success', 'error'],
    properties: {
      success: { const: false },
      error: {
        type: 'object',
        required: ['code', 'message', 'request_id'],
        properties: {
          code: { type: 'string' },
          message: { type: 'string' },
          request_id: { type: 'string', format: 'uuid' },
        },
      },
    },
  },
};
const username = { type: 'string', pattern: '^@?[A-Za-z0-9_.]{1,30}$', example: 'rigtracker_demo' };
const requestBodies: Record<string, Schema> = {
  'POST /api/v1/tracked': {
    type: 'object',
    required: ['username'],
    properties: {
      username,
      interval_minutes: { type: 'integer', minimum: 60, maximum: 10080, default: 360 },
      notify: { type: 'boolean', default: true },
      threshold: { type: 'integer', minimum: 1 },
    },
  },
  'PATCH /api/v1/tracked/{id}': {
    type: 'object',
    properties: {
      enabled: { type: 'boolean' },
      interval_minutes: { type: 'integer', minimum: 60, maximum: 10080 },
      notify: { type: 'boolean' },
    },
  },
  'POST /api/v1/link/inspect': {
    type: 'object',
    required: ['url'],
    properties: {
      url: {
        type: 'string',
        maxLength: 2048,
        example: 'https://www.instagram.com/reel/RIGdemo123/?igsh=demo',
      },
    },
  },
  'POST /api/v1/saved': {
    type: 'object',
    required: ['username'],
    properties: {
      username,
      notes: { type: 'string', maxLength: 2000 },
      label: { type: 'string', maxLength: 80 },
      tags: {
        type: 'array',
        maxItems: 6,
        items: { enum: ['Competitor', 'Creator', 'Brand', 'Client', 'Research', 'Other'] },
      },
    },
  },
};
for (const action of ['login', 'register'])
  requestBodies[`POST /api/auth/${action}`] = {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      name: { type: 'string' },
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 12, maxLength: 128, writeOnly: true },
    },
  };
const paths: Record<string, Record<string, unknown>> = {};
for (const [method, path, summary, inputs, result] of endpoints) {
  const name = result.replace('[]', '');
  const dataSchema =
    name in schemas
      ? result.endsWith('[]')
        ? { type: 'array', items: { $ref: `#/components/schemas/${name}` } }
        : { $ref: `#/components/schemas/${name}` }
      : { description: result };
  const parameters: Schema[] = Array.from(path.matchAll(/\{(\w+)\}/g)).map((m) => ({
    name: m[1],
    in: 'path',
    required: true,
    schema: { type: 'string' },
  }));
  if (
    method !== 'GET' &&
    !['/api/auth/login', '/api/auth/register', '/api/auth/demo', '/api/internal/tick'].includes(
      path,
    )
  )
    parameters.push({
      name: 'X-CSRF-Token',
      in: 'header',
      required: true,
      schema: { type: 'string' },
    });
  if (path === '/api/v1/compare')
    parameters.push({
      name: 'accounts',
      in: 'query',
      required: true,
      schema: { type: 'string' },
      example: 'rigtracker_demo,northline_demo',
    });
  const requestBody = requestBodies[`${method} ${path}`];
  const publicPath = [
    '/health',
    '/ready',
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/demo',
  ].includes(path);
  const successSchema =
    path === '/health' || path === '/ready'
      ? { type: 'object' }
      : {
          type: 'object',
          properties: {
            success: { const: true },
            data: dataSchema,
            meta: {
              type: 'object',
              properties: {
                provider: { type: 'string' },
                retrieved_at: { type: 'string', format: 'date-time' },
                cached: { type: 'boolean' },
                request_id: { type: 'string' },
              },
            },
          },
        };
  paths[path] ??= {};
  paths[path][method.toLowerCase()] = {
    summary,
    description: `${inputs}. Response data: ${result}. All mutation requests require the configured Origin.`,
    parameters,
    ...(publicPath
      ? { security: [] }
      : path === '/api/internal/tick'
        ? { security: [{ WorkerToken: [] }] }
        : {}),
    ...(requestBody
      ? {
          requestBody: { required: true, content: { 'application/json': { schema: requestBody } } },
        }
      : {}),
    responses: {
      [method === 'POST' && ['/api/v1/tracked', '/api/v1/saved'].includes(path)
        ? '201'
        : path.endsWith('/callback')
          ? '307'
          : '200']: {
        description: 'Successful operation',
        content: { 'application/json': { schema: successSchema } },
      },
      default: {
        description:
          '400 validation, 401 authentication, 403 CSRF/scope, 404 unavailable, 409 conflict, 413 large body, 422 unsupported, 429 limited (Retry-After), 503 provider unavailable',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
    },
  };
}
export const openapi = {
  openapi: '3.1.0',
  info: {
    title: 'RIGtracker internal API',
    version: '0.1.0',
    description:
      'Workspace-scoped sessions and explicit data origins. See /developers for runnable examples.',
  },
  servers: [{ url: '/' }],
  security: [{ SessionCookie: [] }],
  paths,
  components: {
    securitySchemes: {
      SessionCookie: { type: 'apiKey', in: 'cookie', name: 'rig_session' },
      WorkerToken: { type: 'http', scheme: 'bearer' },
    },
    schemas,
  },
};
