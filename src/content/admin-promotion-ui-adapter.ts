import type { AdminPromotionCreateInput, AdminPromotionDto, AdminPromotionUpdateInput, PromotionService } from './promotion-service';
export type AdminUiPromotionCreateInput = AdminPromotionCreateInput;
export type AdminUiPromotionUpdateInput = AdminPromotionUpdateInput;
export type AdminUiPromotionDto = AdminPromotionDto;
function clone<T>(value: T): T { return structuredClone(value); }
export class AdminPromotionUiAdapter {
  constructor(private readonly service: PromotionService) {}
  async listPromotions() { return clone(await this.service.listPromotions()); }
  async createPromotion(input: AdminPromotionCreateInput) { return clone(await this.service.createPromotion(clone(input))); }
  async updatePromotion(id: string, input: AdminPromotionUpdateInput) { return clone(await this.service.updatePromotion(id, clone(input))); }
  async deletePromotion(id: string) { await this.service.deletePromotion(id); }
  async reorderPromotions(ids: string[]) { return clone(await this.service.reorderPromotions([...ids])); }
}
