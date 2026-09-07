import type { InstagramProvider } from './base';
import { fixtures } from './fixtures';
import { ProfileNotFound, UnsupportedCapability } from './exceptions';
import { inspectLink } from '@/services/links';
export class MockProvider implements InstagramProvider {
  readonly name = 'mock' as const;
  async getProfile(username: string) {
    const p = fixtures().profiles.find(
      (p) => p.username === username || p.instagram_id === username,
    );
    if (!p) throw new ProfileNotFound();
    return p;
  }
  async getProfileMedia(profileId: string) {
    return fixtures().media.filter((m) => m.profile_id === profileId);
  }
  async getMedia(id: string) {
    const m = fixtures().media.find((m) => m.id === id);
    if (!m) throw new ProfileNotFound();
    return m;
  }
  async getMediaInsights(id: string) {
    const m = await this.getMedia(id);
    return { views: m.views, reach: m.reach, saved: m.saved, shares: m.shares };
  }
  async getAccountInsights() {
    return { reach: 382940, views: 648521 };
  }
  async getComments(): Promise<unknown[]> {
    throw new UnsupportedCapability('Comment retrieval is not enabled in this read-only provider.');
  }
  async getMentions(): Promise<unknown[]> {
    throw new UnsupportedCapability();
  }
  async getStoryInsights(): Promise<unknown[]> {
    throw new UnsupportedCapability(
      'Third-party Story retrieval is not supported by the configured official provider. Own Story analytics is not enabled.',
    );
  }
  async resolveUrl(url: string) {
    return inspectLink(url);
  }
}
