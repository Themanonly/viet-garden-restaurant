import assert from 'node:assert/strict';
import test from 'node:test';
import { getApplicationDataProvider } from './application-provider';
import { createMenuRepository } from './menu-repository';
import { SupabaseMenuRepository } from './supabase-menu-repository';

const environmentKeys = ['NODE_ENV', 'VIET_GARDEN_DATA_PROVIDER', 'VIET_GARDEN_MEDIA_STORAGE_PROVIDER', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_STORAGE_BUCKET'] as const;
const environment = process.env as Record<string, string | undefined>;

test('development defaults to the JSON provider', () => {
  const previous = Object.fromEntries(environmentKeys.map((key) => [key, environment[key]]));
  try {
    environment.NODE_ENV = 'test';
    delete environment.VIET_GARDEN_DATA_PROVIDER;
    assert.equal(getApplicationDataProvider(), 'local');
    assert.equal(createMenuRepository().constructor.name, 'LocalMenuRepository');
  } finally {
    environmentKeys.forEach((key) => {
      if (previous[key] === undefined) delete environment[key];
      else environment[key] = previous[key];
    });
  }
});

test('Supabase provider requires complete server-only configuration and selects the database repository', () => {
  const previous = Object.fromEntries(environmentKeys.map((key) => [key, environment[key]]));
  try {
    environment.NODE_ENV = 'test';
    environment.VIET_GARDEN_DATA_PROVIDER = 'supabase';
    environment.VIET_GARDEN_MEDIA_STORAGE_PROVIDER = 'object';
    environment.SUPABASE_URL = 'https://example.supabase.co';
    environment.SUPABASE_SERVICE_ROLE_KEY = 'server-only-test-key';
    environment.SUPABASE_STORAGE_BUCKET = 'viet-garden-media';
    assert.equal(getApplicationDataProvider(), 'supabase');
    assert.equal(createMenuRepository() instanceof SupabaseMenuRepository, true);
  } finally {
    environmentKeys.forEach((key) => {
      if (previous[key] === undefined) delete environment[key];
      else environment[key] = previous[key];
    });
  }
});

test('production configuration fails explicitly instead of falling back to JSON', () => {
  const previous = Object.fromEntries(environmentKeys.map((key) => [key, environment[key]]));
  try {
    environment.NODE_ENV = 'production';
    delete environment.VIET_GARDEN_DATA_PROVIDER;
    assert.throws(() => getApplicationDataProvider(), /Production requires VIET_GARDEN_DATA_PROVIDER=supabase/);
  } finally {
    environmentKeys.forEach((key) => {
      if (previous[key] === undefined) delete environment[key];
      else environment[key] = previous[key];
    });
  }
});
