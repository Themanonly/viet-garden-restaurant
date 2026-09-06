import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { menuDocument, type MenuDocument } from './menu';
import { validateMenuDocument } from './menu-validation';

export interface MenuPersistenceRepository {
  getMenu(): Promise<MenuDocument>;
  replaceMenu(menu: MenuDocument): Promise<void>;
}

export class MenuPersistenceError extends Error {
  constructor(public readonly code: 'read-failed' | 'write-failed' | 'invalid-persisted-menu', message: string) {
    super(message);
    this.name = 'MenuPersistenceError';
  }
}

const defaultMenuStatePath = process.env.VIET_GARDEN_MENU_STATE_PATH
  ?? path.join(process.env.LOCALAPPDATA ?? process.env.XDG_DATA_HOME ?? process.cwd(), 'Viet Garden Restaurant & Coffee', 'menu-state.json');
const operationQueues = new Map<string, Promise<unknown>>();
const lockedPaths = new Set<string>();

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function validate(menu: MenuDocument, source: string): MenuDocument {
  const result = validateMenuDocument(menu);
  if (!result.valid) {
    throw new MenuPersistenceError('invalid-persisted-menu', `Invalid ${source} menu state: ${result.errors.join(' ')}`);
  }
  return clone(menu);
}

async function enqueue<T>(filePath: string, action: () => Promise<T>): Promise<T> {
  const previous = operationQueues.get(filePath) ?? Promise.resolve();
  const current = previous.catch(() => undefined).then(action);
  operationQueues.set(filePath, current);
  try {
    await current;
    return await current;
  } finally {
    if (operationQueues.get(filePath) === current) operationQueues.delete(filePath);
  }
}

export class FileMenuPersistenceRepository implements MenuPersistenceRepository {
  constructor(private readonly filePath: string = defaultMenuStatePath) {}

  async runExclusive<T>(action: () => Promise<T>): Promise<T> {
    return enqueue(this.filePath, async () => {
      lockedPaths.add(this.filePath);
      try {
        return await action();
      } finally {
        lockedPaths.delete(this.filePath);
      }
    });
  }

  async getMenu(): Promise<MenuDocument> {
    try {
      const persisted = await readFile(this.filePath, 'utf8');
      return validate(JSON.parse(persisted) as MenuDocument, 'persisted');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        if (error instanceof MenuPersistenceError) throw error;
        throw new MenuPersistenceError('read-failed', `The current menu state could not be read from ${this.filePath}.`);
      }

      const seed = validate(menuDocument, 'seed');
      await this.replaceMenu(seed);
      return seed;
    }
  }

  async replaceMenu(menu: MenuDocument): Promise<void> {
    const nextMenu = validate(menu, 'replacement');
    const temporaryPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    const backupPath = `${this.filePath}.${process.pid}.${Date.now()}.bak`;
    const write = async () => {
      let movedPrevious = false;
      try {
        await mkdir(path.dirname(this.filePath), { recursive: true });
        await writeFile(temporaryPath, JSON.stringify(nextMenu, null, 2), 'utf8');
        try {
          await rename(this.filePath, backupPath);
          movedPrevious = true;
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        }
        await rename(temporaryPath, this.filePath);
        if (movedPrevious) await unlink(backupPath);
      } catch (error) {
        await unlink(temporaryPath).catch(() => undefined);
        if (movedPrevious) {
          await unlink(this.filePath).catch(() => undefined);
          await rename(backupPath, this.filePath).catch(() => undefined);
        }
        throw new MenuPersistenceError('write-failed', `The current menu state could not be persisted to ${this.filePath}.`);
      }
    };
    if (lockedPaths.has(this.filePath)) await write();
    else await enqueue(this.filePath, write);
  }
}

export function createPersistentMenuRepository(filePath = defaultMenuStatePath): FileMenuPersistenceRepository {
  return new FileMenuPersistenceRepository(filePath);
}