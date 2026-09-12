import type { Promotion } from './promotion';
import type { PromotionRepository } from './promotion-repository';
import { createSupabaseDatabaseClient, type SupabaseDatabaseClient } from './supabase-database';

export class SupabasePromotionRepository implements PromotionRepository {
  constructor(private readonly database: SupabaseDatabaseClient = createSupabaseDatabaseClient()) {}
  async getPromotions(): Promise<Promotion[]> { return this.database.select<Promotion>('promotions', 'select=*&order=sort_order.asc').then((rows) => rows.map((row) => { const { sort_order: _sortOrder, ...promotion } = row as Promotion & { sort_order?: number }; return { ...promotion, sortOrder: _sortOrder ?? promotion.sortOrder }; })); }
  async replacePromotions(promotions: Promotion[]): Promise<void> { await this.database.remove<unknown>('promotions', 'id=not.is.null'); if (promotions.length) await this.database.insert('promotions', promotions.map((promotion) => ({ ...promotion, sort_order: promotion.sortOrder }))); }
}
export function createSupabasePromotionRepository(database?: SupabaseDatabaseClient): SupabasePromotionRepository { return new SupabasePromotionRepository(database); }
