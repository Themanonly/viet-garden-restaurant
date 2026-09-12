import { restaurantProfile } from './restaurant';
import type { RestaurantContact, RestaurantProfile, RestaurantSocialLink } from './models';
import { createSupabaseDatabaseClient, type SupabaseDatabaseClient } from './supabase-database';
import type { RestaurantProfileRepository } from './restaurant-profile-repository';

interface ProfileRow {
  id: string;
  name: RestaurantProfile['name'];
  description: RestaurantProfile['description'];
  source_language: 'fr';
  address: RestaurantProfile['address'];
  city: string;
  postal_code: string;
  google_maps_url: string;
  ordering: RestaurantProfile['orderingChannels'];
}

type ContactRow = Omit<RestaurantContact, 'sortOrder' | 'displayValue' | 'primary'> & { profile_id: string; display_value: string | null; sort_order: number; primary_flag: boolean };
type SocialRow = Omit<RestaurantSocialLink, 'sortOrder' | 'handle' | 'icon' | 'iconMediaId'> & { profile_id: string; sort_order: number; handle: string | null; icon: string | null; icon_media_id: string | null };

function clone<T>(value: T): T {
  return structuredClone(value);
}

export class SupabaseRestaurantProfileRepository implements RestaurantProfileRepository {
  constructor(private readonly database: SupabaseDatabaseClient = createSupabaseDatabaseClient()) {}

  async getProfile(): Promise<RestaurantProfile> {
    const [profiles, contacts, socialLinks] = await Promise.all([
      this.database.select<ProfileRow>('restaurant_profiles', 'select=*&id=eq.viet-garden-casablanca'),
      this.database.select<ContactRow>('restaurant_contacts', 'select=*&profile_id=eq.viet-garden-casablanca&order=sort_order.asc'),
      this.database.select<SocialRow>('restaurant_social_links', 'select=*&profile_id=eq.viet-garden-casablanca&order=sort_order.asc'),
    ]);
    if (!profiles[0]) throw new Error('Supabase restaurant profile baseline is not initialized.');
    const profile = profiles[0];
    return clone({
      id: profile.id,
      name: profile.name,
      description: profile.description,
      sourceLanguage: profile.source_language,
      address: profile.address,
      city: profile.city,
      postalCode: profile.postal_code,
      googleMapsUrl: profile.google_maps_url,
      orderingChannels: profile.ordering,
      contacts: contacts.map((contact) => ({ id: contact.id, type: contact.type, label: contact.label, value: contact.value, ...(contact.display_value ? { displayValue: contact.display_value } : {}), enabled: contact.enabled, sortOrder: contact.sort_order, ...(contact.primary_flag ? { primary: true } : {}) })),
      socialLinks: socialLinks.map((social) => ({ id: social.id, platform: social.platform, label: social.label, url: social.url, ...(social.handle ? { handle: social.handle } : {}), ...(social.icon ? { icon: social.icon } : {}), ...(social.icon_media_id ? { iconMediaId: social.icon_media_id } : {}), enabled: social.enabled, sortOrder: social.sort_order })),
    });
  }

  async replaceProfile(profile: RestaurantProfile): Promise<void> {
    const profileRow: ProfileRow = {
      id: profile.id,
      name: profile.name,
      description: profile.description,
      source_language: profile.sourceLanguage ?? 'fr',
      address: profile.address,
      city: profile.city,
      postal_code: profile.postalCode ?? '',
      google_maps_url: profile.googleMapsUrl ?? '',
      ordering: profile.orderingChannels,
    };
    const contacts: ContactRow[] = profile.contacts.map((contact) => ({ id: contact.id, profile_id: profile.id, type: contact.type, label: contact.label, value: contact.value, display_value: contact.displayValue ?? null, enabled: contact.enabled, sort_order: contact.sortOrder, primary_flag: contact.primary ?? false }));
    const socials: SocialRow[] = profile.socialLinks.map((social) => ({ id: social.id, profile_id: profile.id, platform: social.platform, label: social.label, url: social.url, handle: social.handle ?? null, icon: social.icon ?? null, icon_media_id: social.iconMediaId ?? null, enabled: social.enabled, sort_order: social.sortOrder }));
    await this.database.rpc('replace_restaurant_profile', { p_profile: profileRow, p_contacts: contacts, p_socials: socials });
  }
}

export function createSupabaseRestaurantProfileRepository(database?: SupabaseDatabaseClient): SupabaseRestaurantProfileRepository {
  return new SupabaseRestaurantProfileRepository(database);
}

export function seedRestaurantProfile(): RestaurantProfile {
  return clone(restaurantProfile);
}
