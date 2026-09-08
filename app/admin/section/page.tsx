import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { authenticated } from '@/lib/organiser-auth';
import { AdminLogin, AdminPortal } from '../portal';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'RLS1 Admin Portal',
  robots: { index: false, follow: false },
  alternates: { canonical: '/admin' },
};
const routes = [
  'dashboard',
  'events',
  'qualifying',
  'results',
  'stewarding',
  'standings',
  'drivers',
  'submissions',
  'publishing',
];
export default async function AdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ section?: string[] }>;
  searchParams: Promise<{ round?: string }>;
}) {
  const { section = [] } = await params;
  if (section.length > 1 || !routes.includes(section[0] || 'dashboard'))
    notFound();
  if (!(await authenticated(await headers()))) return <AdminLogin />;
  const selected = Number((await searchParams).round);
  return (
    <AdminPortal
      section={section[0] || 'dashboard'}
      initialRound={
        Number.isInteger(selected) && selected >= 1 && selected <= 24
          ? selected
          : undefined
      }
    />
  );
}
