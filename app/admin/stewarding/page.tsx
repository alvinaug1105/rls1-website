import { renderAdminSection } from '../admin-screen';
export { metadata } from '../admin-screen';
export const dynamic = 'force-dynamic';
export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ round?: string }>;
}) {
  return renderAdminSection('stewarding', searchParams);
}
