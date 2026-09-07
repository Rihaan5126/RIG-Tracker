import { randomUUID } from 'node:crypto';
import type { TrackingEvent } from '@/domain/models';
import type { SQL } from '@/server/db';
export interface DeliveryMessage {
  event: string;
  username: string;
  oldValue: unknown;
  newValue: unknown;
  timestamp: string;
  profileUrl: string;
}
export interface NotificationDelivery {
  send(message: DeliveryMessage): Promise<void>;
}
export function discordPayload(m: DeliveryMessage) {
  return {
    username: 'RIGtracker',
    allowed_mentions: { parse: [] },
    embeds: [
      {
        title: m.event.slice(0, 200),
        description: `@${m.username}`,
        fields: [
          { name: 'Old value', value: String(m.oldValue ?? 'Unavailable').slice(0, 1000) },
          { name: 'New value', value: String(m.newValue ?? 'Unavailable').slice(0, 1000) },
        ],
        timestamp: m.timestamp,
        url: m.profileUrl,
      },
    ],
  };
}
export function shouldNotify(
  event: Pick<TrackingEvent, 'event_type' | 'old_value' | 'new_value'>,
  threshold?: number,
) {
  if (event.event_type === 'followers_count' && threshold !== undefined)
    return (
      typeof event.old_value === 'number' &&
      typeof event.new_value === 'number' &&
      event.old_value < threshold &&
      event.new_value >= threshold
    );
  return [
    'username',
    'display_name',
    'biography',
    'website',
    'profile_picture_url',
    'new_media',
    'growth_spike',
    'tracking_failed',
    'token_expiring',
  ].includes(event.event_type);
}
export async function notifyEvent(tx: SQL, userId: string, event: TrackingEvent) {
  const rule = await tx.query<{ threshold: number }>(
    'SELECT threshold FROM notification_rules WHERE user_id=$1 AND (profile_id=$2 OR profile_id IS NULL) AND event_type=$3 AND enabled=true',
    [userId, event.profile_id, event.event_type],
  );
  if (!shouldNotify(event, rule[0]?.threshold)) return;
  const title =
    event.event_type === 'growth_spike'
      ? 'Unusual follower growth detected'
      : event.event_type === 'followers_count'
        ? 'Follower threshold crossed'
        : `${event.event_type.replaceAll('_', ' ')}${['new_media', 'tracking_failed', 'token_expiring'].includes(event.event_type) ? '' : ' changed'}`;
  await tx.query(
    'INSERT INTO notifications(id,user_id,event_id,title,body,username,event_type,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(user_id,event_id) DO NOTHING',
    [
      randomUUID(),
      userId,
      event.id,
      title,
      `@${event.username}: ${String(event.old_value ?? 'Unavailable').slice(0, 180)} → ${String(event.new_value ?? 'Unavailable').slice(0, 180)}`,
      event.username,
      event.event_type,
      event.detected_at,
    ],
  );
}
