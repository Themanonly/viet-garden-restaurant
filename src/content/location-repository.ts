import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { restaurantProfile } from './restaurant';
import { getApplicationDataProvider } from './application-provider';
import { LocationValidationError, seedLocationFromProfile, validateLocationCollection, type Location, type LocationStoreState } from './location';
import { createSupabaseLocationRepository } from './supabase-location-repository';

export interface LocationRepository {
  getState(): Promise<LocationStoreState>;
  listLocations(): Promise<Location[]>;
  replaceLocations(locations: Location[]): Promise<void>;
  ensureSeeded(): Promise<Location[]>;
}

export class LocationPersistenceError extends Error {
  constructor(public readonly code: 'read-failed' | 'write-failed' | 'invalid-persisted-locations', message: string) {
    super(message);
    this.name = 'LocationPersistenceError';
  }
}

interface PersistedLocationState {
  initialized: true;
  locations: Location[];
}

const defaultLocationStatePath = process.env.VIET_GARDEN_LOCATION_STATE_PATH
  ?? path.join(process.env.LOCALAPPDATA ?? process.env.XDG_DATA_HOME ?? process.cwd(), 'Viet Garden Restaurant & Coffee', 'locations.json');
const operationQueues = new Map<string, Promise<unknown>>();

function clone<T>(value: T): T {
  return structuredClone(value);
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

export class FileLocationRepository implements LocationRepository {
  constructor(private readonly filePath: string = defaultLocationStatePath) {}

  async getState(): Promise<LocationStoreState> {
    try {
      const persisted = JSON.parse(await readFile(this.filePath, 'utf8')) as Partial<PersistedLocationState>;
      if (persisted.initialized !== true || !Array.isArray(persisted.locations)) throw new LocationPersistenceError('invalid-persisted-locations', 'Persisted location state is invalid.');
      return { initialized: true, locations: clone(validateLocationCollection(persisted.locations)) };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { initialized: false, locations: [] };
      if (error instanceof LocationPersistenceError) throw error;
      if (error instanceof LocationValidationError) throw new LocationPersistenceError('invalid-persisted-locations', error.message);
      throw new LocationPersistenceError('read-failed', `Locations could not be read from ${this.filePath}.`);
    }
  }

  async listLocations(): Promise<Location[]> {
    const state = await this.getState();
    if (!state.initialized) return this.ensureSeeded();
    return clone(state.locations);
  }

  async ensureSeeded(): Promise<Location[]> {
    return enqueue(this.filePath, async () => {
      const state = await this.getState();
      if (state.initialized) return clone(state.locations);
      const locations = validateLocationCollection([seedLocationFromProfile(restaurantProfile)]);
      await this.writeState(locations);
      return clone(locations);
    });
  }

  async replaceLocations(locations: Location[]): Promise<void> {
    const nextLocations = validateLocationCollection(locations);
    await enqueue(this.filePath, () => this.writeState(nextLocations));
  }

  private async writeState(locations: Location[]): Promise<void> {
    const directory = path.dirname(this.filePath);
    const temporaryPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    const backupPath = `${this.filePath}.${process.pid}.${Date.now()}.bak`;
    let movedPrevious = false;
    try {
      await mkdir(directory, { recursive: true });
      const state: PersistedLocationState = { initialized: true, locations: clone(validateLocationCollection(locations)) };
      await writeFile(temporaryPath, JSON.stringify(state, null, 2), 'utf8');
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
      throw new LocationPersistenceError('write-failed', `Locations could not be persisted to ${this.filePath}.`);
    }
  }
}

export function createLocationRepository(filePath?: string): LocationRepository {
  if (getApplicationDataProvider() === 'supabase') return createSupabaseLocationRepository();
  return new FileLocationRepository(filePath);
}
