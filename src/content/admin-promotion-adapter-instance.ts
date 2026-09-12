import { createMenuRepository } from './menu-repository';
import { AdminPromotionUiAdapter } from './admin-promotion-ui-adapter';
import { createPromotionRepository } from './promotion-repository';
import { PromotionService } from './promotion-service';
const adapter = new AdminPromotionUiAdapter(new PromotionService(createPromotionRepository(), () => createMenuRepository().getMenu()));
export function getAdminPromotionUiAdapter(): AdminPromotionUiAdapter { return adapter; }
