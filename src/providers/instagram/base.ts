import type { Media, NormalizedProfile } from '@/domain/models';
export interface ProviderContext {
  userId: string;
  accountId?: string;
  username?: string;
  accessToken?: string;
  scopes?: string[];
  expiresAt?: string;
}
export interface InstagramProvider {
  readonly name: 'mock' | 'meta';
  getProfile(username: string, context: ProviderContext): Promise<NormalizedProfile>;
  getProfileMedia(profileId: string, context: ProviderContext): Promise<Media[]>;
  getMedia(id: string, context: ProviderContext): Promise<Media>;
  getMediaInsights(id: string, context: ProviderContext): Promise<Record<string, number | null>>;
  getAccountInsights(context: ProviderContext): Promise<Record<string, number | null>>;
  getComments(id: string, context: ProviderContext): Promise<unknown[]>;
  getMentions(context: ProviderContext): Promise<unknown[]>;
  getStoryInsights(context: ProviderContext): Promise<unknown[]>;
  resolveUrl(url: string): Promise<unknown>;
}
