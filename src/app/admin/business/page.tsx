import { AdminShell } from '../../../components/admin-shell';
import { BusinessProfileEditor } from '../../../components/business-profile-editor';
import { readAdminProfile, saveAdminProfile } from '../../../content/admin-menu-actions';

export default function AdminBusinessPage() {
  return (
    <AdminShell title="Business Information">
      <BusinessProfileEditor serverActions={{ readProfile: readAdminProfile, saveProfile: saveAdminProfile }} />
    </AdminShell>
  );
}
