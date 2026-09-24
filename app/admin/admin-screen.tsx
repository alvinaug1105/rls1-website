import { headers } from 'next/headers';
import { authenticated } from '@/lib/organiser-auth';
import { AdminLogin, AdminPortal } from './portal';
import { schedule } from '../season';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'RLS1 Admin Portal',
  robots: { index: false, follow: false },
  alternates: { canonical: '/admin' },
};
export async function renderAdminSection(
  section: string,
  searchParams: Promise<{ round?: string; error?: string; expired?: string }>,
) {
  const params = await searchParams;
  if (!(await authenticated(await headers())))
    return (
      <AdminLogin
        notice={
          params.error === '1'
            ? 'error'
            : params.expired === '1'
              ? 'expired'
              : undefined
        }
      />
    );
  const selected = Number(params.round);
  return (
    <AdminPortal
      section={section}
      initialRound={
        Number.isInteger(selected) && selected >= 1 && selected <= schedule.length
          ? selected
          : undefined
      }
    />
  );
}
