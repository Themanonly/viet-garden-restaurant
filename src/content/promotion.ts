import type { LocalizedText } from './models';

export type PromotionType = 'percentage' | 'fixed-amount' | 'buy-x-get-y-free' | 'buy-x-get-y-discount' | 'bundle-fixed-price';
export type PromotionTarget = { itemIds?: string[]; categoryIds?: string[] };

export interface PromotionRule {
  percentage?: number;
  fixedAmount?: number;
  buyQuantity?: number;
  rewardQuantity?: number;
  rewardDiscountPercentage?: number;
  bundlePrice?: number;
}

export interface Promotion {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  type: PromotionType;
  target: PromotionTarget;
  rule: PromotionRule;
  enabled: boolean;
  startsAt?: string;
  endsAt?: string;
  sortOrder: number;
  mediaId?: string;
}

export function isPromotionActive(promotion: Promotion, now = new Date()): boolean {
  if (!promotion.enabled) return false;
  if (promotion.startsAt && now < new Date(promotion.startsAt)) return false;
  if (promotion.endsAt && now > new Date(promotion.endsAt)) return false;
  return true;
}

export function calculateDiscountedPrice(basePrice: number, type: 'percentage' | 'fixed-amount', amount: number): number {
  if (!Number.isFinite(basePrice) || basePrice < 0) throw new Error('Base price must be non-negative.');
  if (!Number.isFinite(amount) || amount < 0) throw new Error('Discount must be non-negative.');
  const result = type === 'percentage' ? basePrice - (basePrice * amount / 100) : basePrice - amount;
  return Math.max(0, Number(result.toFixed(2)));
}
