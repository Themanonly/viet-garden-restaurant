import type { MediaAsset } from './models';
import { socialPresentation } from './platform-presentation';

export function resolvePlatformMedia(media: MediaAsset[], id?: string): MediaAsset | undefined {
  return id ? media.find(asset => asset.id === id && asset.type === 'image' && asset.visible && Boolean(asset.reference)) : undefined;
}

export function socialIconFallback(platform: string, legacyIcon?: string): string {
  return (legacyIcon && socialPresentation[legacyIcon]?.icon) || legacyIcon || socialPresentation[platform]?.icon || '•';
}
