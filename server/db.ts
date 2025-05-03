import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from '@shared/schema';
import { log } from './vite';

neonConfig.webSocketConstructor = ws as any;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

log('Connecting to PostgreSQL database...', 'db');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });

// تسجيل الاتصال الناجح بقاعدة البيانات
pool.on('connect', () => {
  log('Connected to PostgreSQL database successfully', 'db');
});

// تسجيل أخطاء الاتصال
pool.on('error', (err) => {
  log(`Database connection error: ${err.message}`, 'db');
});

// تصدير كائن قاعدة البيانات لاستخدامه في الملفات الأخرى
export { db, pool };
