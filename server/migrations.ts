import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import { log } from './vite';
import * as schema from '@shared/schema';

/**
 * دالة لتنفيذ التهجيرات وإنشاء الجداول في قاعدة البيانات
 * يتم استدعاء هذه الدالة عند بدء الخادم
 */
export async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    log('DATABASE_URL is not set. Skipping migrations.', 'migrate');
    return;
  }

  log('Running database schema creation...', 'migrate');
  
  try {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool, { schema });

    // إنشاء الجداول مباشرة من المخطط
    const createTablesQuery = `
      -- إنشاء جدول المستخدمين
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        is_guest BOOLEAN DEFAULT FALSE,
        is_teacher BOOLEAN DEFAULT FALSE,
        score INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- إنشاء جدول الغرف
      CREATE TABLE IF NOT EXISTS rooms (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(10) NOT NULL UNIQUE,
        teacher_id INTEGER REFERENCES users(id),
        max_players INTEGER DEFAULT 100,
        is_active BOOLEAN DEFAULT TRUE,
        contest_mode VARCHAR(50) DEFAULT 'synchronized',
        start_time TIMESTAMP,
        end_time TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- إنشاء جدول جلسات اللعب
      CREATE TABLE IF NOT EXISTS game_sessions (
        id VARCHAR(50) PRIMARY KEY,
        host_id INTEGER REFERENCES users(id),
        room_id INTEGER REFERENCES rooms(id),
        max_players INTEGER DEFAULT 4,
        is_multiplayer BOOLEAN DEFAULT TRUE,
        status VARCHAR(20) DEFAULT 'waiting',
        stage VARCHAR(50) DEFAULT 'BASIC_ADDITION_SUBTRACTION',
        current_question_index INTEGER DEFAULT 0,
        questions JSONB DEFAULT '[]',
        players JSONB DEFAULT '[]', -- تخزين بيانات اللاعبين كـ JSON
        difficulty VARCHAR(20) DEFAULT 'easy',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- إنشاء جدول جلسات اللاعبين
      CREATE TABLE IF NOT EXISTS player_sessions (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(50) REFERENCES game_sessions(id),
        user_id INTEGER REFERENCES users(id),
        score INTEGER DEFAULT 0,
        progress INTEGER DEFAULT 0,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      -- إنشاء جدول المشاركين في الغرفة
      CREATE TABLE IF NOT EXISTS room_participants (
        id SERIAL PRIMARY KEY,
        room_id INTEGER REFERENCES rooms(id),
        user_id INTEGER REFERENCES users(id),
        is_approved BOOLEAN DEFAULT FALSE,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(room_id, user_id)
      );
    `;
    
    // إنشاء الجداول
    await pool.query(createTablesQuery);
    
    log('Database schema created successfully', 'migrate');
    await pool.end();
    
    return true;
  } catch (error: any) {
    log(`Migration error: ${error?.message || 'Unknown error'}`, 'migrate');
    return false;
  }
}

/**
 * إنشاء مستخدم معلم افتراضي للاختبار
 * يمكن استخدام هذه الدالة للتجربة والاختبار
 */
export async function seedDefaultTeacher(db: any) {
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
  } catch (error: any) {
    log(`Error seeding default teacher: ${error?.message || 'Unknown error'}`, 'seed');
    return false;
  }
}
