import { randomUUID } from 'node:crypto';
import { query, database } from '@/server/db';
import { refreshProfile } from './tracking';
import { AppError } from '@/providers/instagram/exceptions';
interface Job {
  id: string;
  user_id: string;
  profile_id: string;
  interval_minutes: number;
  failures: number;
  notify: boolean;
  username: string;
}
export function retryDelay(failures: number, retryAfter = 0) {
  return Math.max(retryAfter, Math.min(86400, 60 * 2 ** Math.min(failures, 10)));
}
export async function tick() {
  await query(
    "INSERT INTO system_status(key,value) VALUES('worker_last_seen',$1) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=now()",
    [new Date().toISOString()],
  );
  // A short lease permits recovery after worker crashes. SKIP LOCKED prevents duplicate claims.
  const jobs = await (
    await database()
  ).transaction(async (tx) => {
    const due = await tx.query<Job>(
      `SELECT t.*,p.username FROM tracked_profiles t JOIN instagram_profiles p ON p.id=t.profile_id WHERE t.enabled=true AND t.next_run_at<=now() AND (t.lease_until IS NULL OR t.lease_until<now()) ORDER BY t.next_run_at LIMIT 4 FOR UPDATE OF t SKIP LOCKED`,
    );
    for (const job of due)
      await tx.query(
        "UPDATE tracked_profiles SET lease_until=now()+interval '10 minutes' WHERE id=$1",
        [job.id],
      );
    return due;
  });
  for (const job of jobs) {
    try {
      await refreshProfile(job.user_id, job.username);
      await query(
        "UPDATE tracked_profiles SET next_run_at=now()+($2 * interval '1 minute'),lease_until=NULL WHERE id=$1",
        [job.id, job.interval_minutes],
      );
    } catch (error) {
      const e =
        error instanceof AppError
          ? error
          : new AppError('PROVIDER_UNAVAILABLE', 'Provider could not be reached.', 503);
      const failures = job.failures + 1;
      const expired = ['TOKEN_EXPIRED', 'PERMISSION_MISSING'].includes(e.code);
      await query(
        'UPDATE tracked_profiles SET failures=$2,last_error=$3,next_run_at=$4,enabled=$5,lease_until=NULL WHERE id=$1',
        [
          job.id,
          failures,
          e.code,
          new Date(Date.now() + retryDelay(failures, e.retryAfter) * 1000),
          !expired,
        ],
      );
      if (job.notify && (failures === 3 || (expired && failures === 1)))
        await query(
          'INSERT INTO notifications(id,user_id,title,body,username,event_type) VALUES($1,$2,$3,$4,$5,$6)',
          [
            randomUUID(),
            job.user_id,
            expired ? 'Instagram connection needs attention' : 'Tracking failed repeatedly',
            expired
              ? 'Reconnect Instagram in Settings to resume tracking.'
              : 'Tracking will retry with exponential backoff. Your historical observations remain available.',
            job.username,
            'tracking_failed',
          ],
        );
    }
  }
  const expiring = await query<{ id: string; user_id: string; username: string }>(
    "SELECT id,user_id,username FROM oauth_connections WHERE expires_at < now() + interval '3 days'",
  );
  for (const c of expiring) {
    const exists = await query(
      "SELECT id FROM notifications WHERE user_id=$1 AND username=$2 AND event_type='token_expiring' AND created_at>now()-interval '1 day'",
      [c.user_id, c.username],
    );
    if (!exists.length)
      await query(
        'INSERT INTO notifications(id,user_id,title,body,username,event_type) VALUES($1,$2,$3,$4,$5,$6)',
        [
          randomUUID(),
          c.user_id,
          'Instagram token expiring',
          'Reconnect in Settings before this connection expires. No secret is included in this notification.',
          c.username,
          'token_expiring',
        ],
      );
  }
  await query('DELETE FROM oauth_states WHERE expires_at<now()');
  await query('DELETE FROM sessions WHERE expires_at<now()');
  await query("DELETE FROM provider_requests WHERE created_at<now()-interval '30 days'");
  await query("DELETE FROM users WHERE is_demo=true AND created_at<now()-interval '7 days'");
  return { processed: jobs.length };
}
