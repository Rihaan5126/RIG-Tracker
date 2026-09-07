import { query } from '@/server/db';
import { cacheSet, cacheGet } from '@/server/cache';
export const runtime = 'nodejs';
export async function GET() {
  try {
    await query('SELECT 1');
    await cacheSet('ready', true, 30);
    if (!(await cacheGet('ready'))) throw new Error('Cache unavailable');
    return Response.json(
      { status: 'ready', database: 'ok', cache: 'ok' },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return Response.json(
      { status: 'not_ready' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
