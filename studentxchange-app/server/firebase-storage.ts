import { v4 as uuidv4 } from 'uuid';
import { admin, initializeFirebaseAdmin } from './firebase-admin';

function getBucket() {
  if (!admin.apps.length) {
    initializeFirebaseAdmin();
  }
  if (!admin.apps.length) throw new Error('Firebase Admin not initialized');
  return admin.storage().bucket();
}

/**
 * Upload a file buffer to Firebase Storage and return a public URL.
 */
export async function uploadFileToFirebase(
  file: Buffer,
  fileName: string,
  folder: string = 'products'
): Promise<string> {
  const bucket = getBucket();

  const timestamp = Date.now();
  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${folder}/${timestamp}-${safeFileName}`;

  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const contentTypeMap: Record<string, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    heic: 'image/heic',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  const contentType = contentTypeMap[ext] || 'application/octet-stream';

  const token = uuidv4();

  const fileRef = bucket.file(filePath);
  await fileRef.save(file, {
    metadata: {
      contentType,
      metadata: {
        firebaseStorageDownloadTokens: token,
      },
    },
  });

  const bucketName = bucket.name;
  const encodedPath = encodeURIComponent(filePath);
  const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${token}`;

  return publicUrl;
}

/**
 * Delete a file from Firebase Storage by its public URL.
 */
export async function deleteFileFromFirebase(fileUrl: string): Promise<void> {
  try {
    const bucket = getBucket();
    const bucketName = bucket.name;

    let filePath: string | null = null;

    const gsMatch = fileUrl.match(/\/b\/[^/]+\/o\/(.+?)(\?|$)/);
    if (gsMatch) {
      filePath = decodeURIComponent(gsMatch[1]);
    }

    if (!filePath) return;

    await bucket.file(filePath).delete();
  } catch (err) {
    console.error('Firebase Storage delete error:', err);
  }
}

export const isFirebaseStorageConfigured = true;
