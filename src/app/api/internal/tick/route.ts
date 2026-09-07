import { NextRequest } from 'next/server';
import { config } from '@/server/config';
import { constantEqual } from '@/server/crypto';
import { handled, ok } from '@/server/http';
import { AppError } from '@/providers/instagram/exceptions';
import { tick } from '@/services/scheduler';
import { limit } from '@/server/cache';
export const runtime = 'nodejs';
export async function POST(req: NextRequest) {
  return handled(req, async (id) => {
    if (
      !config.WORKER_SECRET ||
      config.WORKER_SECRET.length < 32 ||
      !constantEqual(req.headers.get('authorization') ?? '', `Bearer ${config.WORKER_SECRET}`)
    )
      throw new AppError('UNAUTHORIZED', 'Worker authentication required.', 401);
    await limit('worker-tick', 2, 60);
    return ok(await tick(), id);
  });
}
