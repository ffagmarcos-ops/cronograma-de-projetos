import mysql, { type Pool, type ResultSetHeader, type RowDataPacket } from 'mysql2/promise';
import 'dotenv/config';

type Params = Array<string | number | boolean | null>;

interface DbClient {
  get: <T = any>(sql: string, params?: Params) => Promise<T | undefined>;
  all: <T = any>(sql: string, params?: Params) => Promise<T[]>;
  run: (sql: string, params?: Params) => Promise<{ lastID: number; changes: number }>;
  exec: (sql: string) => Promise<void>;
}

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'mariadb',
      port: Number(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '30mariafn@',
      database: process.env.DB_NAME || 'mm_portal',
      connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || '10'),
      waitForConnections: true,
      namedPlaceholders: false,
      multipleStatements: true
    });
  }

  return pool;
}

export const getDb = async (): Promise<DbClient> => {
  const dbPool = getPool();

  return {
    async get<T = any>(sql: string, params: Params = []) {
      const [rows] = await dbPool.query<RowDataPacket[]>(sql, params);
      return (rows[0] as T) || undefined;
    },

    async all<T = any>(sql: string, params: Params = []) {
      const [rows] = await dbPool.query<RowDataPacket[]>(sql, params);
      return rows as T[];
    },

    async run(sql: string, params: Params = []) {
      const [result] = await dbPool.execute<ResultSetHeader>(sql, params);
      return {
        lastID: result.insertId || 0,
        changes: result.affectedRows || 0
      };
    },

    async exec(sql: string) {
      await dbPool.query(sql);
    }
  };
};
