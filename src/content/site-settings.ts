import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getApplicationDataProvider } from './application-provider';
import { createSupabaseDatabaseClient, type SupabaseDatabaseClient } from './supabase-database';
import type { LocalizedText } from './models';

export type HomepageContent = {
  heroEyebrow: LocalizedText;
  heroStatement: LocalizedText;
  identityEyebrow: LocalizedText;
  identityTitle: LocalizedText;
};

export type SiteSettings = {
  publicWebsiteEnabled: boolean;
  maintenanceMode: boolean;
  homepageContent: HomepageContent;
};

export const publicWebsiteEnabledSettingKey = 'site_public_website_enabled';
export const maintenanceModeSettingKey = 'site_maintenance_mode';
export const homepageContentSettingKey = 'homepage_content';

export const defaultHomepageContent: HomepageContent = {
  heroEyebrow: { fr: 'Cuisine vietnamienne · Casablanca', en: 'Vietnamese cuisine · Casablanca', ar: 'مطبخ فيتنامي · الدار البيضاء' },
  heroStatement: { fr: 'Une cuisine vietnamienne et asiatique à Casablanca.', en: 'Vietnamese and Asian cuisine in Casablanca.', ar: 'مطبخ فيتنامي وآسيوي في الدار البيضاء.' },
  identityEyebrow: { fr: 'L’expérience Viet Garden', en: 'The Viet Garden experience', ar: 'تجربة فييت غاردن' },
  identityTitle: { fr: 'Une table vietnamienne à Casablanca', en: 'A Vietnamese table in Casablanca', ar: 'مائدة فيتنامية في الدار البيضاء' },
};

export const defaultSiteSettings: SiteSettings = {
  publicWebsiteEnabled: true,
  maintenanceMode: false,
  homepageContent: defaultHomepageContent,
};

export interface SiteSettingsRepository {
  getSettings(): Promise<SiteSettings>;
  updateSettings(patch: Partial<SiteSettings>): Promise<SiteSettings>;
}

export class SiteSettingsValidationError extends Error {
  constructor(message: string, public readonly fields: Array<{ path: string; message: string }> = []) {
    super(message);
    this.name = 'SiteSettingsValidationError';
  }
}

export class SiteSettingsPersistenceError extends Error {
  constructor(code: 'read-failed' | 'write-failed' | 'invalid-persisted-settings', message: string) {
    super(message);
    this.name = 'SiteSettingsPersistenceError';
    this.code = code;
  }

  readonly code: 'read-failed' | 'write-failed' | 'invalid-persisted-settings';
}

const defaultSettingsPath = process.env.VIET_GARDEN_SITE_SETTINGS_PATH
  ?? path.join(process.env.LOCALAPPDATA ?? process.env.XDG_DATA_HOME ?? process.cwd(), 'Viet Garden Restaurant & Coffee', 'site-settings.json');

function normalizeSettings(value: Partial<SiteSettings> | undefined): SiteSettings {
  const candidate = { ...defaultSiteSettings, ...(value ?? {}) };

  if (typeof candidate.publicWebsiteEnabled !== 'boolean') {
    throw new SiteSettingsValidationError('The public website enabled flag must be a boolean value.');
  }

  if (typeof candidate.maintenanceMode !== 'boolean') {
    throw new SiteSettingsValidationError('The maintenance mode flag must be a boolean value.');
  }

  if (candidate.maintenanceMode && !candidate.publicWebsiteEnabled) {
    throw new SiteSettingsValidationError('Maintenance mode requires the public website to remain enabled.');
  }

  const homepageContent = { ...defaultHomepageContent, ...(candidate.homepageContent ?? {}) } as HomepageContent;
  const homepageFields = ['heroEyebrow', 'heroStatement', 'identityEyebrow', 'identityTitle'] as const;
  for (const field of homepageFields) {
    const localized = homepageContent?.[field];
    if (!localized || typeof localized !== 'object') {
      throw new SiteSettingsValidationError(`Homepage content field ${field} requires FR, EN, and AR values.`, [{ path: `homepageContent.${field}`, message: 'Enter FR, EN, and AR values.' }]);
    }
    const missing = (['fr', 'en', 'ar'] as const).filter((locale) => !localized[locale]?.trim());
    if (missing.length) {
      throw new SiteSettingsValidationError(`Homepage content field ${field} requires FR, EN, and AR values.`, missing.map((locale) => ({ path: `homepageContent.${field}.${locale}`, message: `${locale.toUpperCase()} value is required.` })));
    }
  }

  return {
    publicWebsiteEnabled: candidate.publicWebsiteEnabled,
    maintenanceMode: candidate.maintenanceMode,
    homepageContent: structuredClone(homepageContent),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function readPersistedSettings(raw: unknown): SiteSettings {
  if (!isRecord(raw)) throw new SiteSettingsPersistenceError('invalid-persisted-settings', 'Persisted site settings must be an object.');

  const publicWebsiteEnabled = typeof raw.publicWebsiteEnabled === 'boolean' ? raw.publicWebsiteEnabled : undefined;
  const maintenanceMode = typeof raw.maintenanceMode === 'boolean' ? raw.maintenanceMode : undefined;
  const homepageContent = isRecord(raw.homepageContent) ? raw.homepageContent as HomepageContent : undefined;

  return normalizeSettings({
    publicWebsiteEnabled,
    maintenanceMode,
    homepageContent,
  });
}

export class FileSiteSettingsRepository implements SiteSettingsRepository {
  constructor(private readonly filePath: string = defaultSettingsPath) {}

  async getSettings(): Promise<SiteSettings> {
    try {
      const persisted = await readFile(this.filePath, 'utf8');
      return readPersistedSettings(JSON.parse(persisted));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        if (error instanceof SiteSettingsValidationError || error instanceof SiteSettingsPersistenceError) throw error;
        throw new SiteSettingsPersistenceError('read-failed', `The site settings could not be read from ${this.filePath}.`);
      }

      const next = normalizeSettings(defaultSiteSettings);
      await this.write(next);
      return next;
    }
  }

  async updateSettings(patch: Partial<SiteSettings>): Promise<SiteSettings> {
    const current = await this.getSettings();
    const next = normalizeSettings({ ...current, ...patch });
    await this.write(next);
    return next;
  }

  private async write(settings: SiteSettings): Promise<void> {
    const temporaryPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    await mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      await writeFile(temporaryPath, JSON.stringify(settings, null, 2), 'utf8');
      await rename(temporaryPath, this.filePath);
    } catch (error) {
      await unlink(temporaryPath).catch(() => undefined);
      throw new SiteSettingsPersistenceError('write-failed', `The site settings could not be persisted to ${this.filePath}.`);
    }
  }
}

type SiteSettingRow = { key: string; value: string };

export class SupabaseSiteSettingsRepository implements SiteSettingsRepository {
  constructor(private readonly database: SupabaseDatabaseClient = createSupabaseDatabaseClient()) {}

  async getSettings(): Promise<SiteSettings> {
    const rows = await this.database.select<SiteSettingRow>('site_settings', `select=key,value&key=in.(${encodeURIComponent(publicWebsiteEnabledSettingKey)},${encodeURIComponent(maintenanceModeSettingKey)},${encodeURIComponent(homepageContentSettingKey)})`);
    const state = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    let homepageContent: HomepageContent | undefined;
    if (state[homepageContentSettingKey]) {
      try { homepageContent = JSON.parse(state[homepageContentSettingKey]) as HomepageContent; } catch { throw new SiteSettingsPersistenceError('invalid-persisted-settings', 'Persisted homepage content is invalid.'); }
    }
    return normalizeSettings({
      publicWebsiteEnabled: state[publicWebsiteEnabledSettingKey] === 'true' ? true : state[publicWebsiteEnabledSettingKey] === 'false' ? false : undefined,
      maintenanceMode: state[maintenanceModeSettingKey] === 'true' ? true : state[maintenanceModeSettingKey] === 'false' ? false : undefined,
      homepageContent,
    });
  }

  async updateSettings(patch: Partial<SiteSettings>): Promise<SiteSettings> {
    const current = await this.getSettings();
    const next = normalizeSettings({ ...current, ...patch });
    await this.database.upsert<SiteSettingRow>('site_settings', [
      { key: publicWebsiteEnabledSettingKey, value: String(next.publicWebsiteEnabled) },
      { key: maintenanceModeSettingKey, value: String(next.maintenanceMode) },
      { key: homepageContentSettingKey, value: JSON.stringify(next.homepageContent) },
    ], 'key');
    return next;
  }
}

export function createSiteSettingsRepository(): SiteSettingsRepository {
  return getApplicationDataProvider() === 'supabase'
    ? new SupabaseSiteSettingsRepository()
    : new FileSiteSettingsRepository();
}

export class SiteSettingsService {
  constructor(private readonly repository: SiteSettingsRepository) {}

  async getSettings(): Promise<SiteSettings> {
    return this.repository.getSettings();
  }

  async updateSettings(patch: Partial<SiteSettings>): Promise<SiteSettings> {
    const next = normalizeSettings({ ...(await this.repository.getSettings()), ...patch });
    return this.repository.updateSettings(next);
  }
}
