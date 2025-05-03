import { db } from '../db';
import { log } from '../vite';
import { nanoid } from 'nanoid';
import { eq, and } from 'drizzle-orm';
import { rooms, playerSessions, gameSessions, users, Room, Player, GameSession } from '@shared/schema';
import { GameManager } from '../game/gameManager';

/**
 * مدير الغرف - يهتم بإدارة غرف الفصول الدراسية والمسابقات
 */
export class RoomManager {
  private gameManager: GameManager;

  constructor(gameManager: GameManager) {
    this.gameManager = gameManager;
  }

  /**
   * توليد رمز غرفة عشوائي من 6 أحرف/أرقام
   */
  private generateRoomCode(): string {
    // توليد رمز عشوائي من الأحرف والأرقام
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // تجنب الأحرف المربكة مثل I, O, 0, 1
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * إنشاء غرفة جديدة (فصل دراسي)
   */
  async createRoom(name: string, teacherId: number, maxPlayers = 100, contestMode = 'synchronized', endTime?: Date): Promise<Room | null> {
    try {
      // التحقق من وجود المعلم
      const teacher = await db.select().from(users).where(and(
        eq(users.id, teacherId),
        eq(users.isTeacher, true)
      ));

      if (teacher.length === 0) {
        log(`Error creating room: Teacher with ID ${teacherId} not found or not a teacher`, 'room');
        return null;
      }

      // توليد رمز فريد للغرفة
      let roomCode = this.generateRoomCode();
      let isUnique = false;
      let attempts = 0;

      // التأكد من أن الرمز فريد
      while (!isUnique && attempts < 10) {
        const existingRoom = await db.select().from(rooms).where(eq(rooms.code, roomCode));
        isUnique = existingRoom.length === 0;
        if (!isUnique) {
          roomCode = this.generateRoomCode();
          attempts++;
        }
      }

      if (!isUnique) {
        throw new Error('Could not generate a unique room code after multiple attempts');
      }

      // إنشاء الغرفة
      const [newRoom] = await db.insert(rooms).values({
        name,
        code: roomCode,
        teacherId,
        maxPlayers,
        contestMode,
        endTime: endTime || null,
      }).returning();

      log(`Room created: ${newRoom.name} with code ${newRoom.code}`, 'room');
      return newRoom;
    } catch (error) {
      log(`Error creating room: ${error.message}`, 'room');
      return null;
    }
  }

  /**
   * الحصول على غرفة باستخدام الرمز
   */
  async getRoomByCode(code: string): Promise<Room | null> {
    try {
      const room = await db.select().from(rooms).where(eq(rooms.code, code));
      return room.length > 0 ? room[0] : null;
    } catch (error) {
      log(`Error getting room by code: ${error.message}`, 'room');
      return null;
    }
  }

  /**
   * الحصول على قائمة الغرف النشطة
   */
  async getActiveRooms(teacherId?: number): Promise<Room[]> {
    try {
      let query = db.select().from(rooms).where(eq(rooms.isActive, true));
      
      // إذا تم تحديد معرف المعلم، نحصل على غرفه فقط
      if (teacherId) {
        query = query.where(eq(rooms.teacherId, teacherId));
      }
      
      return await query;
    } catch (error) {
      log(`Error getting active rooms: ${error.message}`, 'room');
      return [];
    }
  }

  /**
   * انضمام طالب إلى غرفة
   */
  async joinRoom(roomId: number, userId: number): Promise<{ success: boolean; username?: string }> {
    try {
      // التحقق من وجود الغرفة والطالب
      const roomResult = await db.select().from(rooms).where(eq(rooms.id, roomId));
      const userResult = await db.select().from(users).where(eq(users.id, userId));

      if (roomResult.length === 0) {
        return { success: false };
      }

      if (userResult.length === 0) {
        return { success: false };
      }

      const room = roomResult[0];
      const user = userResult[0];

      // التحقق مما إذا كانت الغرفة نشطة
      if (!room.isActive) {
        return { success: false };
      }

      // التحقق من عدد اللاعبين الحاليين في الغرفة
      const activeSessions = await db.select().from(gameSessions)
        .where(and(
          eq(gameSessions.roomId, roomId),
          eq(gameSessions.status, 'active')
        ));

      if (activeSessions.length > 0) {
        // إذا كانت هناك جلسة نشطة، نقوم بإضافة اللاعب إليها
        const gameSession = activeSessions[0];
        const result = await this.gameManager.joinGame(gameSession.id, userId);
        
        if (result.joined) {
          return { success: true, username: user.username };
        }
      }

      // إذا لم تكن هناك جلسة نشطة، فاللاعب سينتظر بدء المسابقة
      return { success: true, username: user.username };
    } catch (error) {
      log(`Error joining room: ${error.message}`, 'room');
      return { success: false };
    }
  }

  /**
   * بدء مسابقة في غرفة
   */
  async startContest(roomId: number, teacherId: number, difficulty: "easy" | "medium" | "hard" = "easy"): Promise<{ success: boolean; gameSession?: GameSession }> {
    try {
      // التحقق من وجود الغرفة وأن المعلم هو المالك لها
      const roomResult = await db.select().from(rooms).where(and(
        eq(rooms.id, roomId),
        eq(rooms.teacherId, teacherId)
      ));

      if (roomResult.length === 0) {
        return { success: false };
      }

      const room = roomResult[0];

      // التحقق مما إذا كانت هناك جلسة نشطة بالفعل
      const activeSessions = await db.select().from(gameSessions)
        .where(and(
          eq(gameSessions.roomId, roomId),
          eq(gameSessions.status, 'active')
        ));

      if (activeSessions.length > 0) {
        log(`Room ${roomId} already has an active contest`, 'room');
        return { success: false };
      }

      // إنشاء جلسة لعب جديدة
      const gameSession = await this.gameManager.createGame(teacherId, true, room.maxPlayers, roomId);
      
      if (!gameSession) {
        return { success: false };
      }

      // بدء اللعبة مع مستوى الصعوبة المحدد
      const updatedSession = await this.gameManager.startGame(gameSession.id, difficulty);

      if (!updatedSession) {
        return { success: false };
      }

      return { success: true, gameSession: updatedSession };
    } catch (error) {
      log(`Error starting contest: ${error.message}`, 'room');
      return { success: false };
    }
  }

  /**
   * الحصول على بيانات لوحة تحكم المعلم
   */
  async getTeacherDashboardData(roomId: number, teacherId: number) {
    try {
      // التحقق من وجود الغرفة وأن المعلم هو المالك لها
      const roomResult = await db.select().from(rooms).where(and(
        eq(rooms.id, roomId),
        eq(rooms.teacherId, teacherId)
      ));

      if (roomResult.length === 0) {
        return { success: false };
      }

      // الحصول على الجلسة النشطة الحالية
      const activeSessions = await db.select().from(gameSessions)
        .where(and(
          eq(gameSessions.roomId, roomId),
          eq(gameSessions.status, 'active')
        ));

      if (activeSessions.length === 0) {
        return {
          success: true,
          dashboard: {
            roomId,
            activeStudents: [],
            gameStats: { questionsAnswered: 0, correctAnswers: 0, averageScore: 0 }
          }
        };
      }

      const activeSession = activeSessions[0];

      // الحصول على بيانات اللاعبين النشطين
      const playerSessionsData = await db.select()
        .from(playerSessions)
        .where(eq(playerSessions.sessionId, activeSession.id));

      // الحصول على معلومات المستخدمين
      const userIds = playerSessionsData.map(ps => ps.userId);
      const usersData = await db.select().from(users).where(
        userIds.length > 0 ? 
          eq(users.id, userIds[0]) : // DRizzle يحتاج على الأقل لشرط واحد
          eq(users.id, -1)  // حالة لن تحدث
      );

      // إنشاء قائمة الطلاب النشطين
      const activeStudents = playerSessionsData.map(ps => {
        const user = usersData.find(u => u.id === ps.userId);
        return {
          id: ps.userId,
          username: user ? user.username : 'Unknown',
          status: ps.completedAt ? 'completed' : 'playing',
          score: ps.score,
          progress: ps.progress
        };
      });

      // حساب إحصائيات اللعبة
      const totalQuestions = activeSession.questions.length * playerSessionsData.length;
      const questionsAnswered = playerSessionsData.reduce((total, ps) => total + ps.progress, 0);
      const totalScore = playerSessionsData.reduce((total, ps) => total + ps.score, 0);
      const averageScore = playerSessionsData.length > 0 ? totalScore / playerSessionsData.length : 0;

      // تقدير عدد الإجابات الصحيحة بناءً على متوسط النقاط لكل سؤال
      const pointsPerQuestion = 10; // افتراضي
      const estimatedCorrectAnswers = Math.round(totalScore / pointsPerQuestion);

      return {
        success: true,
        dashboard: {
          roomId,
          activeStudents,
          gameStats: {
            questionsAnswered,
            correctAnswers: estimatedCorrectAnswers,
            averageScore
          }
        }
      };
    } catch (error: any) {
      log(`Error getting teacher dashboard data: ${error?.message || 'Unknown error'}`, 'room');
      return { success: false };
    }
  }
}
