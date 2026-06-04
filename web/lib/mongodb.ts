import { Db, MongoClient } from "mongodb";

declare global {
  var __grindosMongoClientPromise: Promise<MongoClient> | undefined;
}

const DEFAULT_DB_NAME = "grindos";

function getDbNameFromUri(uri: string): string | null {
  try {
    const pathname = new URL(uri).pathname.replace(/^\/+/, "");
    return pathname ? decodeURIComponent(pathname.split("/")[0]) : null;
  } catch {
    return null;
  }
}

function getMongoConfig() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is not configured.");
  }

  const dbName =
    process.env.MONGODB_DB_NAME ?? getDbNameFromUri(uri) ?? DEFAULT_DB_NAME;

  return { uri, dbName };
}

async function getMongoClient() {
  const { uri } = getMongoConfig();

  if (!globalThis.__grindosMongoClientPromise) {
    const client = new MongoClient(uri);
    globalThis.__grindosMongoClientPromise = client.connect();
  }

  return globalThis.__grindosMongoClientPromise;
}

export async function getMongoDb(): Promise<Db> {
  const { dbName } = getMongoConfig();
  const client = await getMongoClient();
  return client.db(dbName);
}

export async function closeMongoClient(): Promise<void> {
  if (!globalThis.__grindosMongoClientPromise) {
    return;
  }

  const client = await globalThis.__grindosMongoClientPromise;
  await client.close();
  globalThis.__grindosMongoClientPromise = undefined;
}
