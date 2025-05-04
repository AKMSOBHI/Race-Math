import { db } from '../db';
import { log } from '../vite';
import { nanoid } from 'nanoid';
import { eq, and, inArray } from 'drizzle-orm';
import { 
  rooms, 
  playerSessions, 
  gameSessions, 
  users, 
  roomParticipants,
  Room, 
  Player, 
  GameSession,
  RoomParticipant
} from '@shared/schema';
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
      log(`Error creating room: ${error instanceof Error ? error.message : String(error)}`, 'room');
      return null;
    }
  }

  /**
   * الحصول على غرفة باستخدام الرمز
   */
  async getRoomByCode(code: string): Promise<Room | null> {
    try {
      log(`Searching for room with code: '${code}'`, 'room');
      // التأكد من أن رمز الغرفة نظيف (إزالة المسافات وتحويله للأحرف الكبيرة)
      const cleanCode = code.trim().toUpperCase();
      log(`Clean room code: '${cleanCode}'`, 'room');
      
      // الحصول على جميع الغرف وعرضها للتشخيص
      const allRooms = await db.select().from(rooms);
      log(`Total rooms in database: ${allRooms.length}`, 'room');
      allRooms.forEach(r => log(`Room code: '${r.code}', name: ${r.name}, id: ${r.id}`, 'room'));
      
      // البحث عن الغرفة باستخدام الرمز المنظف
      const room = await db.select().from(rooms).where(eq(rooms.code, cleanCode));
      
      if (room.length > 0) {
        log(`Room found: ${room[0].name} (ID: ${room[0].id})`, 'room');
        return room[0];
      } else {
        log(`No room found with code: '${cleanCode}'`, 'room');
        return null;
      }
    } catch (error: any) {
      log(`Error getting room by code: ${error?.message}`, 'room');
      return null;
    }
  }

  /**
   * الحصول على قائمة الغرف النشطة
   */
  async getActiveRooms(teacherId?: number): Promise<Room[]> {
    try {
      // بناء الاستعلام بناءً على وجود معرف المعلم
      let result;
      if (teacherId) {
        result = await db.select().from(rooms).where(
          and(
            eq(rooms.isActive, true),
            eq(rooms.teacherId, teacherId)
          )
        );
      } else {
        result = await db.select().from(rooms).where(eq(rooms.isActive, true));
      }
      
      return result;
    } catch (error) {
      log(`Error getting active rooms: ${error instanceof Error ? error.message : String(error)}`, 'room');
      return [];
    }
  }

  /**
   * انضمام طالب إلى غرفة
   */
  async joinRoom(roomId: number, userId: number, fullName?: string): Promise<{ success: boolean; username?: string }> {
    try {
      // التحقق من وجود الغرفة والطالب
      const roomResult = await db.select().from(rooms).where(eq(rooms.id, roomId));
      const userResult = await db.select().from(users).where(eq(users.id, userId));

      if (roomResult.length === 0) {
        log(`Room not found with ID: ${roomId} during join attempt`, 'room');
        return { success: false };
      }

      if (userResult.length === 0) {
        log(`User not found with ID: ${userId} during join attempt`, 'room');
        return { success: false };
      }

      const room = roomResult[0];
      const user = userResult[0];
      
      // إذا تم توفير اسم كامل، فسنقوم بتحديث اسم المستخدم
      if (fullName && fullName.trim() !== '') {
        try {
          // تحديث اسم المستخدم بالاسم الكامل المقدم
          await db.update(users)
            .set({ username: fullName.trim() })
            .where(eq(users.id, userId));
          
          log(`Updated username for user ${userId} to "${fullName.trim()}"`, 'room');
          user.username = fullName.trim(); // تحديث الاسم في الكائن المحلي أيضاً
        } catch (error) {
          log(`Error updating username: ${error instanceof Error ? error.message : String(error)}`, 'room');
          // نستمر في السير حتى لو فشل تحديث الاسم
        }
      }

      // التحقق مما إذا كانت الغرفة نشطة
      if (!room.isActive) {
        log(`Room is not active: ${roomId}`, 'room');
        return { success: false };
      }
      
      // إضافة الطالب إلى جدول المشاركين في الغرفة
      // التحقق من عدم وجود الطالب بالفعل في الغرفة
      const existingParticipant = await db.select().from(roomParticipants)
        .where(and(
          eq(roomParticipants.roomId, roomId),
          eq(roomParticipants.userId, userId)
        ));
      
      if (existingParticipant.length === 0) {
        // إضافة الطالب كمشارك جديد في الغرفة
        // الطلاب غير معتمدين بشكل افتراضي
        await db.insert(roomParticipants).values({
          roomId: roomId,
          userId: userId,
          isApproved: false, // الطالب بحاجة إلى موافقة المعلم
        });
        
        log(`Added user ${userId} (${user.username}) to room ${roomId} participants`, 'room');
      } else {
        // الطالب موجود بالفعل في الغرفة
        log(`User ${userId} (${user.username}) already in room ${roomId}`, 'room');
      }

      // التحقق من عدد اللاعبين الحاليين في الغرفة
      const activeSessions = await db.select().from(gameSessions)
        .where(and(
          eq(gameSessions.roomId, roomId),
          eq(gameSessions.status, 'active')
        ));

      if (activeSessions.length > 0) {
        // إذا كانت هناك جلسة نشطة، نقوم بإضافة اللاعب إليها
        // لكن فقط إذا كان معتمدًا من قبل المعلم
        const isApproved = existingParticipant.length > 0 ? existingParticipant[0].isApproved : false;
        
        if (isApproved) {
          const gameSession = activeSessions[0];
          const result = await this.gameManager.joinGame(gameSession.id, userId);
          
          if (result.joined) {
            return { success: true, username: user.username };
          }
        }
      }

      // إذا لم تكن هناك جلسة نشطة، فاللاعب سينتظر بدء المسابقة
      return { success: true, username: user.username };
    } catch (error) {
      log(`Error joining room: ${error instanceof Error ? error.message : String(error)}`, 'room');
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
      const maxPlayers: number = room.maxPlayers !== null ? room.maxPlayers : 100; // Use default 100 if null
      const gameSession = await this.gameManager.createGame(teacherId, true, maxPlayers, roomId);
      
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
      log(`Error starting contest: ${error instanceof Error ? error.message : String(error)}`, 'room');
      return { success: false };
    }
  }

  /**
   * الحصول على قائمة الطلاب المنتظرين الموافقة
   */
  async getWaitingStudents(roomId: number, teacherId: number): Promise<{
    success: boolean;
    students?: {
      id: number;
      username: string;
      isApproved: boolean;
      joinedAt: string;
    }[];
  }> {
    try {
      // التحقق من وجود الغرفة وأن المعلم هو المالك لها
      const roomResult = await db.select().from(rooms).where(and(
        eq(rooms.id, roomId),
        eq(rooms.teacherId, teacherId)
      ));

      if (roomResult.length === 0) {
        log(`Room not found or teacher is not the owner: ${roomId}, ${teacherId}`, 'room');
        return { success: false };
      }

      // الحصول على جميع المشاركين في الغرفة
      const participants = await db.select()
        .from(roomParticipants)
        .where(eq(roomParticipants.roomId, roomId));
      
      // الحصول على معلومات المستخدمين
      const userIds = participants.map(p => p.userId);
      const usersData = userIds.length > 0 ? 
        await db.select().from(users).where(inArray(users.id, userIds)) : 
        [];
      
      // تجميع البيانات
      const students = participants.map(participant => {
        const user = usersData.find(u => u.id === participant.userId);
        return {
          id: participant.userId,
          username: user ? user.username : 'Unknown',
          isApproved: participant.isApproved,
          joinedAt: participant.joinedAt ? participant.joinedAt.toISOString() : new Date().toISOString()
        };
      });

      return { success: true, students };
    } catch (error) {
      log(`Error getting waiting students: ${error instanceof Error ? error.message : String(error)}`, 'room');
      return { success: false };
    }
  }

  /**
   * موافقة أو رفض الطالب
   */
  async approveStudent(roomId: number, teacherId: number, studentId: number, approve: boolean): Promise<{
    success: boolean;
    studentUpdated?: boolean;
  }> {
    try {
      // التحقق من وجود الغرفة وأن المعلم هو المالك لها
      const roomResult = await db.select().from(rooms).where(and(
        eq(rooms.id, roomId),
        eq(rooms.teacherId, teacherId)
      ));

      if (roomResult.length === 0) {
        log(`Room not found or teacher is not the owner: ${roomId}, ${teacherId}`, 'room');
        return { success: false };
      }

      // البحث عن الطالب في الغرفة
      const participantResult = await db.select()
        .from(roomParticipants)
        .where(and(
          eq(roomParticipants.roomId, roomId),
          eq(roomParticipants.userId, studentId)
        ));

      if (participantResult.length === 0) {
        log(`Student ${studentId} not found in room ${roomId}`, 'room');
        return { success: false };
      }

      // تحديث حالة الموافقة
      await db.update(roomParticipants)
        .set({ isApproved: approve })
        .where(and(
          eq(roomParticipants.roomId, roomId),
          eq(roomParticipants.userId, studentId)
        ));

      log(`Student ${studentId} ${approve ? 'approved' : 'rejected'} for room ${roomId}`, 'room');

      // إذا كانت في حالة الرفض، نقوم بإزالة الطالب من الغرفة
      if (!approve) {
        await db.delete(roomParticipants)
          .where(and(
            eq(roomParticipants.roomId, roomId),
            eq(roomParticipants.userId, studentId)
          ));
        
        log(`Student ${studentId} removed from room ${roomId}`, 'room');
      }

      return { success: true, studentUpdated: true };
    } catch (error) {
      log(`Error approving student: ${error instanceof Error ? error.message : String(error)}`, 'room');
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
        log(`Room not found or teacher is not the owner: ${roomId}, ${teacherId}`, 'room');
        return { 
          success: true,
          dashboard: {
            roomId,
            activeStudents: [],
            gameStats: { questionsAnswered: 0, correctAnswers: 0, averageScore: 0 }
          }
        };
      }

      // الحصول على الجلسة النشطة الحالية
      const activeSessions = await db.select().from(gameSessions)
        .where(and(
          eq(gameSessions.roomId, roomId),
          eq(gameSessions.status, 'active')
        ));

      if (activeSessions.length === 0) {
        log(`No active sessions found for room: ${roomId}`, 'room');
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
      let usersData: any[] = [];
      
      if (userIds.length > 0) {
        // تحسين الاستعلام للحصول على معلومات المستخدمين
        usersData = await db.select().from(users).where(eq(users.id, userIds[0]));
        // للحصول على معلومات باقي المستخدمين، يمكن إضافة استعلامات أخرى هنا
      }

      // إنشاء قائمة الطلاب النشطين
      const activeStudents = playerSessionsData.map(ps => {
        const user = usersData.find(u => u?.id === ps.userId);
        return {
          id: ps.userId,
          username: user ? user.username : 'Unknown',
          status: ps.completedAt ? 'completed' : 'playing',
          score: ps.score || 0,
          progress: ps.progress || 0
        };
      });

      // حساب إحصائيات اللعبة
      const questionsLength = Array.isArray(activeSession.questions) ? activeSession.questions.length : 0;
      const totalQuestions = questionsLength * playerSessionsData.length;
      const questionsAnswered = playerSessionsData.reduce((total, ps) => total + (ps.progress || 0), 0);
      const totalScore = playerSessionsData.reduce((total, ps) => total + (ps.score || 0), 0);
      const averageScore = playerSessionsData.length > 0 ? totalScore / playerSessionsData.length : 0;

      // تقدير عدد الإجابات الصحيحة بناءً على متوسط النقاط لكل سؤال
      const pointsPerQuestion = 10; // افتراضي
      const estimatedCorrectAnswers = Math.round(totalScore / pointsPerQuestion);

      log(`Successfully retrieved dashboard data for room: ${roomId}`, 'room');
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
      return { 
        success: true, // نُرجع نجاح مع بيانات فارغة بدلاً من فشل
        dashboard: {
          roomId,
          activeStudents: [],
          gameStats: { questionsAnswered: 0, correctAnswers: 0, averageScore: 0 }
        }
      };
    }
  }
}
