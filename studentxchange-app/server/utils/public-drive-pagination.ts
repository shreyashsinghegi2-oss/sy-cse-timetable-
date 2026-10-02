export interface PublicDrivesCursor {
  seconds: number;
  nanoseconds: number;
  id: string;
}

export interface PublicDriveCursorDocument {
  id: string;
  get(fieldPath: string): unknown;
}

interface FirestoreTimestampValue {
  seconds: number;
  nanoseconds: number;
}

function getTimestamp(doc: PublicDriveCursorDocument): FirestoreTimestampValue | null {
  const value = doc.get("createdAt") as Partial<FirestoreTimestampValue> | undefined;
  const seconds = value?.seconds;
  const nanoseconds = value?.nanoseconds;
  if (
    typeof seconds !== "number" ||
    typeof nanoseconds !== "number" ||
    !Number.isSafeInteger(seconds) ||
    !Number.isInteger(nanoseconds) ||
    nanoseconds < 0 ||
    nanoseconds > 999_999_999
  ) {
    return null;
  }
  return { seconds, nanoseconds };
}

export function decodePublicDrivesCursor(value: unknown): PublicDrivesCursor | null {
  if (typeof value !== "string" || value.length === 0 || value.length > 512) return null;
  try {
    const decoded = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (
      !Number.isSafeInteger(decoded?.seconds) ||
      !Number.isInteger(decoded?.nanoseconds) ||
      decoded.nanoseconds < 0 ||
      decoded.nanoseconds > 999_999_999 ||
      typeof decoded?.id !== "string" ||
      decoded.id.length === 0 ||
      decoded.id.length > 256
    ) {
      return null;
    }
    return { seconds: decoded.seconds, nanoseconds: decoded.nanoseconds, id: decoded.id };
  } catch {
    return null;
  }
}

export function encodePublicDrivesCursor(doc: PublicDriveCursorDocument): string | null {
  const createdAt = getTimestamp(doc);
  if (!createdAt) return null;
  return Buffer.from(JSON.stringify({ ...createdAt, id: doc.id })).toString("base64url");
}

export function comparePublicDriveDocsNewestFirst(
  a: PublicDriveCursorDocument,
  b: PublicDriveCursorDocument,
): number {
  const aCreatedAt = getTimestamp(a);
  const bCreatedAt = getTimestamp(b);
  if (!aCreatedAt) return bCreatedAt ? 1 : b.id.localeCompare(a.id);
  if (!bCreatedAt) return -1;
  if (aCreatedAt.seconds !== bCreatedAt.seconds) return aCreatedAt.seconds > bCreatedAt.seconds ? -1 : 1;
  if (aCreatedAt.nanoseconds !== bCreatedAt.nanoseconds) return aCreatedAt.nanoseconds > bCreatedAt.nanoseconds ? -1 : 1;
  return b.id.localeCompare(a.id);
}

export function matchesPublicDrivesCursor(
  doc: PublicDriveCursorDocument,
  cursor: PublicDrivesCursor,
): boolean {
  const createdAt = getTimestamp(doc);
  return doc.id === cursor.id &&
    createdAt?.seconds === cursor.seconds &&
    createdAt?.nanoseconds === cursor.nanoseconds;
}