import { requireUser } from '@/lib/auth';
import { DashboardSidebar } from '@/components/dashboard/sidebar';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, dealership } = await requireUser();

  return (
    <div className="min-h-screen">
      <DashboardSidebar
        dealership={{
          name: dealership.name,
          logoUrl: dealership.logoUrl,
          brandColor: dealership.brandColor,
        }}
        user={{
          fullName: profile.fullName,
          role: profile.role,
        }}
      />
      <main className="lg:pl-64">{children}</main>
    </div>
  );
}
