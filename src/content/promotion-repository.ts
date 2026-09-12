import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { menuDocument } from './menu';
import type { Promotion } from './promotion';
import { createSupabasePromotionRepository } from './supabase-promotion-repository';
import { getApplicationDataProvider } from './application-provider';

export interface PromotionRepository { getPromotions(): Promise<Promotion[]>; replacePromotions(promotions: Promotion[]): Promise<void>; }
export class PromotionPersistenceError extends Error { constructor(public readonly code: 'read-failed' | 'write-failed' | 'invalid-persisted-promotions', message: string) { super(message); this.name = 'PromotionPersistenceError'; } }
const defaultPath = process.env.VIET_GARDEN_PROMOTIONS_STATE_PATH ?? path.join(process.env.LOCALAPPDATA ?? process.env.XDG_DATA_HOME ?? process.cwd(), 'Viet Garden Restaurant & Coffee', 'promotions.json');
function clone<T>(value: T): T { return structuredClone(value); }
function validate(promotions: Promotion[], source: string): Promotion[] {
  const errors: string[] = []; const ids = new Set<string>(); const orders = new Set<number>();
  for (const promotion of promotions) {
    if (!promotion.id?.trim()) errors.push('Promotions require an id.');
    if (ids.has(promotion.id)) errors.push(`Duplicate promotion id: ${promotion.id}.`); ids.add(promotion.id);
    if (!promotion.title?.fr || !promotion.title.en || !promotion.title.ar) errors.push(`Promotion titles require FR, EN, and AR values: ${promotion.id}.`);
    if (!Number.isInteger(promotion.sortOrder) || promotion.sortOrder < 0 || orders.has(promotion.sortOrder)) errors.push(`Invalid promotion ordering: ${promotion.id}.`); orders.add(promotion.sortOrder);
    if (promotion.startsAt && Number.isNaN(Date.parse(promotion.startsAt))) errors.push(`Invalid promotion start date: ${promotion.id}.`);
    if (promotion.endsAt && Number.isNaN(Date.parse(promotion.endsAt))) errors.push(`Invalid promotion end date: ${promotion.id}.`);
    if (promotion.startsAt && promotion.endsAt && new Date(promotion.startsAt) > new Date(promotion.endsAt)) errors.push(`Promotion start must be before its end: ${promotion.id}.`);
  }
  if (errors.length) throw new PromotionPersistenceError('invalid-persisted-promotions', `Invalid ${source} promotions: ${errors.join(' ')}`);
  return clone(promotions);
}
export class FilePromotionRepository implements PromotionRepository {
  constructor(private readonly filePath: string = defaultPath) {}
  async getPromotions(): Promise<Promotion[]> { try { return validate(JSON.parse(await readFile(this.filePath, 'utf8')) as Promotion[], 'persisted'); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') { if (error instanceof PromotionPersistenceError) throw error; throw new PromotionPersistenceError('read-failed', `Promotions could not be read from ${this.filePath}.`); } await this.replacePromotions([]); return []; } }
  async replacePromotions(promotions: Promotion[]): Promise<void> { const next = validate(promotions, 'replacement'); const temp = `${this.filePath}.${process.pid}.${Date.now()}.tmp`; const backup = `${this.filePath}.${process.pid}.${Date.now()}.bak`; let moved = false; try { await mkdir(path.dirname(this.filePath), { recursive: true }); await writeFile(temp, JSON.stringify(next, null, 2), 'utf8'); try { await rename(this.filePath, backup); moved = true; } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; } await rename(temp, this.filePath); if (moved) await unlink(backup); } catch { await unlink(temp).catch(() => undefined); if (moved) { await unlink(this.filePath).catch(() => undefined); await rename(backup, this.filePath).catch(() => undefined); } throw new PromotionPersistenceError('write-failed', `Promotions could not be persisted to ${this.filePath}.`); } }
}
export function createPromotionRepository(): PromotionRepository { return getApplicationDataProvider() === 'supabase' ? createSupabasePromotionRepository() : new FilePromotionRepository(); }
export function getPromotionMenuSeed() { return clone(menuDocument); }
