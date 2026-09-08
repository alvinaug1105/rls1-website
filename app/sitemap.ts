import type { MetadataRoute } from 'next';
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://rls-website.alvin1105alvin.workers.dev/',
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];
}
