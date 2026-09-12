
export type UploadedMediaType = 'image' | 'video' | 'audio' | 'pdf' | 'document' | 'other';
export type UploadedMediaExtension = 'jpg' | 'png' | 'gif' | 'webp' | 'mp4' | 'mp3' | 'wav' | 'aac' | 'ogg' | 'pdf' | 'doc' | 'docx' | 'txt' | 'rtf' | 'csv' | 'json' | 'md' | 'ppt' | 'pptx' | 'xls' | 'xlsx';
export type UploadedMediaPayload = { bytes: Uint8Array; type: UploadedMediaType; extension: UploadedMediaExtension };

const typeLimits: Record<UploadedMediaType, number> = {
  image: 10 * 1024 * 1024,
  video: 100 * 1024 * 1024,
  audio: 25 * 1024 * 1024,
  pdf: 25 * 1024 * 1024,
  document: 25 * 1024 * 1024,
  other: 10 * 1024 * 1024,
};

const allowedExtensionsByType: Record<UploadedMediaType, string[]> = {
  image: ['jpg', 'png', 'gif', 'webp'],
  video: ['mp4'],
  audio: ['mp3', 'wav', 'aac', 'ogg'],
  pdf: ['pdf'],
  document: ['doc', 'docx', 'txt', 'rtf', 'csv', 'json', 'md', 'ppt', 'pptx', 'xls', 'xlsx'],
  other: ['txt', 'csv', 'json', 'md', 'xml'],
};

export function validateUploadedMedia(bytes: Uint8Array, type: UploadedMediaType, extension: string): UploadedMediaPayload {
  const normalized = String(extension).trim().toLowerCase();
  const allowed = allowedExtensionsByType[type] ?? [];
  if (!allowed.includes(normalized)) throw new Error(`Unsupported ${type} file extension.`);
  const limit = typeLimits[type] ?? typeLimits.other;
  if (bytes.byteLength === 0 || bytes.byteLength > limit) throw new Error(`${type.charAt(0).toUpperCase() + type.slice(1)} files must be between 1 byte and ${Math.round(limit / (1024 * 1024))} MB.`);

  const header = Buffer.from(bytes.subarray(0, 32));
  const valid = type === 'image'
    ? (normalized === 'jpg' && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff)
      || (normalized === 'png' && header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
      || (normalized === 'gif' && (header.subarray(0, 6).toString() === 'GIF87a' || header.subarray(0, 6).toString() === 'GIF89a'))
      || (normalized === 'webp' && header.subarray(0, 4).toString() === 'RIFF' && header.subarray(8, 12).toString() === 'WEBP')
    : type === 'video'
      ? header.length >= 12 && header.subarray(4, 8).toString() === 'ftyp'
      : type === 'audio'
        ? (normalized === 'mp3' && (header.subarray(0, 3).toString('ascii') === 'ID3' || header.subarray(0, 2).toString('hex') === 'fffb' || header.subarray(0, 2).toString('hex') === 'fff3' || header.subarray(0, 2).toString('hex') === 'fff2'))
          || (normalized === 'wav' && header.subarray(0, 4).toString() === 'RIFF' && header.subarray(8, 12).toString() === 'WAVE')
          || (normalized === 'aac' && header.subarray(0, 2).toString('hex') === 'fff1')
          || (normalized === 'ogg' && header.subarray(0, 4).toString() === 'OggS')
        : type === 'pdf'
          ? header.subarray(0, 5).toString() === '%PDF-'
          : type === 'document'
            ? (normalized === 'doc' && header.subarray(0, 8).toString() === 'PK\x03\x04') || (normalized === 'docx' && header.subarray(0, 4).toString() === 'PK\x03\x04') || (normalized === 'txt' && /[\x20-\x7E\t\r\n]/.test(header.toString('latin1')))
              || (normalized === 'rtf' && header.subarray(0, 5).toString() === '{\\rtf') || (normalized === 'csv' && /[\x20-\x7E\t\r\n]/.test(header.toString('latin1')))
              || (normalized === 'json' && (header[0] === 0x7b || header[0] === 0x5b)) || (normalized === 'md' && /[\x20-\x7E\t\r\n]/.test(header.toString('latin1')))
              || (normalized === 'ppt' && header.subarray(0, 8).toString() === 'PK\x03\x04') || (normalized === 'pptx' && header.subarray(0, 4).toString() === 'PK\x03\x04')
              || (normalized === 'xls' && header.subarray(0, 8).toString() === 'PK\x03\x04') || (normalized === 'xlsx' && header.subarray(0, 4).toString() === 'PK\x03\x04')
            : type === 'other'
              ? (normalized === 'txt' || normalized === 'csv' || normalized === 'json' || normalized === 'md' || normalized === 'xml') && bytes.byteLength > 0
              : false;
  if (!valid) throw new Error('The uploaded file content does not match its declared media type.');
  return { bytes, type, extension: normalized as UploadedMediaPayload['extension'] };
}

