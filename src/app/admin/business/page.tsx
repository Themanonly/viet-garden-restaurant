import { AdminShell } from '../../../components/admin-shell';
import { BusinessProfileEditor } from '../../../components/business-profile-editor';
import { readAdminProfile, saveAdminProfile } from '../../../content/admin-menu-actions';

export default function AdminBusinessPage() {
  return (
    <AdminShell title="Business Information" description="Update the business name, About section, and location customers see. Phone numbers, social links, ordering, media, and opening hours have their own sections.">
      <BusinessProfileEditor serverActions={{ readProfile: readAdminProfile, saveProfile: saveAdminProfile }} />
    </AdminShell>
  );
}
