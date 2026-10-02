export interface CompressedImageResult {
  thumbnailFile: File;
  fullSizeFile: File;
  thumbnailUrl: string;
  fullSizeUrl: string;
}

/**
 * Check if file is HEIC format (iPhone photos)
 * Pure check — no library needed, safe to call on page load.
 */
export function isHeicFile(file: File): boolean {
  const fileName = file.name.toLowerCase();
  return (
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    fileName.endsWith('.heic') ||
    fileName.endsWith('.heif')
  );
}

/**
 * Convert HEIC file to JPEG for browser compatibility.
 * heic2any (~2.7 MB) is loaded on demand — only when an actual HEIC file is detected.
 */
export async function convertHeicToJpeg(file: File): Promise<File> {
  if (!isHeicFile(file)) {
    return file;
  }

  try {
    // Dynamic import — heic2any is NOT in the initial bundle
    const { default: heic2any } = await import('heic2any');

    const convertedBlob = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.9,
    });

    const resultBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
    const newFileName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
    const convertedFile = new File([resultBlob], newFileName, { type: 'image/jpeg' });
    return convertedFile;
  } catch (error) {
    console.error('HEIC conversion error:', error);
    throw new Error('Failed to convert iPhone photo. Please try a different image.');
  }
}

/**
 * Prepare file for upload — converts HEIC if needed.
 */
export async function prepareImageForUpload(file: File): Promise<File> {
  if (isHeicFile(file)) {
    return await convertHeicToJpeg(file);
  }
  return file;
}

/**
 * Compress image and create two versions: thumbnail and full-size WebP.
 * browser-image-compression (~856 KB) is loaded on demand — only when compression runs.
 */
export async function compressAndConvertImage(file: File): Promise<CompressedImageResult> {
  try {
    // Convert HEIC to JPEG if needed (lazy-loads heic2any internally)
    let processableFile = file;
    if (isHeicFile(file)) {
      processableFile = await convertHeicToJpeg(file);
    }

    if (!processableFile.type.startsWith('image/')) {
      throw new Error('Please select a valid image file');
    }

    // Dynamic import — browser-image-compression is NOT in the initial bundle
    const { default: imageCompression } = await import('browser-image-compression');

    const thumbnailOptions = {
      maxSizeMB: 0.1,
      maxWidthOrHeight: 300,
      useWebWorker: true,
      fileType: 'image/webp' as const,
      initialQuality: 0.8,
    };

    const fullSizeOptions = {
      maxSizeMB: 0.3,
      maxWidthOrHeight: 1000,
      useWebWorker: true,
      fileType: 'image/webp' as const,
      initialQuality: 0.85,
    };

    const [thumbnailFile, fullSizeFile] = await Promise.all([
      imageCompression(processableFile, thumbnailOptions),
      imageCompression(processableFile, fullSizeOptions),
    ]);

    const thumbnailUrl = URL.createObjectURL(thumbnailFile);
    const fullSizeUrl = URL.createObjectURL(fullSizeFile);

    return { thumbnailFile, fullSizeFile, thumbnailUrl, fullSizeUrl };
  } catch (error) {
    console.error('Image compression error:', error);
    throw new Error(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Upload compressed images to Firebase Storage and return public URLs.
 */
export async function uploadCompressedImages(
  thumbnailFile: File,
  fullSizeFile: File,
  originalFileName: string
): Promise<{ thumbnailUrl: string; fullImageUrl: string }> {
  try {
    const timestamp = Date.now();
    const baseName = originalFileName.replace(/\.[^/.]+$/, '');

    const thumbnailFormData = new FormData();
    thumbnailFormData.append('images', thumbnailFile, `${baseName}_thumb_${timestamp}.webp`);

    const fullSizeFormData = new FormData();
    fullSizeFormData.append('images', fullSizeFile, `${baseName}_full_${timestamp}.webp`);

    const [thumbnailResponse, fullSizeResponse] = await Promise.all([
      fetch('/api/upload', { method: 'POST', body: thumbnailFormData }),
      fetch('/api/upload', { method: 'POST', body: fullSizeFormData }),
    ]);

    if (!thumbnailResponse.ok) {
      const error = await thumbnailResponse.text();
      throw new Error(`Thumbnail upload failed: ${error}`);
    }
    if (!fullSizeResponse.ok) {
      const error = await fullSizeResponse.text();
      throw new Error(`Full-size upload failed: ${error}`);
    }

    const thumbnailResult = await thumbnailResponse.json();
    const fullSizeResult = await fullSizeResponse.json();

    if (!thumbnailResult.images?.[0] || !fullSizeResult.images?.[0]) {
      throw new Error('Upload response missing image URLs');
    }

    return { thumbnailUrl: thumbnailResult.images[0], fullImageUrl: fullSizeResult.images[0] };
  } catch (error) {
    console.error('Upload error:', error);
    throw new Error(`Failed to upload images: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Process and upload image in one call.
 */
export async function processAndUploadImage(file: File): Promise<{ thumbnailUrl: string; fullImageUrl: string }> {
  const compressed = await compressAndConvertImage(file);
  try {
    const result = await uploadCompressedImages(compressed.thumbnailFile, compressed.fullSizeFile, file.name);
    URL.revokeObjectURL(compressed.thumbnailUrl);
    URL.revokeObjectURL(compressed.fullSizeUrl);
    return result;
  } catch (error) {
    URL.revokeObjectURL(compressed.thumbnailUrl);
    URL.revokeObjectURL(compressed.fullSizeUrl);
    throw error;
  }
}

/**
 * Process multiple images in parallel with progress tracking.
 */
export async function processMultipleImages(
  files: File[],
  onProgress?: (completed: number, total: number) => void
): Promise<Array<{ thumbnailUrl: string; fullImageUrl: string }>> {
  const results: Array<{ thumbnailUrl: string; fullImageUrl: string }> = [];
  let completed = 0;

  for (const file of files) {
    try {
      const result = await processAndUploadImage(file);
      results.push(result);
      completed++;
      onProgress?.(completed, files.length);
    } catch (error) {
      console.error(`Failed to process ${file.name}:`, error);
      completed++;
      onProgress?.(completed, files.length);
      throw error;
    }
  }

  return results;
}
