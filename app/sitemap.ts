import type { MetadataRoute } from 'next';
import { schedule } from './season';
import { SITE_URL, roundPath, views } from './site';
// Public, spectator-facing pages only. Admin and API routes are never listed.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...views.map((v) => ({
      url: `${SITE_URL}${v.path}`,
      changeFrequency: 'weekly' as const,
      priority: v.path === '/' ? 1 : 0.7,
    })),
    ...schedule.map((e) => ({
      url: `${SITE_URL}${roundPath(e.round)}`,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
  ];
}
