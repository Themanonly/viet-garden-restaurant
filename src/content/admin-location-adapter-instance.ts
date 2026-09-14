import { AdminLocationUiAdapter } from './admin-location-ui-adapter';
import { createRestaurantProfileRepository } from './restaurant-profile-repository';

const adminLocationUiAdapter = new AdminLocationUiAdapter(createRestaurantProfileRepository());

export function getAdminLocationUiAdapter(): AdminLocationUiAdapter {
  return adminLocationUiAdapter;
}
