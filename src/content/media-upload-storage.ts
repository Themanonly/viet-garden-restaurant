
export type UploadedMediaType = 'image' | 'video';
export type UploadedMediaPayload = { bytes: Uint8Array; type: UploadedMediaType; extension: 'jpg' | 'png' | 'gif' | 'webp' | 'mp4' };

const imageLimit = 10 * 1024 * 1024;
const videoLimit = 100 * 1024 * 1024;
export function validateUploadedMedia(bytes: Uint8Array, type: UploadedMediaType, extension: string): UploadedMediaPayload {
  const allowed = type === 'image' ? ['jpg', 'png', 'gif', 'webp'] : ['mp4'];
  if (!allowed.includes(extension)) throw new Error(`Unsupported ${type} file extension.`);
  const limit = type === 'image' ? imageLimit : videoLimit;
  if (bytes.byteLength === 0 || bytes.byteLength > limit) throw new Error(`${type === 'image' ? 'Image' : 'Video'} files must be between 1 byte and ${Math.round(limit / (1024 * 1024))} MB.`);
  const header = Buffer.from(bytes.subarray(0, 16));
  const valid = type === 'image'
    ? (extension === 'jpg' && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff)
      || (extension === 'png' && header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
      || (extension === 'gif' && (header.subarray(0, 6).toString() === 'GIF87a' || header.subarray(0, 6).toString() === 'GIF89a'))
      || (extension === 'webp' && header.subarray(0, 4).toString() === 'RIFF' && header.subarray(8, 12).toString() === 'WEBP')
    : header.length >= 12 && header.subarray(4, 8).toString() === 'ftyp';
  if (!valid) throw new Error('The uploaded file content does not match its declared media type.');
  return { bytes, type, extension: extension as UploadedMediaPayload['extension'] };
}

