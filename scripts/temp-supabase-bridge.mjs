import { createServer } from 'node:http';
import { spawn } from 'node:child_process';

let child;
let phase = 'idle';
let lastError = '';
const server = createServer((request, response) => {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (request.method === 'OPTIONS') {
    response.writeHead(204);
    response.end();
    return;
  }
  if (request.method === 'GET' && request.url === '/health') {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ started: Boolean(child), alive: Boolean(child && !child.killed), phase, lastError }));
    return;
  }
  if (request.method !== 'POST' || request.url !== '/configure') {
    response.writeHead(404);
    response.end();
    return;
  }
  let body = '';
  request.on('data', (chunk) => { body += chunk; });
  request.on('end', () => {
    try {
      const { key, adminUserIds } = JSON.parse(body);
      if (typeof key !== 'string' || !key) throw new Error('missing key');
      child?.kill();
      const environment = {
          ...process.env,
          VIET_GARDEN_DATA_PROVIDER: 'supabase',
          VIET_GARDEN_MEDIA_STORAGE_PROVIDER: 'object',
          SUPABASE_URL: 'https://ltntwqxnwvoiukyktgib.supabase.co',
          SUPABASE_STORAGE_BUCKET: 'viet-garden-media',
          SUPABASE_SERVICE_ROLE_KEY: key,
          ...(typeof adminUserIds === 'string' ? { SUPABASE_ADMIN_USER_IDS: adminUserIds } : {}),
      };
      phase = 'building';
      lastError = '';
      child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'build'], {
        env: environment,
        stdio: ['ignore', 'ignore', 'pipe'],
      });
      child.stderr?.on('data', (chunk) => { lastError = String(chunk).replace(key, '[redacted]').slice(-1000); });
      child.once('close', (code) => {
        if (code !== 0) { phase = 'build-failed'; return; }
        phase = 'starting';
        child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3001'], { env: environment, stdio: ['ignore', 'ignore', 'ignore'] });
        child.stderr?.on('data', (chunk) => { lastError = String(chunk).replace(key, '[redacted]').slice(-1000); });
        phase = 'started';
      });
      response.writeHead(202, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ started: true }));
    } catch {
      response.writeHead(400);
      response.end(JSON.stringify({ started: false }));
    }
  });
});

server.listen(8000, '127.0.0.1');
