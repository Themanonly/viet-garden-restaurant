import { AdminLocationUiAdapter } from './admin-location-ui-adapter';

const adminLocationUiAdapter = new AdminLocationUiAdapter();

export function getAdminLocationUiAdapter(): AdminLocationUiAdapter {
  return adminLocationUiAdapter;
}
