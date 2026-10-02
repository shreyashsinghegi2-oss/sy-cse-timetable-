import { Storage, File } from "@google-cloud/storage";
import { Response } from "express";
import { randomUUID } from "crypto";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

// The object storage client is used to interact with the object storage service.
export const objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

// The object storage service is used to interact with the object storage service.
export class ObjectStorageService {
  constructor() {}

  // Gets the public object search paths.
  getPublicObjectSearchPaths(): Array<string> {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    const paths = Array.from(
      new Set(
        pathsStr
          .split(",")
          .map((path) => path.trim())
          .filter((path) => path.length > 0)
      )
    );
    if (paths.length === 0) {
      throw new Error(
        "PUBLIC_OBJECT_SEARCH_PATHS not set. Create a bucket in 'Object Storage' " +
          "tool and set PUBLIC_OBJECT_SEARCH_PATHS env var (comma-separated paths)."
      );
    }
    return paths;
  }

  // Gets the private object directory.
  getPrivateObjectDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var."
      );
    }
    return dir;
  }

  // Search for a public object from the search paths.
  async searchPublicObject(filePath: string): Promise<File | null> {
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const fullPath = `${searchPath}/${filePath}`;

      // Full path format: /<bucket_name>/<object_name>
      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);

      // Check if file exists
      const [exists] = await file.exists();
      if (exists) {
        return file;
      }
    }

    return null;
  }

  // Downloads an object to the response.
  async downloadObject(file: File, res: Response, cacheTtlSec: number = 3600) {
    try {
      // Get file metadata
      const [metadata] = await file.getMetadata();
      
      // Set appropriate headers
      res.set({
        "Content-Type": metadata.contentType || "application/octet-stream",
        "Content-Length": metadata.size,
        "Cache-Control": `public, max-age=${cacheTtlSec}`,
      });

      // Stream the file to the response
      const stream = file.createReadStream();

      stream.on("error", (err) => {
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });

      stream.pipe(res);
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  // Gets the upload URL for an object entity (profile pictures).
  async getProfilePictureUploadURL(): Promise<string> {
    const privateObjectDir = this.getPrivateObjectDir();
    if (!privateObjectDir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var."
      );
    }

    const objectId = randomUUID();
    const fullPath = `${privateObjectDir}/profile-pictures/${objectId}`;

    const { bucketName, objectName } = parseObjectPath(fullPath);

    // Sign URL for PUT method with TTL
    return signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900,
    });
  }

  // Gets the upload URL for post media files
  async getPostMediaUploadURL(userId: string, fileExtension: string): Promise<{ uploadUrl: string; publicUrl: string; objectPath: string }> {
    const privateObjectDir = this.getPrivateObjectDir();
    if (!privateObjectDir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var."
      );
    }

    const objectId = randomUUID();
    const timestamp = Date.now();
    const fileName = `${timestamp}_${objectId}${fileExtension}`;
    const fullPath = `${privateObjectDir}/post-media/${userId}/${fileName}`;

    const { bucketName, objectName } = parseObjectPath(fullPath);

    // Sign URL for PUT method with TTL (15 minutes)
    const uploadUrl = await signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900,
    });

    // The public URL will be served through our /objects endpoint
    const objectPath = `/objects/post-media/${userId}/${fileName}`;

    return { uploadUrl, publicUrl: objectPath, objectPath };
  }

  // Gets the object entity file from the object path.
  async getObjectEntityFile(objectPath: string): Promise<File> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }

    const entityId = parts.slice(1).join("/");
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) {
      entityDir = `${entityDir}/`;
    }
    const objectEntityPath = `${entityDir}${entityId}`;
    const { bucketName, objectName } = parseObjectPath(objectEntityPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const objectFile = bucket.file(objectName);
    const [exists] = await objectFile.exists();
    if (!exists) {
      throw new ObjectNotFoundError();
    }
    return objectFile;
  }

  normalizeObjectEntityPath(rawPath: string): string {
    // Handle empty or null paths
    if (!rawPath) {
      return rawPath;
    }
    
    // Handle Firebase Storage V0 URLs - ensure alt=media for direct access
    // https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<path>?alt=media
    if (rawPath.includes('firebasestorage.googleapis.com/v0/b/')) {
      // Remove leading slashes and ensure https:// prefix
      let normalizedUrl = rawPath;
      // Strip leading slashes first
      while (normalizedUrl.startsWith('/')) {
        normalizedUrl = normalizedUrl.slice(1);
      }
      // Add https:// if missing
      if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
        normalizedUrl = `https://${normalizedUrl}`;
      }
      // Ensure alt=media for direct download
      if (!normalizedUrl.includes('alt=media')) {
        const separator = normalizedUrl.includes('?') ? '&' : '?';
        normalizedUrl = `${normalizedUrl}${separator}alt=media`;
      }
      return normalizedUrl;
    }
    
    // Handle gs:// URLs (Firebase Storage SDK format) - convert to HTTPS
    // gs://bucket-name/path/to/file -> https://storage.googleapis.com/bucket-name/path/to/file
    if (rawPath.startsWith("gs://")) {
      const gsPath = rawPath.slice(5); // Remove 'gs://'
      return `https://storage.googleapis.com/${gsPath}`;
    }
    
    // Handle domain-present but scheme-stripped paths
    // storage.googleapis.com/bucket/... -> https://storage.googleapis.com/bucket/...
    if (rawPath.startsWith("storage.googleapis.com/")) {
      return `https://${rawPath}`;
    }
    if (rawPath.startsWith("/storage.googleapis.com/")) {
      return `https:/${rawPath}`;
    }
    
    // Already a full Firebase Storage URL - keep it as-is (public URL)
    if (rawPath.startsWith("https://storage.googleapis.com/")) {
      // Extract the path from the URL by removing query parameters and domain
      const url = new URL(rawPath);
      const rawObjectPath = url.pathname;
    
      let objectEntityDir: string;
      try {
        objectEntityDir = this.getPrivateObjectDir();
      } catch {
        // If PRIVATE_OBJECT_DIR is not set, return the original URL as-is
        // This ensures Firebase Storage public URLs remain accessible
        return rawPath;
      }
      
      if (!objectEntityDir.endsWith("/")) {
        objectEntityDir = `${objectEntityDir}/`;
      }
    
      // Only convert to /objects/ path if it's in our Replit Object Storage
      // Firebase Storage URLs (posts, avatars uploaded via Firebase) should stay as public URLs
      if (!rawObjectPath.startsWith(objectEntityDir)) {
        // This is a Firebase Storage URL, keep it as the full public URL
        return rawPath;
      }
    
      // Extract the entity ID from the path (only for Replit Object Storage)
      const entityId = rawObjectPath.slice(objectEntityDir.length);
      return `/objects/${entityId}`;
    }
    
    // Keep any other full URL as-is (http://, https://, data:, blob:, etc.)
    if (rawPath.startsWith("http://") || rawPath.startsWith("https://") || 
        rawPath.startsWith("data:") || rawPath.startsWith("blob:")) {
      return rawPath;
    }
    
    // If it's an /objects/ path, keep it for Replit Object Storage
    if (rawPath.startsWith('/objects/') || rawPath.startsWith('objects/')) {
      return rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
    }
    
    // Fix legacy broken paths: paths like "/bucket-name/posts/..." or just "posts/..." 
    // that were incorrectly stripped of the domain
    const firebaseBucket = process.env.VITE_FIREBASE_STORAGE_BUCKET;
    if (firebaseBucket) {
      const cleanPath = rawPath.startsWith('/') ? rawPath.slice(1) : rawPath;
      
      // If path starts with the bucket name, it's a legacy stripped path
      // bucket-name/posts/... -> https://storage.googleapis.com/bucket-name/posts/...
      if (cleanPath.startsWith(firebaseBucket + '/')) {
        return `https://storage.googleapis.com/${cleanPath}`;
      }
      
      // For any other path that looks like a file path (contains /)
      // This is likely a legacy Firebase Storage path that was stripped of its domain
      // posts/uid/file.jpg -> https://storage.googleapis.com/bucket/posts/uid/file.jpg
      if (cleanPath.includes('/')) {
        return `https://storage.googleapis.com/${firebaseBucket}/${cleanPath}`;
      }
    }
    
    // Return as-is for other paths (single file names, etc.)
    return rawPath;
  }
}

function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }

  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");

  return {
    bucketName,
    objectName,
  };
}

async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  const request = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
  };
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    }
  );
  if (!response.ok) {
    throw new Error(
      `Failed to sign object URL, errorcode: ${response.status}, ` +
        `make sure you're running on Replit`
    );
  }

  const { signed_url: signedURL } = await response.json();
  return signedURL;
}

// Export singleton instance
export const objectStorage = new ObjectStorageService();