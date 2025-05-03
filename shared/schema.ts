import { pgTable, text, serial, integer, boolean, timestamp, uuid, varchar, foreignKey, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { nanoid } from "nanoid";

// المستخدمين (الطلاب والمعلمين)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  score: integer("score").default(0),
  isGuest: boolean("is_guest").default(false),
  isTeacher: boolean("is_teacher").default(false), // إضافة حقل للمعلمين
  createdAt: timestamp("created_at").defaultNow(),
});

// جدول الغرف (للفصول الدراسية)
export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 8 }).notNull().unique(), // رمز الغرفة مثل ABC123
  name: text("name").notNull(), // اسم الغرفة أو الفصل
  teacherId: integer("teacher_id").notNull().references(() => users.id), // المعلم المسؤول
  maxPlayers: integer("max_players").default(100), // الحد الأقصى للاعبين
  isActive: boolean("is_active").default(true), // هل الغرفة نشطة؟
  contestMode: varchar("contest_mode", { length: 20 }).default("synchronized"), // نوع المسابقة: متزامنة أو غير متزامنة
  startTime: timestamp("start_time").defaultNow(), // وقت بدء المسابقة
  endTime: timestamp("end_time"), // وقت انتهاء المسابقة (للمسابقات غير المتزامنة)
  createdAt: timestamp("created_at").defaultNow(),
});

// جدول الجلسات (الألعاب الجارية)
export const gameSessions = pgTable("game_sessions", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()), // معرف فريد للجلسة
  roomId: integer("room_id").references(() => rooms.id), // الغرفة التي تنتمي إليها (اختياري)
  stage: text("stage").notNull(), // المرحلة الحالية
  hostId: integer("host_id").notNull().references(() => users.id), // المضيف أو المعلم
  currentQuestionIndex: integer("current_question_index").default(0),
  questions: jsonb("questions").notNull().$type<Question[]>(), // الأسئلة كـ JSON
  maxPlayers: integer("max_players").default(100),
  isMultiplayer: boolean("is_multiplayer").default(true),
  status: varchar("status", { length: 20 }).default("waiting"),
  difficulty: varchar("difficulty", { length: 20 }).default("easy"), // مستوى الصعوبة
  createdAt: timestamp("created_at").defaultNow(),
});

// جدول اللاعبين في كل جلسة
export const playerSessions = pgTable("player_sessions", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => gameSessions.id),
  userId: integer("user_id").notNull().references(() => users.id),
  score: integer("score").default(0),
  progress: integer("progress").default(0),
  attemptsLeft: integer("attempts_left").default(3),
  completedAt: timestamp("completed_at"), // وقت إكمال اللعبة
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    // لا يمكن للاعب واحد أن ينضم إلى نفس الجلسة مرتين
    uniquePlayerSession: uniqueIndex("unique_player_session").on(table.sessionId, table.userId),
  };
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  isGuest: true,
  isTeacher: true,
});

export const insertRoomSchema = createInsertSchema(rooms).pick({
  name: true,
  teacherId: true,
  maxPlayers: true,
  contestMode: true,
  endTime: true,
});

export const insertGameSessionSchema = createInsertSchema(gameSessions).pick({
  roomId: true,
  stage: true,
  hostId: true,
  maxPlayers: true,
  isMultiplayer: true,
  difficulty: true,
});

export const gameStages = z.enum([
  "BASIC_ADDITION_SUBTRACTION",
  "COMPLEX_ADDITION_SUBTRACTION",
  "MULTIPLICATION",
  "DIVISION",
]);

export const questionTypes = z.enum([
  "ADDITION",
  "SUBTRACTION",
  "MULTIPLICATION",
  "DIVISION",
]);

export type GameStage = z.infer<typeof gameStages>;
export type QuestionType = z.infer<typeof questionTypes>;

export interface Question {
  id: string;
  text: string;
  answer: number;
  type: QuestionType;
}

export interface GameSession {
  id: string;
  stage: GameStage;
  hostId: number;
  players: Player[];
  currentQuestionIndex: number;
  questions: Question[];
  maxPlayers: number;
  isMultiplayer: boolean;
  status: "waiting" | "active" | "completed";
  roomId?: number; // إضافة معرف الغرفة لربط جلسة اللعب بالغرفة
  difficulty?: string; // إضافة مستوى الصعوبة
}

export interface Player {
  id: number;
  username: string;
  score: number;
  progress: number;
  attemptsLeft: number;
}

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// تعريف أنواع جديدة لدعم الغرف والمسابقات
export type Room = typeof rooms.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type GameSessionDB = typeof gameSessions.$inferSelect;
export type InsertGameSession = z.infer<typeof insertGameSessionSchema>;
export type PlayerSession = typeof playerSessions.$inferSelect;

// WebSocket Message Types
export type ServerMessage = 
  // رسائل اللعبة الأساسية
  | { type: "game_state_update"; payload: GameSession }
  | { type: "player_joined"; payload: { player: Player; gameId: string } }
  | { type: "player_left"; payload: { playerId: number; gameId: string } }
  | { type: "answer_result"; payload: { correct: boolean; playerId: number; points: number; gameId: string } }
  | { type: "game_started"; payload: GameSession }
  | { type: "stage_completed"; payload: { gameId: string; nextStage: GameStage | null } }
  | { type: "game_completed"; payload: { gameId: string; leaderboard: Player[] } }
  
  // رسائل نظام الغرف والمسابقات
  | { type: "room_created"; payload: Room }
  | { type: "room_joined"; payload: { roomId: number; userId: number; username: string } }
  | { type: "room_left"; payload: { roomId: number; userId: number } }
  | { type: "room_list"; payload: Room[] }
  | { type: "contest_started"; payload: { roomId: number; gameSession: GameSession } }
  | { type: "contest_ended"; payload: { roomId: number; leaderboard: Player[] } }
  | { type: "leaderboard_update"; payload: { roomId: number; leaderboard: Player[] } }
  
  // رسائل لوحة تحكم المعلم
  | { type: "teacher_dashboard_data"; payload: { 
      roomId: number; 
      activeStudents: { id: number; username: string; status: string; score: number; progress: number }[]; 
      gameStats: { questionsAnswered: number; correctAnswers: number; averageScore: number } 
    } 
  }
  
  // رسائل الإشعارات
  | { type: "student_joined_room"; payload: { 
      roomId: number; 
      roomName: string;
      studentId: number; 
      studentName: string;
      timestamp: string;
    } 
  }
  
  // رسالة الخطأ
  | { type: "error"; payload: { message: string } };

export type ClientMessage = 
  // رسائل اللعبة الأساسية
  | { type: "join_game"; payload: { gameId: string; playerId: number } }
  | { type: "create_game"; payload: { isMultiplayer: boolean; maxPlayers: number; playerId: number; roomId?: number } }
  | { type: "start_game"; payload: { gameId: string; difficulty?: "easy" | "medium" | "hard" } }
  | { type: "submit_answer"; payload: { gameId: string; playerId: number; answer: number } }
  | { type: "next_question"; payload: { gameId: string } }
  | { type: "next_stage"; payload: { gameId: string } }
  
  // رسائل نظام الغرف
  | { type: "create_room"; payload: { name: string; teacherId: number; maxPlayers?: number; contestMode?: string; endTime?: Date } }
  | { type: "join_room"; payload: { roomCode: string; userId: number } }
  | { type: "join_room_by_id"; payload: { roomId: number; userId: number } }
  | { type: "leave_room"; payload: { roomId: number; userId: number } }
  | { type: "get_room_list"; payload: { teacherId?: number } } // إذا تم تحديد teacherId سيتم الحصول على غرف المعلم فقط
  
  // رسائل المسابقة ولوحة تحكم المعلم
  | { type: "start_contest"; payload: { roomId: number; teacherId: number; difficulty?: "easy" | "medium" | "hard" } }
  | { type: "end_contest"; payload: { roomId: number; teacherId: number } }
  | { type: "get_dashboard_data"; payload: { roomId: number; teacherId: number } }
  | { type: "get_leaderboard"; payload: { roomId: number } };
  
