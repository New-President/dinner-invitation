import { DinnerInviteWizard } from '@/components/DinnerInviteWizard';
import { loadCatalog } from '@/lib/catalog-store';

// Restaurants can change from /admin at any time, so render on every request.
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const restaurants = await loadCatalog();
  return <DinnerInviteWizard restaurants={restaurants} />;
}
