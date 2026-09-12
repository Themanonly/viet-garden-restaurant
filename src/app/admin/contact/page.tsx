import { ContactSocialManager } from '../../../components/contact-social-manager';
import { AdminShell } from '../../../components/admin-shell';
import {
  createAdminContact,
  createAdminSocialLink,
  deleteAdminContact,
  deleteAdminSocialLink,
  readAdminContacts,
  readAdminSocialLinks,
  reorderAdminContacts,
  reorderAdminSocialLinks,
  updateAdminContact,
  updateAdminSocialLink,
  readAdminMedia,
} from '../../../content/admin-menu-actions';

export default function AdminContactPage() {
  return <AdminShell title="Contact & Social"><ContactSocialManager serverActions={{ readAdminContacts, createAdminContact, updateAdminContact, deleteAdminContact, reorderAdminContacts, readAdminSocialLinks, createAdminSocialLink, updateAdminSocialLink, deleteAdminSocialLink, reorderAdminSocialLinks, readAdminMedia }} /></AdminShell>;
}
