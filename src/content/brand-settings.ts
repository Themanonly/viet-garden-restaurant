import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getApplicationDataProvider } from './application-provider';
import { createSupabaseDatabaseClient, type SupabaseDatabaseClient } from './supabase-database';

export const canonicalBrandLogoSetting = 'brand_logo_media_id';
export const defaultBrandLogoMediaId = 'brand-logo';

type BrandSettingsState = { brandLogoMediaId: string };

export interface BrandSettingsRepository {
  getBrandLogoMediaId(): Promise<string>;
  setBrandLogoMediaId(mediaId: string): Promise<string>;
}

const defaultSettingsPath = process.env.VIET_GARDEN_BRAND_SETTINGS_PATH
  ?? path.join(process.env.LOCALAPPDATA ?? process.env.XDG_DATA_HOME ?? process.cwd(), 'Viet Garden Restaurant & Coffee', 'brand-settings.json');

export class FileBrandSettingsRepository implements BrandSettingsRepository {
  constructor(private readonly filePath: string = defaultSettingsPath) {}

  async getBrandLogoMediaId(): Promise<string> {
    try {
      const state = JSON.parse(await readFile(this.filePath, 'utf8')) as Partial<BrandSettingsState>;
      return state.brandLogoMediaId?.trim() || defaultBrandLogoMediaId;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      await this.write({ brandLogoMediaId: defaultBrandLogoMediaId });
      return defaultBrandLogoMediaId;
    }
  }

  async setBrandLogoMediaId(mediaId: string): Promise<string> {
    if (!mediaId.trim()) throw new Error('The canonical brand logo requires a media ID.');
    await this.write({ brandLogoMediaId: mediaId.trim() });
    return mediaId.trim();
  }

  private async write(state: BrandSettingsState): Promise<void> {
    const temporaryPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    await mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      await writeFile(temporaryPath, JSON.stringify(state, null, 2), 'utf8');
      await rename(temporaryPath, this.filePath);
    } catch (error) {
      await unlink(temporaryPath).catch(() => undefined);
      throw error;
    }
  }
}

type BrandSettingRow = { key: string; value: string };

export class SupabaseBrandSettingsRepository implements BrandSettingsRepository {
  constructor(private readonly database: SupabaseDatabaseClient = createSupabaseDatabaseClient()) {}

  async getBrandLogoMediaId(): Promise<string> {
    const rows = await this.database.select<BrandSettingRow>('site_settings', `select=key,value&key=eq.${encodeURIComponent(canonicalBrandLogoSetting)}`);
    return rows[0]?.value?.trim() || defaultBrandLogoMediaId;
  }

  async setBrandLogoMediaId(mediaId: string): Promise<string> {
    if (!mediaId.trim()) throw new Error('The canonical brand logo requires a media ID.');
    await this.database.upsert<BrandSettingRow>('site_settings', [{ key: canonicalBrandLogoSetting, value: mediaId.trim() }], 'key');
    return mediaId.trim();
  }
}

export function createBrandSettingsRepository(): BrandSettingsRepository {
  return getApplicationDataProvider() === 'supabase'
    ? new SupabaseBrandSettingsRepository()
    : new FileBrandSettingsRepository();
}
