import type { MetadataRoute } from 'next';
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/admin'] },
    sitemap: 'https://rls-website.alvin1105alvin.workers.dev/sitemap.xml',
  };
}
