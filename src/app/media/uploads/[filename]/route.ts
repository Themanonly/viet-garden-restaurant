import { createMediaStorage } from '../../../../content/media-storage';

export const runtime = 'nodejs';

const contentTypes: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  mp4: 'video/mp4',
};

export async function GET(_request: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  const extension = filename.split('.').pop()?.toLowerCase() ?? '';
  const contentType = contentTypes[extension];
  if (!contentType) return new Response('Not found', { status: 404 });
  try {
    const media = await createMediaStorage().read(filename);
    return new Response(new Uint8Array(media.bytes), { headers: { 'Content-Type': media.contentType || contentType, 'Cache-Control': 'public, max-age=31536000, immutable' } });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
