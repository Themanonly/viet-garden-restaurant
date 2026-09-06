import { AdminShell } from '../../../components/admin-shell';
import { CategoryManager } from '../../../components/category-editor';
import { createAdminCategory, deleteAdminCategory, readAdminManagementState, reorderAdminCategories, updateAdminCategory } from '../../../content/admin-menu-actions';

export default function AdminCategoriesPage() {
  return <AdminShell title="Categories"><CategoryManager serverActions={{ getManagementState: readAdminManagementState, createCategory: createAdminCategory, updateCategory: updateAdminCategory, deleteCategory: deleteAdminCategory, reorderCategories: reorderAdminCategories }} /></AdminShell>;
}