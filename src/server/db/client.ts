import pg from "pg";
import { getAppConfig } from "../config";

const { Pool } = pg;

declare global {
  // eslint-disable-next-line no-var
  var lumioPgPool: pg.Pool | undefined;
}

export function getPool(): pg.Pool {
  const config = getAppConfig();
  if (!config.databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (!globalThis.lumioPgPool) {
    globalThis.lumioPgPool = new Pool({
      connectionString: config.databaseUrl,
      max: 10,
      ssl:
        process.env.DATABASE_SSL === "false"
          ? false
          : {
              rejectUnauthorized: false
            }
    });
  }

  return globalThis.lumioPgPool;
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  values: unknown[] = []
): Promise<pg.QueryResult<T>> {
  return getPool().query<T>(text, values);
}

export async function transaction<T>(
  fn: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
