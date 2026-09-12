import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { restaurantProfile } from './restaurant';
import type { OrderingChannel, OrderingChannelType, RestaurantContact, RestaurantProfile, RestaurantSocialLink } from './models';
import { getApplicationDataProvider } from './application-provider';
import { createSupabaseRestaurantProfileRepository } from './supabase-restaurant-profile-repository';

export interface RestaurantProfileRepository {
  getProfile(): Promise<RestaurantProfile>;
  replaceProfile(profile: RestaurantProfile): Promise<void>;
}

export class RestaurantProfilePersistenceError extends Error {
  constructor(public readonly code: 'read-failed' | 'write-failed' | 'invalid-persisted-profile', message: string) {
    super(message);
    this.name = 'RestaurantProfilePersistenceError';
  }
}

const defaultProfileStatePath = process.env.VIET_GARDEN_PROFILE_STATE_PATH
  ?? path.join(process.env.LOCALAPPDATA ?? process.env.XDG_DATA_HOME ?? process.cwd(), 'Viet Garden Restaurant & Coffee', 'restaurant-profile.json');
const operationQueues = new Map<string, Promise<unknown>>();

function clone<T>(value: T): T {
  return structuredClone(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function migratePersistedProfile(value: unknown): RestaurantProfile {
  if (!isRecord(value)) throw new RestaurantProfilePersistenceError('invalid-persisted-profile', 'Persisted restaurant profile must be an object.');
  const legacyPhones = Array.isArray(value.phoneNumbers) ? value.phoneNumbers : [];
  const contacts = Array.isArray(value.contacts) ? value.contacts : legacyPhones.map((phone, index) => ({
    id: typeof phone === 'object' && phone && 'id' in phone && typeof phone.id === 'string' ? phone.id : `contact-${index}`,
    type: 'phone',
    label: typeof phone === 'object' && phone && 'label' in phone ? phone.label : {},
    value: typeof phone === 'object' && phone && 'dialable' in phone && typeof phone.dialable === 'string' ? phone.dialable : '',
    displayValue: typeof phone === 'object' && phone && 'display' in phone && typeof phone.display === 'string' ? phone.display : undefined,
    enabled: typeof phone === 'object' && phone && 'enabled' in phone ? Boolean(phone.enabled) : true,
    sortOrder: index,
    primary: index === 0,
  }));
  const socialLinks = Array.isArray(value.socialLinks)
    ? value.socialLinks.map((link, index) => ({ ...(link as RestaurantSocialLink), sortOrder: typeof (link as RestaurantSocialLink).sortOrder === 'number' ? (link as RestaurantSocialLink).sortOrder : index }))
    : [];
  const legacyOrdering = Array.isArray(value.orderingChannels) ? value.orderingChannels : Array.isArray(value.ordering) ? value.ordering : [];
  const orderingChannels = legacyOrdering.map((channel, index) => {
    const candidate = channel as Partial<OrderingChannel> & { label?: OrderingChannel['name']; source?: string };
    const type = ['glovo', 'yassir', 'uber-eats', 'direct', 'whatsapp'].includes(candidate.type ?? candidate.source ?? '')
      ? (candidate.type ?? candidate.source) as OrderingChannelType
      : 'other';
    return {
      id: candidate.id?.trim() || (type === 'glovo' ? 'glovo' : `${type}-${index}`),
      name: candidate.name ?? candidate.label ?? {},
      type,
      url: candidate.url ?? '',
      ...(candidate.logoMediaId ? { logoMediaId: candidate.logoMediaId } : {}),
      ...(candidate.description ? { description: candidate.description } : {}),
      ...(candidate.ctaText ? { ctaText: candidate.ctaText } : candidate.label ? { ctaText: candidate.label } : {}),
      enabled: typeof candidate.enabled === 'boolean' ? candidate.enabled : true,
      sortOrder: typeof candidate.sortOrder === 'number' ? candidate.sortOrder : index,
    } satisfies OrderingChannel;
  });
  const { ordering: _ordering, orderingChannels: _orderingChannels, ...profileWithoutOrdering } = value as unknown as RestaurantProfile & { ordering?: unknown; orderingChannels?: unknown };
  return { ...profileWithoutOrdering, contacts: contacts as RestaurantContact[], socialLinks, orderingChannels };
}

function validateProfile(profile: RestaurantProfile, source: string): RestaurantProfile {
  const errors: string[] = [];
  if (!profile?.id?.trim()) errors.push('Restaurant profile requires an id.');
  const contactIds = new Set<string>();
  profile?.contacts?.forEach((contact) => {
    if (!contact.id?.trim()) errors.push('Restaurant contacts require an id.');
    if (contactIds.has(contact.id)) errors.push(`Duplicate restaurant contact id: ${contact.id}.`);
    contactIds.add(contact.id);
    if (!['phone', 'whatsapp', 'email', 'fax', 'other'].includes(contact.type)) errors.push(`Unsupported contact type: ${contact.id}.`);
    if (!contact.value?.trim()) errors.push(`Restaurant contact requires a value: ${contact.id}.`);
    if (!Number.isInteger(contact.sortOrder) || contact.sortOrder < 0) errors.push(`Invalid contact ordering: ${contact.id}.`);
    if (!contact.label?.fr || !contact.label?.en || !contact.label?.ar) errors.push(`Restaurant contact labels require FR, EN, and AR values: ${contact.id}.`);
    if (contact.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.value.trim())) errors.push(`Invalid contact email: ${contact.id}.`);
  });
  const socialIds = new Set<string>();
  profile?.socialLinks?.forEach((social) => {
    if (!social.id?.trim()) errors.push('Restaurant social links require an id.');
    if (socialIds.has(social.id)) errors.push(`Duplicate restaurant social id: ${social.id}.`);
    socialIds.add(social.id);
    if (!social.platform?.trim()) errors.push(`Restaurant social links require a platform: ${social.id}.`);
    if (!social.url?.trim()) errors.push(`Restaurant social links require a URL: ${social.id}.`);
    else {
      try {
        const url = new URL(social.url);
        if (!['http:', 'https:'].includes(url.protocol)) errors.push(`Restaurant social URL must use HTTP or HTTPS: ${social.id}.`);
      } catch {
        errors.push(`Invalid restaurant social URL: ${social.id}.`);
      }
    }
    if (!Number.isInteger(social.sortOrder) || social.sortOrder < 0) errors.push(`Invalid social ordering: ${social.id}.`);
    if (!social.label?.fr || !social.label?.en || !social.label?.ar) errors.push(`Restaurant social labels require FR, EN, and AR values: ${social.id}.`);
  });
  const orderingIds = new Set<string>();
  profile?.orderingChannels?.forEach((channel) => {
    if (!channel.id?.trim()) errors.push('Ordering channels require an id.');
    if (orderingIds.has(channel.id)) errors.push(`Duplicate ordering channel id: ${channel.id}.`);
    orderingIds.add(channel.id);
    if (!channel.type?.trim()) errors.push(`Ordering channel type is required: ${channel.id}.`);
    if (!channel.name?.fr || !channel.name?.en || !channel.name?.ar) errors.push(`Ordering channel names require FR, EN, and AR values: ${channel.id}.`);
    if (!channel.url?.trim()) errors.push(`Ordering channel requires a URL: ${channel.id}.`);
    else {
      try {
        const url = new URL(channel.url);
        if (!['http:', 'https:'].includes(url.protocol)) errors.push(`Ordering channel URL must use HTTP or HTTPS: ${channel.id}.`);
      } catch {
        errors.push(`Invalid ordering channel URL: ${channel.id}.`);
      }
    }
    if (!Number.isInteger(channel.sortOrder) || channel.sortOrder < 0) errors.push(`Invalid ordering channel order: ${channel.id}.`);
  });
  if (errors.length) throw new RestaurantProfilePersistenceError('invalid-persisted-profile', `Invalid ${source} restaurant profile: ${errors.join(' ')}`);
  return clone(profile);
}

async function enqueue<T>(filePath: string, action: () => Promise<T>): Promise<T> {
  const previous = operationQueues.get(filePath) ?? Promise.resolve();
  const current = previous.catch(() => undefined).then(action);
  operationQueues.set(filePath, current);
  try {
    return await current;
  } finally {
    if (operationQueues.get(filePath) === current) operationQueues.delete(filePath);
  }
}

export class FileRestaurantProfileRepository implements RestaurantProfileRepository {
  constructor(private readonly filePath: string = defaultProfileStatePath) {}

  async getProfile(): Promise<RestaurantProfile> {
    try {
      const persisted = await readFile(this.filePath, 'utf8');
      return validateProfile(migratePersistedProfile(JSON.parse(persisted)), 'persisted');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        if (error instanceof RestaurantProfilePersistenceError) throw error;
        throw new RestaurantProfilePersistenceError('read-failed', `The restaurant profile could not be read from ${this.filePath}.`);
      }
      const seed = validateProfile(restaurantProfile, 'seed');
      await this.replaceProfile(seed);
      return seed;
    }
  }

  async replaceProfile(profile: RestaurantProfile): Promise<void> {
    const nextProfile = validateProfile(profile, 'replacement');
    await enqueue(this.filePath, async () => {
      const temporaryPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
      const backupPath = `${this.filePath}.${process.pid}.${Date.now()}.bak`;
      let movedPrevious = false;
      try {
        await mkdir(path.dirname(this.filePath), { recursive: true });
        await writeFile(temporaryPath, JSON.stringify(nextProfile, null, 2), 'utf8');
        try {
          await rename(this.filePath, backupPath);
          movedPrevious = true;
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        }
        await rename(temporaryPath, this.filePath);
        if (movedPrevious) await unlink(backupPath);
      } catch {
        await unlink(temporaryPath).catch(() => undefined);
        if (movedPrevious) {
          await unlink(this.filePath).catch(() => undefined);
          await rename(backupPath, this.filePath).catch(() => undefined);
        }
        throw new RestaurantProfilePersistenceError('write-failed', `The restaurant profile could not be persisted to ${this.filePath}.`);
      }
    });
  }
}

export function createPersistentRestaurantProfileRepository(filePath = defaultProfileStatePath): FileRestaurantProfileRepository {
  return new FileRestaurantProfileRepository(filePath);
}

export function createRestaurantProfileRepository(filePath?: string): RestaurantProfileRepository {
  if (getApplicationDataProvider() === 'supabase') return createSupabaseRestaurantProfileRepository();
  return createPersistentRestaurantProfileRepository(filePath);
}
