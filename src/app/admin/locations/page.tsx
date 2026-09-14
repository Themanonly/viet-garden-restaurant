import { AdminShell } from '../../../components/admin-shell';
import { LocationsManager } from '../../../components/locations-manager';
import { createAdminLocation, deleteAdminLocation, readAdminLocations, reorderAdminLocations, setAdminLocationEnabled, setAdminLocationPrimary, updateAdminLocation } from '../../../content/admin-menu-actions';

export default function AdminLocationsPage() {
  return (
    <AdminShell title="Locations" description="Manage the places customers can visit. Names and addresses are shown in the visitor's language.">
      <LocationsManager serverActions={{ readAdminLocations, createAdminLocation, updateAdminLocation, setAdminLocationEnabled, setAdminLocationPrimary, reorderAdminLocations, deleteAdminLocation }} />
    </AdminShell>
  );
}
