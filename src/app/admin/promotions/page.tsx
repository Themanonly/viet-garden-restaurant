import { AdminShell } from '../../../components/admin-shell';
import { PromotionsManager } from '../../../components/promotions-manager';
import { createAdminPromotion, deleteAdminPromotion, readAdminManagementState, readAdminPromotions, reorderAdminPromotions, updateAdminPromotion } from '../../../content/admin-menu-actions';
export default function AdminPromotionsPage() { return <AdminShell title="Promotions"><PromotionsManager actions={{ readAdminPromotions, createAdminPromotion, updateAdminPromotion, deleteAdminPromotion, reorderAdminPromotions, readAdminManagementState }} /></AdminShell>; }
