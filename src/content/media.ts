import type { MediaAsset } from './models';
import { menuMediaCatalog } from './menu-media';

export const mediaCatalog: MediaAsset[] = [
  {
    id: 'brand-logo',
    type: 'image',
    source: 'brand',
    reference: '/media/viet-garden-logo.png',
    alt: { fr: 'Logo Viet Garden', en: 'Viet Garden logo', ar: 'شعار فييت غاردن' },
    visible: true,
    sortOrder: 1,
  },
  {
    id: 'brand-favicon',
    type: 'image',
    source: 'brand',
    reference: '/media/favicon.png',
    alt: { fr: 'Favicon Viet Garden', en: 'Viet Garden favicon', ar: 'أيقونة فييت غاردن' },
    visible: true,
    sortOrder: 2,
  },
  {
    id: 'brand-symbol',
    type: 'image',
    source: 'brand',
    reference: '/media/brand-symbol.svg',
    alt: { fr: 'Symbole Viet Garden', en: 'Viet Garden symbol', ar: 'رمز فييت غاردن' },
    visible: true,
    sortOrder: 3,
  },
  {
    id: 'hero-visual',
    type: 'video',
    source: 'local',
    reference: '/media/viet-garden-hero-hq.mp4',
    alt: { fr: 'Ambiance de Viet Garden Restaurant & Coffee', en: 'Viet Garden Restaurant & Coffee atmosphere', ar: 'أجواء مطعم ومقهى فييت غاردن' },
    visible: true,
    sortOrder: 3,
  },
  {
    id: 'identity-visual',
    type: 'image',
    source: 'local',
    reference: '/media/viet-garden-identity.jpg',
    alt: {
      fr: 'Intérieur chaleureux de Viet Garden Restaurant & Coffee à Casablanca',
      en: 'Warm interior of Viet Garden Restaurant & Coffee in Casablanca',
      ar: 'الديكور الداخلي الدافئ لمطعم ومقهى فييت غاردن في الدار البيضاء',
    },
    visible: true,
    sortOrder: 4,
  },
  ...menuMediaCatalog,
];

export function getMediaAsset(assetId: string): MediaAsset | undefined {
  return mediaCatalog.find((asset) => asset.id === assetId);
}
