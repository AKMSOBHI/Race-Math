import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import { Pool } from '@neondatabase/serverless';
import { log } from './vite';

/**
 * دالة لتنفيذ التهجيرات وإنشاء الجداول في قاعدة البيانات
 * يتم استدعاء هذه الدالة عند بدء الخادم
 */
export async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    log('DATABASE_URL is not set. Skipping migrations.', 'migrate');
    return;
  }

  log('Running database migrations...', 'migrate');
  
  try {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);

    // تنفيذ عملية التهجير القائمة على Drizzle
    await migrate(db, { migrationsFolder: 'drizzle/migrations' });
    
    log('Database migrations completed successfully', 'migrate');
    await pool.end();
    
    return true;
  } catch (error) {
    log(`Migration error: ${error.message}`, 'migrate');
    return false;
  }
}

/**
 * إنشاء مستخدم معلم افتراضي للاختبار
 * يمكن استخدام هذه الدالة للتجربة والاختبار
 */
export async function seedDefaultTeacher(db) {
  const { users } = await import('@shared/schema');
  const { eq } = await import('drizzle-orm');

  try {
    // التحقق مما إذا كان المعلم موجوداً بالفعل
    const existingTeacher = await db.select().from(users).where(eq(users.username, 'teacher'));
    
    if (existingTeacher.length === 0) {
      // إنشاء مستخدم معلم افتراضي
      await db.insert(users).values({
        username: 'teacher',
        password: 'password', // في التطبيق الحقيقي يجب تشفير كلمة المرور
        isTeacher: true,
      });
      log('Default teacher account created', 'seed');
    } else {
      log('Default teacher account already exists', 'seed');
    }
    
    return true;
  } catch (error) {
    log(`Error seeding default teacher: ${error.message}`, 'seed');
    return false;
  }
}
