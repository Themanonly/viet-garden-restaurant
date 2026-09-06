import { AdminShell } from '../../../components/admin-shell';
import { RestaurantStatusEditor } from '../../../components/restaurant-status-editor';
import { readAdminManagementState, saveAdminAvailability } from '../../../content/admin-menu-actions';

export default function AdminStatusPage() {
  return <AdminShell title="Restaurant Status"><RestaurantStatusEditor serverActions={{ getManagementState: readAdminManagementState, updateAvailability: saveAdminAvailability }} /></AdminShell>;
}