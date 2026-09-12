import { AdminApplicationError, type AdminErrorInfo } from './admin-menu-service';
import type { MenuDocument } from './menu';
import { isPromotionActive, type Promotion, type PromotionRule, type PromotionTarget, type PromotionType } from './promotion';
import type { PromotionRepository } from './promotion-repository';

export type AdminPromotionDto = Promotion;
export type AdminPromotionCreateInput = Omit<Promotion, 'id'> & { id?: string };
export type AdminPromotionUpdateInput = Partial<Omit<Promotion, 'id'>>;
function clone<T>(value: T): T { return structuredClone(value); }
function fail(message: string, field?: string): AdminApplicationError { const info: AdminErrorInfo = { code: 'invalid-promotion', message, resource: 'promotion', ...(field ? { fields: [{ code: 'invalid-promotion', message, path: field }] } : {}) }; return new AdminApplicationError(info); }

export class PromotionService {
  constructor(private readonly repository: PromotionRepository, private readonly menu: () => Promise<MenuDocument>) {}
  async listPromotions(): Promise<Promotion[]> { return (await this.repository.getPromotions()).sort((a, b) => a.sortOrder - b.sortOrder); }
  async listActivePromotions(now = new Date()): Promise<Promotion[]> { return (await this.listPromotions()).filter((promotion) => isPromotionActive(promotion, now)); }
  async createPromotion(input: AdminPromotionCreateInput): Promise<Promotion> { const promotions = await this.repository.getPromotions(); const requestedOrder = input.sortOrder ?? promotions.length; const sortOrder = promotions.some((promotion) => promotion.sortOrder === requestedOrder) ? promotions.length : requestedOrder; const promotion = { ...clone(input), id: input.id?.trim() || `promotion-${crypto.randomUUID()}`, sortOrder }; this.validate(promotion, await this.menu()); promotions.push(promotion); await this.repository.replacePromotions(promotions); return clone(promotion); }
  async updatePromotion(id: string, input: AdminPromotionUpdateInput): Promise<Promotion> { const promotions = await this.repository.getPromotions(); const index = promotions.findIndex((promotion) => promotion.id === id); if (index < 0) throw fail(`Promotion not found: ${id}.`, 'id'); const updated = { ...promotions[index], ...clone(input), id }; this.validate(updated, await this.menu()); promotions[index] = updated; await this.repository.replacePromotions(promotions); return clone(updated); }
  async deletePromotion(id: string): Promise<void> { const promotions = await this.repository.getPromotions(); const next = promotions.filter((promotion) => promotion.id !== id); if (next.length === promotions.length) throw fail(`Promotion not found: ${id}.`, 'id'); await this.repository.replacePromotions(next); }
  async reorderPromotions(ids: string[]): Promise<Promotion[]> { const promotions = await this.repository.getPromotions(); if (ids.length !== promotions.length || new Set(ids).size !== ids.length || ids.some((id) => !promotions.some((promotion) => promotion.id === id))) throw fail('Promotion ordering must include each promotion exactly once.', 'sortOrder'); const byId = new Map(promotions.map((promotion) => [promotion.id, promotion])); await this.repository.replacePromotions(ids.map((id, sortOrder) => ({ ...byId.get(id) as Promotion, sortOrder }))); return this.listPromotions(); }
  private validate(promotion: Promotion, menu: MenuDocument): void {
    if (!['percentage', 'fixed-amount', 'buy-x-get-y-free', 'buy-x-get-y-discount', 'bundle-fixed-price'].includes(promotion.type)) throw fail('Choose a valid promotion type.', 'type');
    if (!promotion.title?.fr?.trim() || !promotion.title.en?.trim() || !promotion.title.ar?.trim()) throw fail('Promotion title requires French, English, and Arabic values.', 'title');
    if (!Number.isInteger(promotion.sortOrder) || promotion.sortOrder < 0) throw fail('Promotion order must be a non-negative integer.', 'sortOrder');
    if (promotion.startsAt && Number.isNaN(Date.parse(promotion.startsAt))) throw fail('Enter a valid start date.', 'startsAt');
    if (promotion.endsAt && Number.isNaN(Date.parse(promotion.endsAt))) throw fail('Enter a valid end date.', 'endsAt');
    if (promotion.startsAt && promotion.endsAt && new Date(promotion.startsAt) > new Date(promotion.endsAt)) throw fail('Start date must be before end date.', 'endsAt');
    this.validateTargets(promotion.target, menu);
    this.validateRule(promotion.type, promotion.rule);
  }
  private validateTargets(target: PromotionTarget, menu: MenuDocument): void { const itemIds = target.itemIds ?? []; const categoryIds = target.categoryIds ?? []; if (!itemIds.length && !categoryIds.length) throw fail('Select at least one item or category target.', 'target'); if (itemIds.some((id) => !menu.items.some((item) => item.id === id))) throw fail('Promotion references an unknown menu item.', 'target.itemIds'); if (categoryIds.some((id) => !menu.categories.some((category) => category.id === id))) throw fail('Promotion references an unknown category.', 'target.categoryIds'); }
  private validateRule(type: PromotionType, rule: PromotionRule): void { const positive = (value: number | undefined) => typeof value === 'number' && Number.isFinite(value) && value > 0; if (type === 'percentage' && (typeof rule.percentage !== 'number' || rule.percentage <= 0 || rule.percentage > 100)) throw fail('Percentage must be greater than 0 and at most 100.', 'rule.percentage'); if (type === 'fixed-amount' && !positive(rule.fixedAmount)) throw fail('Fixed discount must be positive.', 'rule.fixedAmount'); if ((type === 'buy-x-get-y-free' || type === 'buy-x-get-y-discount') && (!positive(rule.buyQuantity) || !positive(rule.rewardQuantity))) throw fail('Buy and reward quantities must be positive.', 'rule'); if (type === 'buy-x-get-y-discount' && (typeof rule.rewardDiscountPercentage !== 'number' || rule.rewardDiscountPercentage < 0 || rule.rewardDiscountPercentage > 100)) throw fail('Reward discount must be between 0 and 100.', 'rule.rewardDiscountPercentage'); if (type === 'bundle-fixed-price' && !positive(rule.bundlePrice)) throw fail('Bundle price must be positive.', 'rule.bundlePrice'); }
}
