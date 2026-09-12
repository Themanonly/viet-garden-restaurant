import type { AdminContactCreateInput, AdminContactDto, AdminContactUpdateInput, AdminOrderingChannelCreateInput, AdminOrderingChannelDto, AdminOrderingChannelUpdateInput, AdminSocialCreateInput, AdminSocialDto, AdminSocialUpdateInput, RestaurantProfileService } from './restaurant-profile-service';

export type AdminUiContactCreateInput = AdminContactCreateInput;
export type AdminUiContactUpdateInput = AdminContactUpdateInput;
export type AdminUiSocialCreateInput = AdminSocialCreateInput;
export type AdminUiSocialUpdateInput = AdminSocialUpdateInput;
export type AdminUiContactDto = AdminContactDto;
export type AdminUiSocialDto = AdminSocialDto;
export type AdminUiOrderingChannelCreateInput = AdminOrderingChannelCreateInput;
export type AdminUiOrderingChannelUpdateInput = AdminOrderingChannelUpdateInput;
export type AdminUiOrderingChannelDto = AdminOrderingChannelDto;

function clone<T>(value: T): T {
  return structuredClone(value);
}

export class AdminRestaurantProfileUiAdapter {
  constructor(private readonly service: RestaurantProfileService) {}

  async getProfile() { return clone(await this.service.getProfile()); }
  async updateProfile(input: Partial<Parameters<RestaurantProfileService['updateProfile']>[0]>) { return clone(await this.service.updateProfile(clone(input))); }
  async listContacts(): Promise<AdminUiContactDto[]> { return clone(await this.service.listContacts()); }
  async createContact(input: AdminUiContactCreateInput): Promise<AdminUiContactDto> { return clone(await this.service.createContact(clone(input))); }
  async updateContact(id: string, input: AdminUiContactUpdateInput): Promise<AdminUiContactDto> { return clone(await this.service.updateContact(id, clone(input))); }
  async deleteContact(id: string): Promise<void> { await this.service.deleteContact(id); }
  async reorderContacts(ids: string[]): Promise<AdminUiContactDto[]> { return clone(await this.service.reorderContacts([...ids])); }
  async listSocialLinks(): Promise<AdminUiSocialDto[]> { return clone(await this.service.listSocialLinks()); }
  async createSocialLink(input: AdminUiSocialCreateInput): Promise<AdminUiSocialDto> { return clone(await this.service.createSocialLink(clone(input))); }
  async updateSocialLink(id: string, input: AdminUiSocialUpdateInput): Promise<AdminUiSocialDto> { return clone(await this.service.updateSocialLink(id, clone(input))); }
  async deleteSocialLink(id: string): Promise<void> { await this.service.deleteSocialLink(id); }
  async reorderSocialLinks(ids: string[]): Promise<AdminUiSocialDto[]> { return clone(await this.service.reorderSocialLinks([...ids])); }
  async listOrderingChannels(): Promise<AdminUiOrderingChannelDto[]> { return clone(await this.service.listOrderingChannels()); }
  async createOrderingChannel(input: AdminUiOrderingChannelCreateInput): Promise<AdminUiOrderingChannelDto> { return clone(await this.service.createOrderingChannel(clone(input))); }
  async updateOrderingChannel(id: string, input: AdminUiOrderingChannelUpdateInput): Promise<AdminUiOrderingChannelDto> { return clone(await this.service.updateOrderingChannel(id, clone(input))); }
  async deleteOrderingChannel(id: string): Promise<void> { await this.service.deleteOrderingChannel(id); }
  async reorderOrderingChannels(ids: string[]): Promise<AdminUiOrderingChannelDto[]> { return clone(await this.service.reorderOrderingChannels([...ids])); }
}
