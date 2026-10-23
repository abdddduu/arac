import 'server-only';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const globalForDb = globalThis as unknown as { db?: ReturnType<typeof createClient> };

function createClient() {
  const client = postgres(process.env.DATABASE_URL!, { prepare: false });
  return drizzle(client, { schema });
}

export const db = globalForDb.db ?? createClient();

if (process.env.NODE_ENV !== 'production') {
  globalForDb.db = db;
}
