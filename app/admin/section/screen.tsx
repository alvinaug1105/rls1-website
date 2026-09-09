import { headers } from 'next/headers';
import { authenticated } from '@/lib/organiser-auth';
import { AdminLogin, AdminPortal } from '../portal';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'RLS1 Admin Portal',
  robots: { index: false, follow: false },
  alternates: { canonical: '/admin' },
};
export async function renderAdminSection(
  section: string,
  searchParams: Promise<{ round?: string }>,
) {
  if (!(await authenticated(await headers()))) return <AdminLogin />;
  const selected = Number((await searchParams).round);
  return (
    <AdminPortal
      section={section}
      initialRound={
        Number.isInteger(selected) && selected >= 1 && selected <= 24
          ? selected
          : undefined
      }
    />
  );
}
