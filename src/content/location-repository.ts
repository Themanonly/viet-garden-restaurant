import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getApplicationDataProvider } from './application-provider';
import { LocationValidationError, validateLocationCollection, type Location, type LocationStoreState } from './location';
import { createSupabaseLocationRepository } from './supabase-location-repository';

export interface LocationRepository {
  getState(): Promise<LocationStoreState>;
  listLocations(): Promise<Location[]>;
  replaceLocations(locations: Location[]): Promise<void>;
  ensureSeeded(): Promise<Location[]>;
}

export type LocationRepositoryOptions = {
  filePath?: string;
  seed?: Location;
};

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

function validateStoredLocations(locations: Location[]): Location[] {
  const byProfile = new Map<string, Location[]>();
  locations.forEach((location) => {
    const profileLocations = byProfile.get(location.profileId) ?? [];
    profileLocations.push(location);
    byProfile.set(location.profileId, profileLocations);
  });
  return [...byProfile.values()].flatMap((profileLocations) => validateLocationCollection(profileLocations));
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
  constructor(
    private readonly filePath: string = defaultLocationStatePath,
    private readonly profileId: string,
    private readonly seed?: Location,
  ) {
    if (!profileId.trim()) throw new Error('A profile ID is required for Location persistence.');
    if (seed && seed.profileId !== profileId) throw new Error('Location seed must belong to the active profile.');
  }

  async getState(): Promise<LocationStoreState> {
    try {
      const persisted = JSON.parse(await readFile(this.filePath, 'utf8')) as Partial<PersistedLocationState>;
      if (persisted.initialized !== true || !Array.isArray(persisted.locations)) throw new LocationPersistenceError('invalid-persisted-locations', 'Persisted location state is invalid.');
      return { initialized: true, locations: clone(validateStoredLocations(persisted.locations).filter((location) => location.profileId === this.profileId)) };
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
      if (state.initialized && state.locations.length > 0) return clone(state.locations);
      if (!this.seed) return [];
      const current = await this.readAllLocations();
      const locations = validateStoredLocations([...current, this.seed]);
      await this.writeState(locations);
      return clone([this.seed]);
    });
  }

  async replaceLocations(locations: Location[]): Promise<void> {
    if (locations.some((location) => location.profileId !== this.profileId)) throw new LocationPersistenceError('invalid-persisted-locations', 'Replacement locations must belong to the active profile.');
    const nextLocations = validateLocationCollection(locations);
    await enqueue(this.filePath, async () => {
      const current = await this.readAllLocations();
      await this.writeState([...current.filter((location) => location.profileId !== this.profileId), ...nextLocations]);
    });
  }

  private async readAllLocations(): Promise<Location[]> {
    try {
      const persisted = JSON.parse(await readFile(this.filePath, 'utf8')) as Partial<PersistedLocationState>;
      if (persisted.initialized !== true || !Array.isArray(persisted.locations)) throw new LocationPersistenceError('invalid-persisted-locations', 'Persisted location state is invalid.');
      return validateStoredLocations(persisted.locations);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      if (error instanceof LocationPersistenceError) throw error;
      if (error instanceof LocationValidationError) throw new LocationPersistenceError('invalid-persisted-locations', error.message);
      throw new LocationPersistenceError('read-failed', `Locations could not be read from ${this.filePath}.`);
    }
  }

  private async writeState(locations: Location[]): Promise<void> {
    const directory = path.dirname(this.filePath);
    const temporaryPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    const backupPath = `${this.filePath}.${process.pid}.${Date.now()}.bak`;
    let movedPrevious = false;
    try {
      await mkdir(directory, { recursive: true });
      const state: PersistedLocationState = { initialized: true, locations: clone(validateStoredLocations(locations)) };
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

export function createLocationRepository(profileId: string, options: LocationRepositoryOptions = {}): LocationRepository {
  if (!profileId.trim()) throw new Error('A profile ID is required for Location persistence.');
  if (getApplicationDataProvider() === 'supabase') return createSupabaseLocationRepository(profileId);
  return new FileLocationRepository(options.filePath, profileId, options.seed);
}
