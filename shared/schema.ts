import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  score: integer("score").default(0),
  isGuest: boolean("is_guest").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  isGuest: true,
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

// WebSocket Message Types
export type ServerMessage = 
  | { type: "game_state_update"; payload: GameSession }
  | { type: "player_joined"; payload: { player: Player; gameId: string } }
  | { type: "player_left"; payload: { playerId: number; gameId: string } }
  | { type: "answer_result"; payload: { correct: boolean; playerId: number; points: number; gameId: string } }
  | { type: "game_started"; payload: GameSession }
  | { type: "stage_completed"; payload: { gameId: string; nextStage: GameStage | null } }
  | { type: "game_completed"; payload: { gameId: string; leaderboard: Player[] } }
  | { type: "error"; payload: { message: string } };

export type ClientMessage = 
  | { type: "join_game"; payload: { gameId: string; playerId: number } }
  | { type: "create_game"; payload: { isMultiplayer: boolean; maxPlayers: number; playerId: number } }
  | { type: "start_game"; payload: { gameId: string; difficulty?: "easy" | "medium" | "hard" } }
  | { type: "submit_answer"; payload: { gameId: string; playerId: number; answer: number } }
  | { type: "next_question"; payload: { gameId: string } }
  | { type: "next_stage"; payload: { gameId: string } };
