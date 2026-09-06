import { getSupabaseDatabaseConfig } from './supabase-database';

export type ApplicationDataProvider = 'local' | 'supabase';

export function getApplicationDataProvider(): ApplicationDataProvider {
  const configured = process.env.VIET_GARDEN_DATA_PROVIDER?.toLowerCase();
  if (configured === 'supabase') {
    getSupabaseDatabaseConfig();
    if (!process.env.SUPABASE_STORAGE_BUCKET) throw new Error('Supabase production data provider requires SUPABASE_STORAGE_BUCKET.');
    if (process.env.VIET_GARDEN_MEDIA_STORAGE_PROVIDER !== 'object') throw new Error('Supabase data provider requires VIET_GARDEN_MEDIA_STORAGE_PROVIDER=object.');
    return 'supabase';
  }
  if (configured === 'local' || (!configured && process.env.NODE_ENV !== 'production')) return 'local';
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Production requires VIET_GARDEN_DATA_PROVIDER=supabase with valid Supabase configuration.');
  }
  throw new Error(`Unsupported application data provider: ${configured}.`);
}

export function isSupabaseApplicationProvider(): boolean {
  return getApplicationDataProvider() === 'supabase';
}
