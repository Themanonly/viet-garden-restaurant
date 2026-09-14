import { AdminShell } from '../../../components/admin-shell';
import { HomepageContentEditor } from '../../../components/homepage-content-editor';
import { readAdminHomepageContent, readAdminHomepageVisuals, readAdminMedia, saveAdminHomepageContent, saveAdminHomepageVisuals } from '../../../content/admin-menu-actions';

export default function AdminHomepagePage() {
  return (
    <AdminShell title="Homepage" description="Manage marketing text and visuals used in the homepage hero and introduction.">
      <HomepageContentEditor
        serverActions={{
          readAdminHomepageContent,
          saveAdminHomepageContent,
          readAdminHomepageVisuals,
          saveAdminHomepageVisuals,
          readAdminMedia,
        }}
      />
    </AdminShell>
  );
}
