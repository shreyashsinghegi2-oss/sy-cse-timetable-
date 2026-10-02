import assert from "node:assert/strict";
import test from "node:test";
import {
  CollabFirestoreService,
  ProfileAlreadyExistsError,
  getSqlOnlyCollabUid,
  isSqlOnlyCollabUid,
  normalizeSqlOnlyCollabUidClaim,
} from "./collab-firestore-service";

function makeFirestore() {
  const documents = new Map<string, Record<string, unknown>>();
  const refs = new Map<string, any>();

  const firestore = {
    collection(name: string) {
      return {
        doc(uid: string) {
          const key = `${name}/${uid}`;
          const ref = {
            id: uid,
            async get() {
              const data = documents.get(key);
              return {
                id: uid,
                exists: !!data,
                data: () => data,
              };
            },
          };
          refs.set(key, ref);
          return ref;
        },
      };
    },
    async runTransaction(callback: (transaction: any) => Promise<unknown>) {
      const transaction = {
        async get(ref: any) {
          const data = documents.get(`studentProfiles/${ref.id}`);
          return {
            id: ref.id,
            exists: !!data,
            data: () => data,
          };
        },
        create(ref: any, data: Record<string, unknown>) {
          const key = `studentProfiles/${ref.id}`;
          if (documents.has(key)) throw new Error("transaction conflict");
          documents.set(key, data);
        },
        update(ref: any, updates: Record<string, unknown>) {
          const key = `studentProfiles/${ref.id}`;
          documents.set(key, { ...documents.get(key), ...updates });
        },
      };
      return callback(transaction);
    },
  };

  return { firestore, documents, refs };
}

test("SQL-only password sessions receive a stable, non-Firebase Collab owner key", () => {
  const uid = getSqlOnlyCollabUid(123);
  assert.equal(uid, "sql-session:123");
  assert.equal(isSqlOnlyCollabUid(uid), true);
  assert.equal(isSqlOnlyCollabUid("firebase-user"), false);
  assert.throws(() => getSqlOnlyCollabUid(0));
  assert.equal(normalizeSqlOnlyCollabUidClaim(123, undefined), uid);
  assert.equal(normalizeSqlOnlyCollabUidClaim(123, uid), uid);
  assert.throws(() => normalizeSqlOnlyCollabUidClaim(123, "sql-session:124"));
  assert.throws(() => normalizeSqlOnlyCollabUidClaim(123, 123));
});

test("profile creation uses the verified identity and rejects a duplicate document", async () => {
  const fake = makeFirestore();
  const service = new CollabFirestoreService(fake.firestore as any);
  const sqlOnlyUid = getSqlOnlyCollabUid(42);
  const first = await service.createProfile(sqlOnlyUid, 42, {
    uid: "attacker-controlled-uid",
    userId: 999,
    role: "Professional",
    email: "user@example.com",
    name: "User",
    username: "user",
    optionalField: undefined,
  });

  assert.equal(first.uid, sqlOnlyUid);
  assert.equal(first.userId, 42);
  assert.equal((first as any).optionalField, undefined);
  assert.equal(fake.documents.has(`studentProfiles/${sqlOnlyUid}`), true);
  assert.equal(normalizeSqlOnlyCollabUidClaim(42, undefined), first.uid);
  assert.equal((await service.getProfileByUid(normalizeSqlOnlyCollabUidClaim(42, undefined)))?.uid, first.uid);

  await assert.rejects(
    () => service.createProfile(sqlOnlyUid, 42, {
      role: "Professional",
      email: "user@example.com",
      name: "User",
      username: "user",
    }),
    (error: unknown) => error instanceof ProfileAlreadyExistsError
  );
});

test("profile updates preserve immutable identity and omit undefined Firestore values", async () => {
  const fake = makeFirestore();
  const service = new CollabFirestoreService(fake.firestore as any);
  await service.createProfile("firebase-user", 42, {
    role: "Organisation",
    email: "org@example.com",
    name: "Organisation",
    username: "organisation",
    organisationName: "Example",
  });

  const updated = await service.updateProfile("firebase-user", {
    uid: "different-user",
    userId: 777,
    name: "Updated",
    optionalField: undefined,
  });

  assert.equal(updated?.uid, "firebase-user");
  assert.equal(updated?.userId, 42);
  assert.equal((updated as any)?.optionalField, undefined);
  assert.equal(updated?.name, "Updated");
});