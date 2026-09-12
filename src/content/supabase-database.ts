export type SupabaseDatabaseConfig = {
  projectUrl: string;
  serviceRoleKey: string;
};

export type SupabaseDatabaseClient = {
  select<T>(table: string, query?: string): Promise<T[]>;
  insert<T>(table: string, rows: unknown[]): Promise<T[]>;
  upsert<T>(table: string, rows: unknown[], onConflict: string): Promise<T[]>;
  update<T>(table: string, query: string, patch: unknown): Promise<T[]>;
  remove<T>(table: string, query: string): Promise<T[]>;
  rpc<T>(functionName: string, body: unknown): Promise<T>;
};

type SupabaseResponse = {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
};

export type SupabaseDatabaseHttpClient = {
  request(input: RequestInfo | URL, init?: RequestInit): Promise<SupabaseResponse>;
};

export function getSupabaseDatabaseConfig(): SupabaseDatabaseConfig {
  const projectUrl = process.env.SUPABASE_URL ?? process.env.SUPABASE_PROJECT_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!projectUrl || !serviceRoleKey) throw new Error('Supabase database requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  let normalizedUrl: URL;
  try {
    normalizedUrl = new URL(projectUrl);
  } catch {
    throw new Error('SUPABASE_URL must be a valid URL.');
  }
  if (normalizedUrl.protocol !== 'https:') throw new Error('SUPABASE_URL must use HTTPS.');
  return { projectUrl: normalizedUrl.toString().replace(/\/$/, ''), serviceRoleKey };
}

function defaultClient(): SupabaseDatabaseHttpClient {
  return { request: (input, init) => fetch(input, init) };
}

export class SupabaseRestDatabaseClient implements SupabaseDatabaseClient {
  private readonly config: SupabaseDatabaseConfig;
  private readonly client: SupabaseDatabaseHttpClient;

  constructor(config: SupabaseDatabaseConfig = getSupabaseDatabaseConfig(), client: SupabaseDatabaseHttpClient = defaultClient()) {
    this.config = config;
    this.client = client;
  }

  async select<T>(table: string, query = 'select=*'): Promise<T[]> {
    return this.request<T[]>(`/rest/v1/${encodeURIComponent(table)}?${query}`, { headers: this.headers() });
  }

  async insert<T>(table: string, rows: unknown[]): Promise<T[]> {
    return this.request<T[]>(`/rest/v1/${encodeURIComponent(table)}`, {
      method: 'POST',
      headers: this.headers({ Prefer: 'return=representation' }),
      body: JSON.stringify(rows),
    });
  }

  async upsert<T>(table: string, rows: unknown[], onConflict: string): Promise<T[]> {
    return this.request<T[]>(`/rest/v1/${encodeURIComponent(table)}?on_conflict=${encodeURIComponent(onConflict)}`, {
      method: 'POST',
      headers: this.headers({ Prefer: 'resolution=merge-duplicates,return=representation' }),
      body: JSON.stringify(rows),
    });
  }

  async update<T>(table: string, query: string, patch: unknown): Promise<T[]> {
    return this.request<T[]>(`/rest/v1/${encodeURIComponent(table)}?${query}`, {
      method: 'PATCH',
      headers: this.headers({ Prefer: 'return=representation' }),
      body: JSON.stringify(patch),
    });
  }

  async remove<T>(table: string, query: string): Promise<T[]> {
    return this.request<T[]>(`/rest/v1/${encodeURIComponent(table)}?${query}`, {
      method: 'DELETE',
      headers: this.headers({ Prefer: 'return=representation' }),
    });
  }

  async rpc<T>(functionName: string, body: unknown): Promise<T> {
    return this.request<T>(`/rest/v1/rpc/${encodeURIComponent(functionName)}`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const response = await this.client.request(`${this.config.projectUrl}${path}`, init);
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Supabase database request failed with status ${response.status}: ${detail}`);
    }
    const body = await response.text();
    return (body ? JSON.parse(body) : undefined) as T;
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return { apikey: this.config.serviceRoleKey, Authorization: `Bearer ${this.config.serviceRoleKey}`, 'Content-Type': 'application/json', ...extra };
  }
}

export function createSupabaseDatabaseClient(): SupabaseDatabaseClient {
  return new SupabaseRestDatabaseClient();
}
