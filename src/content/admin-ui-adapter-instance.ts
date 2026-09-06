import { createAdminMenuService } from './admin-menu-service';
import { AdminMenuUiAdapter } from './admin-menu-ui-adapter';
import { createMediaRepository } from './media-repository';
import { createBrandSettingsRepository } from './brand-settings';
import { createPersistentMenuRepository } from './menu-persistence-repository';
import { getApplicationDataProvider } from './application-provider';
import { createSupabaseAdminMenuService } from './supabase-admin-repository';

const adminMenuUiAdapter = new AdminMenuUiAdapter(getApplicationDataProvider() === 'supabase'
  ? createSupabaseAdminMenuService()
  : createAdminMenuService(createPersistentMenuRepository(), createMediaRepository(), createBrandSettingsRepository()));

export function getAdminMenuUiAdapter(): AdminMenuUiAdapter {
  return adminMenuUiAdapter;
}