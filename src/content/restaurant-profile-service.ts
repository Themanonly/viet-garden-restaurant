import { AdminApplicationError, type AdminErrorInfo } from './admin-menu-service';
import type { LocalizedText, OrderingChannel, OrderingChannelType, RestaurantContact, RestaurantContactType, RestaurantProfile, RestaurantSocialLink } from './models';
import type { RestaurantProfileRepository } from './restaurant-profile-repository';

export type AdminContactDto = RestaurantContact;
export type AdminSocialDto = RestaurantSocialLink;
export type AdminProfileUpdateInput = Partial<Omit<RestaurantProfile, 'id' | 'contacts' | 'socialLinks' | 'orderingChannels'>> & {
  settings?: Partial<RestaurantProfile['settings']>;
};

export type AdminContactCreateInput = Omit<RestaurantContact, 'id'> & { id?: string };
export type AdminContactUpdateInput = Partial<Omit<RestaurantContact, 'id'>>;
export type AdminSocialCreateInput = Omit<RestaurantSocialLink, 'id'> & { id?: string };
export type AdminSocialUpdateInput = Partial<Omit<RestaurantSocialLink, 'id'>>;
export type AdminOrderingChannelDto = OrderingChannel;
export type AdminOrderingChannelCreateInput = Omit<OrderingChannel, 'id'> & { id?: string };
export type AdminOrderingChannelUpdateInput = Partial<Omit<OrderingChannel, 'id'>>;

function clone<T>(value: T): T {
  return structuredClone(value);
}

function generateRecordId(prefix: string, existingIds: string[]): string {
  const candidate = `${prefix}-${crypto.randomUUID()}`;
  return existingIds.includes(candidate) ? generateRecordId(prefix, existingIds) : candidate;
}

function error(resource: 'contact' | 'social' | 'ordering', message: string, field?: string): AdminApplicationError {
  const info: AdminErrorInfo = { code: `invalid-${resource}`, message, resource, ...(field ? { fields: [{ code: `invalid-${resource}`, message, path: field }] } : {}) };
  return new AdminApplicationError(info);
}

export class RestaurantProfileService {
  constructor(private readonly repository: RestaurantProfileRepository) {}

  async getProfile(): Promise<RestaurantProfile> {
    return clone(await this.repository.getProfile());
  }

  async updateProfile(input: AdminProfileUpdateInput): Promise<RestaurantProfile> {
    const profile = await this.getProfile();
    const nextProfile: RestaurantProfile = {
      ...profile,
      ...clone(input),
      settings: { ...profile.settings, ...clone(input.settings) },
      contacts: profile.contacts,
      socialLinks: profile.socialLinks,
      orderingChannels: profile.orderingChannels,
    };
    this.validateProfile(nextProfile);
    await this.repository.replaceProfile(nextProfile);
    return clone(nextProfile);
  }

  async listContacts(): Promise<AdminContactDto[]> {
    return (await this.getProfile()).contacts.sort((first, second) => first.sortOrder - second.sortOrder);
  }

  async createContact(input: AdminContactCreateInput): Promise<AdminContactDto> {
    const profile = await this.getProfile();
    const contact: RestaurantContact = { ...clone(input), id: input.id?.trim() || generateRecordId('contact', profile.contacts.map((item) => item.id)) };
    this.validateContact(contact);
    profile.contacts.push(contact);
    await this.repository.replaceProfile(profile);
    return clone(contact);
  }

  async updateContact(id: string, input: AdminContactUpdateInput): Promise<AdminContactDto> {
    const profile = await this.getProfile();
    const index = profile.contacts.findIndex((contact) => contact.id === id);
    if (index < 0) throw error('contact', `Contact not found: ${id}.`, 'id');
    const updated = { ...profile.contacts[index], ...clone(input), id };
    this.validateContact(updated);
    profile.contacts[index] = updated;
    await this.repository.replaceProfile(profile);
    return clone(updated);
  }

  async deleteContact(id: string): Promise<void> {
    const profile = await this.getProfile();
    const next = profile.contacts.filter((contact) => contact.id !== id);
    if (next.length === profile.contacts.length) throw error('contact', `Contact not found: ${id}.`, 'id');
    await this.repository.replaceProfile({ ...profile, contacts: next });
  }

  async reorderContacts(ids: string[]): Promise<AdminContactDto[]> {
    const profile = await this.getProfile();
    if (ids.length !== profile.contacts.length || new Set(ids).size !== ids.length || ids.some((id) => !profile.contacts.some((contact) => contact.id === id))) throw error('contact', 'Contact ordering must include each contact exactly once.', 'sortOrder');
    const byId = new Map(profile.contacts.map((contact) => [contact.id, contact]));
    profile.contacts = ids.map((id, sortOrder) => ({ ...byId.get(id) as RestaurantContact, sortOrder }));
    await this.repository.replaceProfile(profile);
    return this.listContacts();
  }

  async listSocialLinks(): Promise<AdminSocialDto[]> {
    return (await this.getProfile()).socialLinks.sort((first, second) => first.sortOrder - second.sortOrder);
  }

  async createSocialLink(input: AdminSocialCreateInput): Promise<AdminSocialDto> {
    const profile = await this.getProfile();
    const social: RestaurantSocialLink = { ...clone(input), id: input.id?.trim() || generateRecordId('social', profile.socialLinks.map((item) => item.id)) };
    this.validateSocial(social);
    if (profile.socialLinks.some(existing => existing.sortOrder === social.sortOrder)) {
      social.sortOrder = Math.max(-1, ...profile.socialLinks.map(existing => existing.sortOrder)) + 1;
    }
    profile.socialLinks.push(social);
    await this.repository.replaceProfile(profile);
    return clone(social);
  }

  async updateSocialLink(id: string, input: AdminSocialUpdateInput): Promise<AdminSocialDto> {
    const profile = await this.getProfile();
    const index = profile.socialLinks.findIndex((social) => social.id === id);
    if (index < 0) throw error('social', `Social link not found: ${id}.`, 'id');
    const updated = { ...profile.socialLinks[index], ...clone(input), id };
    this.validateSocial(updated);
    profile.socialLinks[index] = updated;
    await this.repository.replaceProfile(profile);
    return clone(updated);
  }

  async deleteSocialLink(id: string): Promise<void> {
    const profile = await this.getProfile();
    const next = profile.socialLinks.filter((social) => social.id !== id);
    if (next.length === profile.socialLinks.length) throw error('social', `Social link not found: ${id}.`, 'id');
    await this.repository.replaceProfile({ ...profile, socialLinks: next });
  }

  async reorderSocialLinks(ids: string[]): Promise<AdminSocialDto[]> {
    const profile = await this.getProfile();
    if (ids.length !== profile.socialLinks.length || new Set(ids).size !== ids.length || ids.some((id) => !profile.socialLinks.some((social) => social.id === id))) throw error('social', 'Social ordering must include each social link exactly once.', 'sortOrder');
    const byId = new Map(profile.socialLinks.map((social) => [social.id, social]));
    profile.socialLinks = ids.map((id, sortOrder) => ({ ...byId.get(id) as RestaurantSocialLink, sortOrder }));
    await this.repository.replaceProfile(profile);
    return this.listSocialLinks();
  }

  async listOrderingChannels(): Promise<AdminOrderingChannelDto[]> {
    return (await this.getProfile()).orderingChannels.sort((first, second) => first.sortOrder - second.sortOrder);
  }

  async createOrderingChannel(input: AdminOrderingChannelCreateInput): Promise<AdminOrderingChannelDto> {
    const profile = await this.getProfile();
    const channel: OrderingChannel = { ...clone(input), id: input.id?.trim() || generateRecordId('ordering', profile.orderingChannels.map((item) => item.id)) };
    this.validateOrderingChannel(channel);
    profile.orderingChannels.push(channel);
    await this.repository.replaceProfile(profile);
    return clone(channel);
  }

  async updateOrderingChannel(id: string, input: AdminOrderingChannelUpdateInput): Promise<AdminOrderingChannelDto> {
    const profile = await this.getProfile();
    const index = profile.orderingChannels.findIndex((channel) => channel.id === id);
    if (index < 0) throw error('ordering', `Ordering channel not found: ${id}.`, 'id');
    const updated = { ...profile.orderingChannels[index], ...clone(input), id };
    this.validateOrderingChannel(updated);
    profile.orderingChannels[index] = updated;
    await this.repository.replaceProfile(profile);
    return clone(updated);
  }

  async deleteOrderingChannel(id: string): Promise<void> {
    const profile = await this.getProfile();
    const next = profile.orderingChannels.filter((channel) => channel.id !== id);
    if (next.length === profile.orderingChannels.length) throw error('ordering', `Ordering channel not found: ${id}.`, 'id');
    await this.repository.replaceProfile({ ...profile, orderingChannels: next });
  }

  async reorderOrderingChannels(ids: string[]): Promise<AdminOrderingChannelDto[]> {
    const profile = await this.getProfile();
    if (ids.length !== profile.orderingChannels.length || new Set(ids).size !== ids.length || ids.some((id) => !profile.orderingChannels.some((channel) => channel.id === id))) throw error('ordering', 'Ordering must include each channel exactly once.', 'sortOrder');
    const byId = new Map(profile.orderingChannels.map((channel) => [channel.id, channel]));
    profile.orderingChannels = ids.map((id, sortOrder) => ({ ...byId.get(id) as OrderingChannel, sortOrder }));
    await this.repository.replaceProfile(profile);
    return this.listOrderingChannels();
  }

  private validateProfile(profile: RestaurantProfile): void {
    if (!profile.name?.fr?.trim() || !profile.name?.en?.trim() || !profile.name?.ar?.trim()) throw error('contact', 'Business name requires French, English, and Arabic values.', 'name');
    if (!profile.description?.fr?.trim() || !profile.description?.en?.trim() || !profile.description?.ar?.trim()) throw error('contact', 'Business description requires French, English, and Arabic values.', 'description');
    if (!profile.address?.fr?.trim() || !profile.address?.en?.trim() || !profile.address?.ar?.trim()) throw error('contact', 'Business address requires French, English, and Arabic values.', 'address');
    if (!profile.city?.trim()) throw error('contact', 'Business city is required.', 'city');
    if (!profile.postalCode?.trim()) throw error('contact', 'Business postal code is required.', 'postalCode');
    if (profile.country && !profile.country.trim()) throw error('contact', 'Business country cannot be empty.', 'country');
    if (profile.region && !profile.region.trim()) throw error('contact', 'Business region cannot be empty.', 'region');
    if (profile.googleMapsUrl) {
      try {
        const url = new URL(profile.googleMapsUrl);
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
      } catch {
        throw error('contact', 'Enter a valid HTTP or HTTPS URL.', 'googleMapsUrl');
      }
    }
    if (profile.businessType && !profile.businessType.trim()) throw error('contact', 'Business type cannot be empty.', 'businessType');
    if (profile.settings) {
      if (profile.settings.currency && !profile.settings.currency.trim()) throw error('contact', 'Currency cannot be empty.', 'settings.currency');
      if (profile.settings.timezone && !profile.settings.timezone.trim()) throw error('contact', 'Timezone cannot be empty.', 'settings.timezone');
      if (profile.settings.defaultLocale && !['fr', 'en', 'ar'].includes(profile.settings.defaultLocale)) throw error('contact', 'Default locale must be FR, EN, or AR.', 'settings.defaultLocale');
      if (profile.settings.supportedLocales && profile.settings.supportedLocales.some((locale) => !['fr', 'en', 'ar'].includes(locale))) throw error('contact', 'Supported locales must be limited to FR, EN, and AR.', 'settings.supportedLocales');
    }
  }

  private validateContact(contact: RestaurantContact): void {
    if (!['phone', 'whatsapp', 'email', 'fax', 'other'].includes(contact.type as RestaurantContactType)) throw error('contact', 'Choose a supported contact type.', 'type');
    if (!contact.value.trim()) throw error('contact', 'Contact value is required.', 'value');
    if (!contact.label?.fr?.trim() || !contact.label?.en?.trim() || !contact.label?.ar?.trim()) throw error('contact', 'Contact labels require French, English, and Arabic values.', 'label');
    if (!Number.isInteger(contact.sortOrder) || contact.sortOrder < 0) throw error('contact', 'Contact order must be a non-negative integer.', 'sortOrder');
    if (contact.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.value.trim())) throw error('contact', 'Enter a valid email address.', 'value');
  }

  private validateSocial(social: RestaurantSocialLink): void {
    if (!social.platform.trim()) throw error('social', 'Social platform is required.', 'platform');
    if (!social.label?.fr?.trim() || !social.label?.en?.trim() || !social.label?.ar?.trim()) throw error('social', 'Social labels require French, English, and Arabic values.', 'label');
    try {
      const url = new URL(social.url);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    } catch {
      throw error('social', 'Enter a valid HTTP or HTTPS URL.', 'url');
    }
    if (!Number.isInteger(social.sortOrder) || social.sortOrder < 0) throw error('social', 'Social order must be a non-negative integer.', 'sortOrder');
  }

  private validateOrderingChannel(channel: OrderingChannel): void {
    if (!(channel.type as OrderingChannelType)?.trim()) throw error('ordering', 'Ordering channel type is required.', 'type');
    if (!channel.name?.fr?.trim() || !channel.name?.en?.trim() || !channel.name?.ar?.trim()) throw error('ordering', 'Ordering channel names require French, English, and Arabic values.', 'name');
    try {
      const url = new URL(channel.url);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    } catch {
      throw error('ordering', 'Enter a valid HTTP or HTTPS ordering URL.', 'url');
    }
    if (!Number.isInteger(channel.sortOrder) || channel.sortOrder < 0) throw error('ordering', 'Ordering channel order must be a non-negative integer.', 'sortOrder');
  }
}
