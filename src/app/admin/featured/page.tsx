import { AdminShell } from '../../../components/admin-shell';
import { FeaturedSectionsManager } from '../../../components/featured-sections-manager';
import { createAdminFeaturedSection, deleteAdminFeaturedSection, readAdminManagementState, reorderAdminFeaturedSections, updateAdminFeaturedSection } from '../../../content/admin-menu-actions';

export default function AdminFeaturedPage() {
  return <AdminShell title="Featured Sections"><FeaturedSectionsManager serverActions={{ getManagementState: readAdminManagementState, createFeaturedSection: createAdminFeaturedSection, updateFeaturedSection: updateAdminFeaturedSection, deleteFeaturedSection: deleteAdminFeaturedSection, reorderFeaturedSections: reorderAdminFeaturedSections }} /></AdminShell>;
}