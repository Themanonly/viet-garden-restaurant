import { AdminShell } from '../../../components/admin-shell';
import { MediaLibraryManager } from '../../../components/media-library-manager';
import { deleteAdminMedia, readAdminManagementState, readAdminMedia, registerAdminMedia, replaceAdminMedia, setCanonicalAdminBrandLogo } from '../../../content/admin-menu-actions';

export default function AdminMediaPage() {
  return <AdminShell title="Media Library"><MediaLibraryManager serverActions={{ getManagementState: readAdminManagementState, listMedia: readAdminMedia, registerMedia: registerAdminMedia, replaceMedia: replaceAdminMedia, removeMedia: deleteAdminMedia, setCanonicalBrandLogo: setCanonicalAdminBrandLogo }} /></AdminShell>;
}