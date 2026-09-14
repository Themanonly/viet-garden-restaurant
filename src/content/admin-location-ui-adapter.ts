import { AdminApplicationError, type AdminErrorInfo } from './admin-menu-service';
import { LocationValidationError, type Location } from './location';
import { createLocationRepository } from './location-repository';
import { LocationService, type LocationCreateInput, type LocationUpdateInput } from './location-service';
import type { RestaurantProfileRepository } from './restaurant-profile-repository';

export type AdminLocationDto = Location;
export type AdminLocationCreateInput = LocationCreateInput;
export type AdminLocationUpdateInput = LocationUpdateInput;

function clone<T>(value: T): T { return structuredClone(value); }

export async function resolveActiveLocationProfileId(profileRepository: RestaurantProfileRepository): Promise<string> {
  return (await profileRepository.getProfile()).id;
}

function toAdminError(error: unknown): AdminApplicationError {
  if (error instanceof LocationValidationError) {
    const info: AdminErrorInfo = { code: 'location-validation-failed', message: error.message, resource: 'location', fields: error.fields };
    return new AdminApplicationError(info);
  }
  if (error instanceof AdminApplicationError) return error;
  return new AdminApplicationError({ code: 'admin-location-operation-failed', message: 'The location operation could not be completed.', resource: 'location' });
}

export class AdminLocationUiAdapter {
  constructor(private readonly profileRepository: RestaurantProfileRepository) {}

  private async getService(): Promise<LocationService> {
    const profileId = await resolveActiveLocationProfileId(this.profileRepository);
    return new LocationService(createLocationRepository(profileId), profileId);
  }

  private async run<T>(action: (service: LocationService) => Promise<T>): Promise<T> {
    try { return clone(await action(await this.getService())); } catch (error) { throw toAdminError(error); }
  }

  async listLocations(): Promise<AdminLocationDto[]> { return this.run((service) => service.listLocations()); }
  async createLocation(input: AdminLocationCreateInput): Promise<AdminLocationDto> { return this.run((service) => service.createLocation(clone(input))); }
  async updateLocation(id: string, input: AdminLocationUpdateInput): Promise<AdminLocationDto> { return this.run((service) => service.updateLocation(id, clone(input))); }
  async setEnabled(id: string, enabled: boolean): Promise<AdminLocationDto> { return this.run((service) => service.setEnabled(id, enabled)); }
  async setPrimary(id: string): Promise<AdminLocationDto> { return this.run((service) => service.setPrimary(id)); }
  async reorderLocations(ids: string[]): Promise<AdminLocationDto[]> { return this.run((service) => service.reorderLocations([...ids])); }
  async deleteLocation(id: string): Promise<void> { await this.run((service) => service.removeLocation(id)); }
}
