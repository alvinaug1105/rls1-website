import type { NextConfig } from 'next';
const security = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'" },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  // Browsers only honour HSTS over HTTPS; no includeSubDomains/preload
  // because sibling workers.dev subdomains are outside this site.
  { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
];
const nextConfig: NextConfig = {
  async headers() {
    return [
      // vinext's '/:path*' matcher does not match the bare root, so '/' is
      // listed explicitly; without it the homepage had no framing protection.
      { source: '/', headers: security },
      { source: '/:path*', headers: security },
      { source: '/admin/:path*', headers: [{ key: 'Cache-Control', value: 'private, no-store, max-age=0' }] },
      { source: '/admin', headers: [{ key: 'Cache-Control', value: 'private, no-store, max-age=0' }] },
      { source: '/api/:path*', headers: [{ key: 'Cache-Control', value: 'no-store, max-age=0' }] },
    ];
  },
};
export default nextConfig;
