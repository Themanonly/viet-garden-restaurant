import type { IconType } from 'react-icons';
import { FaEnvelope, FaFacebookF, FaFax, FaGlobe, FaInstagram, FaLink, FaLinkedinIn, FaLocationDot, FaPhone, FaTiktok, FaWhatsapp, FaXTwitter, FaYoutube } from 'react-icons/fa6';
import { SiTripadvisor } from 'react-icons/si';

const socialIcons: Record<string, IconType> = {
  instagram: FaInstagram,
  facebook: FaFacebookF,
  tiktok: FaTiktok,
  youtube: FaYoutube,
  x: FaXTwitter,
  linkedin: FaLinkedinIn,
  tripadvisor: SiTripadvisor,
};

const contactIcons: Record<string, IconType> = {
  phone: FaPhone,
  whatsapp: FaWhatsapp,
  email: FaEnvelope,
  fax: FaFax,
  other: FaLink,
};

export function PlatformIcon({ kind, value, className, label }: { kind: 'social' | 'contact' | 'location' | 'website'; value?: string; className?: string; label: string }) {
  const Icon = kind === 'social' ? socialIcons[value?.toLowerCase() ?? ''] ?? FaLink : kind === 'contact' ? contactIcons[value?.toLowerCase() ?? ''] ?? FaLink : kind === 'location' ? FaLocationDot : kind === 'website' ? FaGlobe : FaLink;
  return <Icon className={className} aria-hidden="true" focusable="false" title={label} />;
}