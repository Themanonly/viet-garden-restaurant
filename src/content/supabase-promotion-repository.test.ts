import assert from 'node:assert/strict';
import test from 'node:test';
import type { Promotion } from './promotion';
import { SupabasePromotionRepository } from './supabase-promotion-repository';
import type { SupabaseDatabaseClient } from './supabase-database';
class FakeDb implements SupabaseDatabaseClient { rows: Promotion[] = []; async select<T>(): Promise<T[]> { return this.rows as T[]; } async insert<T>(_table: string, rows: unknown[]): Promise<T[]> { this.rows = rows as Promotion[]; return rows as T[]; } async upsert<T>(): Promise<T[]> { return []; } async update<T>(): Promise<T[]> { return []; } async remove<T>(): Promise<T[]> { this.rows = []; return []; } async rpc<T>(): Promise<T> { throw new Error('unused'); } }
test('Supabase promotion repository maps generic promotion records', async () => { const database = new FakeDb(); const repository = new SupabasePromotionRepository(database); const promotion = { id: 'promotion-1', title: { fr: 'FR', en: 'EN', ar: 'AR' }, description: { fr: 'FR', en: 'EN', ar: 'AR' }, type: 'percentage' as const, target: { itemIds: ['soupes-pho'] }, rule: { percentage: 20 }, enabled: true, sortOrder: 0 }; await repository.replacePromotions([promotion]); assert.deepEqual(await repository.getPromotions(), [promotion]); });
