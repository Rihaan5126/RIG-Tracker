import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AppError } from '@/providers/instagram/exceptions';
import { config } from './config';
export async function body(req: NextRequest) {
  if (Number(req.headers.get('content-length') ?? 0) > 32768)
    throw new AppError('PAYLOAD_TOO_LARGE', 'Request body is too large.', 413);
  const reader = req.body?.getReader();
  if (!reader) throw new AppError('INVALID_JSON', 'Expected a JSON request body.');
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > 32768) {
      await reader.cancel();
      throw new AppError('PAYLOAD_TOO_LARGE', 'Request body is too large.', 413);
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new AppError('INVALID_JSON', 'Expected a JSON request body.');
  }
}
export function ok(data: unknown, id: string, status = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
      meta: {
        provider: config.INSTAGRAM_PROVIDER,
        retrieved_at: new Date().toISOString(),
        cached: false,
        request_id: id,
      },
    },
    { status, headers: { 'X-Request-ID': id, 'Cache-Control': 'private, no-store' } },
  );
}
export function failure(error: unknown, id: string) {
  const e =
    error instanceof AppError
      ? error
      : error instanceof ZodError
        ? new AppError(
            'VALIDATION_ERROR',
            error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
          )
        : new AppError(
            'INTERNAL_ERROR',
            'The request could not be completed. Please try again.',
            500,
          );
  return NextResponse.json(
    { success: false, error: { code: e.code, message: e.message, request_id: id } },
    {
      status: e.status,
      headers: {
        'X-Request-ID': id,
        'Cache-Control': 'no-store',
        ...(e.retryAfter ? { 'Retry-After': String(e.retryAfter) } : {}),
      },
    },
  );
}
export async function handled(req: NextRequest, fn: (id: string) => Promise<NextResponse>) {
  const id = randomUUID(),
    start = performance.now();
  let response: NextResponse;
  try {
    response = await fn(id);
  } catch (error) {
    response = failure(error, id);
  }
  console.info(
    JSON.stringify({
      request_id: id,
      route: req.nextUrl.pathname.startsWith('/api/auth/instagram/callback')
        ? '/api/auth/instagram/callback'
        : req.nextUrl.pathname,
      method: req.method,
      status: response.status,
      duration_ms: Math.round(performance.now() - start),
      provider: config.INSTAGRAM_PROVIDER,
      cache: 'no-store',
    }),
  );
  return response;
}
