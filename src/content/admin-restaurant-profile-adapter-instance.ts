import { AdminRestaurantProfileUiAdapter } from './admin-restaurant-profile-ui-adapter';
import { createRestaurantProfileRepository } from './restaurant-profile-repository';
import { RestaurantProfileService } from './restaurant-profile-service';

const adminRestaurantProfileUiAdapter = new AdminRestaurantProfileUiAdapter(new RestaurantProfileService(createRestaurantProfileRepository()));

export function getAdminRestaurantProfileUiAdapter(): AdminRestaurantProfileUiAdapter {
  return adminRestaurantProfileUiAdapter;
}
