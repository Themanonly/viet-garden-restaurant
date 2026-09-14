import { AdminShell } from '../../../components/admin-shell';
import { HomepageContentEditor } from '../../../components/homepage-content-editor';
import { readAdminHomepageContent, saveAdminHomepageContent } from '../../../content/admin-menu-actions';

export default function AdminHomepagePage() {
  return <AdminShell title="Homepage" description="Manage the short marketing text used in the homepage hero and introduction."><HomepageContentEditor serverActions={{ readAdminHomepageContent, saveAdminHomepageContent }} /></AdminShell>;
}
