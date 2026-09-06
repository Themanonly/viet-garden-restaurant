import { AdminShell } from '../../../components/admin-shell';
import { MenuItemsManager } from '../../../components/menu-items-manager';
import { readAdminManagementState, readAdminMedia, createAdminItem, updateAdminItem, deleteAdminItem, moveAdminItem, reorderAdminItems } from '../../../content/admin-menu-actions';

export default function AdminItemsPage() {
  return <AdminShell title="Menu Items"><MenuItemsManager serverActions={{ getManagementState: readAdminManagementState, listMedia: readAdminMedia, createItem: createAdminItem, updateItem: updateAdminItem, deleteItem: deleteAdminItem, moveItem: moveAdminItem, reorderItems: reorderAdminItems }} /></AdminShell>;
}