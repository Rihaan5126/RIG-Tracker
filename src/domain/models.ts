export type Source =
  | 'official'
  | 'authorized'
  | 'historical_observation'
  | 'derived'
  | 'unavailable'
  | 'mock'
  | 'user_supplied';
export type FieldSources = Record<string, Source>;
export interface NormalizedProfile {
  provider: 'mock' | 'meta';
  instagram_id: string;
  username: string;
  display_name: string | null;
  biography: string | null;
  profile_picture_url: string | null;
  website: string | null;
  followers_count: number | null;
  following_count: number | null;
  media_count: number | null;
  account_type: string | null;
  verified: boolean | null;
  source: Source;
  field_sources: FieldSources;
  retrieved_at: string;
}
export interface Snapshot extends NormalizedProfile {
  id: string;
  profile_id: string;
}
export interface Profile extends NormalizedProfile {
  id: string;
  color: string;
}
export type MediaType = 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM' | 'REEL';
export interface Media {
  id: string;
  profile_id: string;
  username: string;
  type: MediaType;
  caption: string | null;
  permalink: string | null;
  thumbnail_url: string | null;
  media_url: string | null;
  timestamp: string;
  likes: number | null;
  comments: number | null;
  views: number | null;
  reach: number | null;
  saved: number | null;
  shares: number | null;
  impressions: number | null;
  duration: number | null;
  source: Source;
  field_sources: FieldSources;
}
export interface TrackingEvent {
  id: string;
  profile_id: string;
  snapshot_id: string | null;
  event_type: string;
  old_value: string | number | boolean | null;
  new_value: string | number | boolean | null;
  detected_at: string;
  username: string;
  source: Source;
}
export interface TrackedProfile {
  id: string;
  profile_id: string;
  interval_minutes: number;
  enabled: boolean;
  notify: boolean;
  next_run_at: string;
  last_checked_at: string | null;
  failures: number;
  last_error: string | null;
  profile: Profile;
}
export interface SavedProfile {
  id: string;
  profile: Profile;
  notes: string;
  tags: string[];
  label: string;
  created_at: string;
}
export interface Notification {
  id: string;
  title: string;
  body: string;
  username: string | null;
  event_type: string;
  read_at: string | null;
  created_at: string;
}
export interface Connection {
  id: string;
  provider_account_id: string;
  username: string;
  scopes: string[];
  expires_at: string;
}
export interface User {
  id: string;
  name: string;
  email: string | null;
  is_demo: boolean;
}
export interface WorkspaceData {
  user: User;
  profiles: Profile[];
  snapshots: Snapshot[];
  events: TrackingEvent[];
  media: Media[];
  tracked: TrackedProfile[];
  saved: SavedProfile[];
  notifications: Notification[];
  connections: Connection[];
  provider: 'mock' | 'meta';
  meta_configured: boolean;
  storage: string;
  worker_last_seen: string | null;
}
export type ApiResponse<T> =
  | {
      success: true;
      data: T;
      meta: { provider: string; retrieved_at: string; cached: boolean; request_id: string };
    }
  | { success: false; error: { code: string; message: string; request_id: string } };
export const PROFILE_FIELDS = [
  'username',
  'display_name',
  'biography',
  'profile_picture_url',
  'website',
  'followers_count',
  'following_count',
  'media_count',
  'account_type',
  'verified',
] as const;
export const TAGS = ['Competitor', 'Creator', 'Brand', 'Client', 'Research', 'Other'] as const;
