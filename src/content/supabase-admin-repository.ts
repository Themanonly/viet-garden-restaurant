import { AdminMenuService } from './admin-menu-service';
import { createBrandSettingsRepository } from './brand-settings';
import { createMenuMutationService } from './menu-mutations';
import type { MediaStorage } from './media-storage';
import { createSupabaseDatabaseClient, type SupabaseDatabaseClient } from './supabase-database';
import { createSupabaseMediaRepository } from './supabase-media-repository';
import { createSupabaseMenuRepository } from './supabase-menu-repository';

export function createSupabaseAdminMenuService(database?: SupabaseDatabaseClient, storage?: MediaStorage): AdminMenuService {
  const selectedDatabase = database ?? createSupabaseDatabaseClient();
  const menuRepository = createSupabaseMenuRepository(selectedDatabase);
  const mediaRepository = createSupabaseMediaRepository(selectedDatabase, storage);
  return new AdminMenuService(createMenuMutationService(menuRepository, mediaRepository), mediaRepository, createBrandSettingsRepository());
}
