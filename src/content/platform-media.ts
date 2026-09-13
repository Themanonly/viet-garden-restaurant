import type { MediaAsset } from './models';

export function resolvePlatformMedia(media: MediaAsset[], id?: string): MediaAsset | undefined {
  return id ? media.find(asset => asset.id === id && asset.type === 'image' && asset.visible && Boolean(asset.reference)) : undefined;
}
