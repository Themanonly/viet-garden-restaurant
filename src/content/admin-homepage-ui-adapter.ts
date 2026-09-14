import { AdminApplicationError, type AdminErrorInfo } from './admin-menu-service';
import { createSiteSettingsRepository, SiteSettingsService, SiteSettingsValidationError, type HomepageContent, type HomepageVisuals } from './site-settings';

export type AdminHomepageContentDto = HomepageContent;
export type AdminHomepageVisualsDto = HomepageVisuals;

function clone<T>(value: T): T { return structuredClone(value); }

function toAdminError(error: unknown): AdminApplicationError {
  if (error instanceof AdminApplicationError) return error;
  const fields = error instanceof SiteSettingsValidationError ? error.fields.map((field) => ({ ...field, code: 'required' })) : undefined;
  const info: AdminErrorInfo = { code: 'homepage-validation-failed', message: error instanceof Error ? error.message : 'Homepage settings could not be saved.', resource: 'homepage', fields };
  return new AdminApplicationError(info);
}

export class AdminHomepageUiAdapter {
  private readonly service = new SiteSettingsService(createSiteSettingsRepository());

  async getHomepageContent(): Promise<AdminHomepageContentDto> {
    try { return clone((await this.service.getSettings()).homepageContent); } catch (error) { throw toAdminError(error); }
  }

  async updateHomepageContent(content: HomepageContent): Promise<AdminHomepageContentDto> {
    try { return clone((await this.service.updateSettings({ homepageContent: clone(content) })).homepageContent); } catch (error) { throw toAdminError(error); }
  }

  async getHomepageVisuals(): Promise<AdminHomepageVisualsDto> {
    try { return clone((await this.service.getSettings()).homepageVisuals); } catch (error) { throw toAdminError(error); }
  }

  async updateHomepageVisuals(visuals: HomepageVisuals): Promise<AdminHomepageVisualsDto> {
    try { return clone((await this.service.updateSettings({ homepageVisuals: clone(visuals) })).homepageVisuals); } catch (error) { throw toAdminError(error); }
  }
}
