import type { AdminActionResult } from './admin-menu-actions';
import type { AdminUiError } from './admin-menu-ui-adapter';

export function unwrapAdminAction<T>(result: AdminActionResult<T>): T {
  if (result.ok) return result.value;
  const error = new Error(result.error.message) as AdminUiError;
  Object.assign(error, { info: result.error });
  return (() => { throw error; })();
}