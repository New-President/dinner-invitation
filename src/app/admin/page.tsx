import type { Metadata } from 'next';
import { AdminPanel } from '@/components/admin/AdminPanel';
import { describeStore, loadCatalog } from '@/lib/catalog-store';
import { serpApiKey } from '@/lib/serpapi';

// Not linked from the site; reached only by typing /admin.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Restaurant Admin',
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  return (
    <AdminPanel
      initialCatalog={await loadCatalog()}
      store={describeStore()}
      placesReady={Boolean(serpApiKey())}
    />
  );
}
