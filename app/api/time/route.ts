import { json } from '@/lib/http';
export const dynamic = 'force-dynamic';
// Trusted league time: absolute UTC milliseconds only, never cached.
export function GET() {
  return json({ now: Date.now() });
}
