import { AdminApplicationError, type AdminErrorInfo } from './admin-menu-service';
import { createSiteSettingsRepository, SiteSettingsService, type HomepageContent } from './site-settings';

export type AdminHomepageContentDto = HomepageContent;

function clone<T>(value: T): T { return structuredClone(value); }

function toAdminError(error: unknown): AdminApplicationError {
  if (error instanceof AdminApplicationError) return error;
  const fields = error instanceof Error && error.message.startsWith('Homepage content field')
    ? [{ code: 'required', message: error.message, path: 'homepageContent' }]
    : undefined;
  const info: AdminErrorInfo = { code: 'homepage-validation-failed', message: error instanceof Error ? error.message : 'Homepage content could not be saved.', resource: 'homepage', fields };
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
}
