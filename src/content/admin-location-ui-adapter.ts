import { AdminApplicationError, type AdminErrorInfo } from './admin-menu-service';
import { LocationValidationError, type Location } from './location';
import { createLocationRepository } from './location-repository';
import { LocationService, type LocationCreateInput, type LocationUpdateInput } from './location-service';
import { restaurantProfile } from './restaurant';

export type AdminLocationDto = Location;
export type AdminLocationCreateInput = LocationCreateInput;
export type AdminLocationUpdateInput = LocationUpdateInput;

function clone<T>(value: T): T { return structuredClone(value); }

function toAdminError(error: unknown): AdminApplicationError {
  if (error instanceof LocationValidationError) {
    const info: AdminErrorInfo = { code: 'location-validation-failed', message: error.message, resource: 'location', fields: error.fields };
    return new AdminApplicationError(info);
  }
  if (error instanceof AdminApplicationError) return error;
  return new AdminApplicationError({ code: 'admin-location-operation-failed', message: 'The location operation could not be completed.', resource: 'location' });
}

export class AdminLocationUiAdapter {
  private readonly service = new LocationService(createLocationRepository(restaurantProfile.id), restaurantProfile.id);

  private async run<T>(action: () => Promise<T>): Promise<T> {
    try { return clone(await action()); } catch (error) { throw toAdminError(error); }
  }

  async listLocations(): Promise<AdminLocationDto[]> { return this.run(() => this.service.listLocations()); }
  async createLocation(input: AdminLocationCreateInput): Promise<AdminLocationDto> { return this.run(() => this.service.createLocation(clone(input))); }
  async updateLocation(id: string, input: AdminLocationUpdateInput): Promise<AdminLocationDto> { return this.run(() => this.service.updateLocation(id, clone(input))); }
  async setEnabled(id: string, enabled: boolean): Promise<AdminLocationDto> { return this.run(() => this.service.setEnabled(id, enabled)); }
  async setPrimary(id: string): Promise<AdminLocationDto> { return this.run(() => this.service.setPrimary(id)); }
  async reorderLocations(ids: string[]): Promise<AdminLocationDto[]> { return this.run(() => this.service.reorderLocations([...ids])); }
  async deleteLocation(id: string): Promise<void> { await this.run(() => this.service.removeLocation(id)); }
}
