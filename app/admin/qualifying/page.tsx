import { renderAdminSection } from '../section/screen';
export { metadata } from '../section/screen';
export const dynamic = 'force-dynamic';
export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ round?: string }>;
}) {
  return renderAdminSection('qualifying', searchParams);
}
