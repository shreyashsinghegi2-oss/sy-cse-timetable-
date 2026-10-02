import multer from 'multer';

export const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.scr', '.msi', '.dll', '.sh', '.bash',
  '.zsh', '.ps1', '.vbs', '.vbe', '.wsf', '.wsh', '.js', '.jse', '.jar',
  '.app', '.bin', '.run', '.deb', '.rpm', '.dmg', '.pkg', '.htaccess',
  '.php', '.phtml', '.phar', '.asp', '.aspx', '.jsp', '.cgi', '.pl', '.py',
];

export const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
  'image/heic', 'image/heif',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export function hasDangerousExtension(filename: string): boolean {
  const lower = filename.toLowerCase();
  return DANGEROUS_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

const MAGIC_BYTE_SIGNATURES: { mime: string; bytes: number[][] }[] = [
  { mime: 'image/jpeg', bytes: [[0xff, 0xd8, 0xff]] },
  { mime: 'image/png',  bytes: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]] },
  { mime: 'image/gif',  bytes: [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]] },
  { mime: 'image/webp', bytes: [[0x52, 0x49, 0x46, 0x46]] },
  { mime: 'application/pdf', bytes: [[0x25, 0x50, 0x44, 0x46]] },
];

export function verifyMagicBytes(buffer: Buffer, declaredMime: string): boolean {
  if (
    declaredMime === 'image/heic' || declaredMime === 'image/heif' ||
    declaredMime === 'text/plain' || declaredMime === 'application/msword' ||
    declaredMime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return true;
  }
  const sig = MAGIC_BYTE_SIGNATURES.find((s) => s.mime === declaredMime);
  if (!sig) return true;
  return sig.bytes.some((bytes) => bytes.every((b, i) => buffer[i] === b));
}

export const strictFileFilter: multer.Options['fileFilter'] = (req, file, cb) => {
  if (!file.originalname || file.originalname.length > 255) {
    return cb(new Error('Invalid file name'));
  }
  if (hasDangerousExtension(file.originalname)) {
    return cb(new Error(`Executable file types are not allowed: ${file.originalname}`));
  }
  if (
    file.originalname.includes('..') ||
    file.originalname.includes('/') ||
    file.originalname.includes('\\')
  ) {
    return cb(new Error('Invalid file name (path traversal blocked)'));
  }
  const isHeic =
    file.originalname.toLowerCase().endsWith('.heic') ||
    file.originalname.toLowerCase().endsWith('.heif');
  if (ALLOWED_MIME_TYPES.has(file.mimetype) || isHeic) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Only images, PDFs, and documents are allowed.`));
  }
};
