import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { Env } from '@/libs/Env';
import * as schema from '@/models/Schema';

export const createDbConnection = () => {
  const connectionString = Env.DATABASE_URL || '';
  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

  const pool = new Pool({
    connectionString,
    max: isLocal ? 1 : undefined,
  });

  return drizzle({
    client: pool,
    schema,
  });
};
