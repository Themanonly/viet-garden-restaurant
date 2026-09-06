import type { MenuDocument } from './menu';
import { createPersistentMenuRepository, type FileMenuPersistenceRepository } from './menu-persistence-repository';
import { getApplicationDataProvider } from './application-provider';
import { createSupabaseMenuRepository } from './supabase-menu-repository';

export interface MenuRepository {
  getMenu(): Promise<MenuDocument>;
}

export class LocalMenuRepository implements MenuRepository {
  private readonly persistence: FileMenuPersistenceRepository;

  constructor(filePath?: string) {
    this.persistence = createPersistentMenuRepository(filePath);
  }

  async getMenu(): Promise<MenuDocument> {
    return this.persistence.getMenu();
  }
}

export function createMenuRepository(filePath?: string): MenuRepository {
  if (getApplicationDataProvider() === 'supabase') return createSupabaseMenuRepository();
  return new LocalMenuRepository(filePath);
}
