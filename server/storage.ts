import { users, type User, type InsertUser, type GameSession, type Player, type Question } from "@shared/schema";
import { nanoid } from "nanoid";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserScore(userId: number, score: number): Promise<User | undefined>;
  
  // Game session methods
  createGameSession(hostId: number, isMultiplayer: boolean, maxPlayers: number, roomId?: number): Promise<GameSession>;
  getGameSession(id: string): Promise<GameSession | undefined>;
  updateGameSession(id: string, updates: Partial<GameSession>): Promise<GameSession | undefined>;
  addPlayerToGame(gameId: string, player: Player): Promise<GameSession | undefined>;
  removePlayerFromGame(gameId: string, playerId: number): Promise<GameSession | undefined>;
  getAllActiveSessions(): Promise<GameSession[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private gameSessions: Map<string, GameSession>;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.gameSessions = new Map();
    this.currentId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { 
      ...insertUser, 
      id, 
      score: 0,
      createdAt: new Date() 
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserScore(userId: number, score: number): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;
    
    const updatedUser = {
      ...user,
      score: user.score + score
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async createGameSession(hostId: number, isMultiplayer: boolean, maxPlayers: number, roomId?: number): Promise<GameSession> {
    const host = await this.getUser(hostId);
    if (!host) {
      throw new Error("Host user not found");
    }

    const sessionId = nanoid();
    const player: Player = {
      id: hostId,
      username: host.username,
      score: 0,
      progress: 0,
      attemptsLeft: 3
    };

    const session: GameSession = {
      id: sessionId,
      stage: "BASIC_ADDITION_SUBTRACTION",
      hostId,
      players: [player],
      currentQuestionIndex: 0,
      questions: [],
      maxPlayers,
      isMultiplayer,
      status: "waiting",
      roomId // إضافة معرف الغرفة إذا كان موجوداً
    };

    this.gameSessions.set(sessionId, session);
    return session;
  }

  async getGameSession(id: string): Promise<GameSession | undefined> {
    return this.gameSessions.get(id);
  }

  async updateGameSession(id: string, updates: Partial<GameSession>): Promise<GameSession | undefined> {
    const session = await this.getGameSession(id);
    if (!session) return undefined;

    const updatedSession = { ...session, ...updates };
    this.gameSessions.set(id, updatedSession);
    return updatedSession;
  }

  async addPlayerToGame(gameId: string, player: Player): Promise<GameSession | undefined> {
    const session = await this.getGameSession(gameId);
    if (!session) return undefined;
    
    if (session.players.length >= session.maxPlayers) {
      throw new Error("Game session is full");
    }
    
    if (session.players.find(p => p.id === player.id)) {
      // Player already in game, update their data
      const updatedPlayers = session.players.map(p => 
        p.id === player.id ? player : p
      );
      
      const updatedSession = {
        ...session,
        players: updatedPlayers
      };
      
      this.gameSessions.set(gameId, updatedSession);
      return updatedSession;
    }
    
    // Add new player
    const updatedSession = {
      ...session,
      players: [...session.players, player]
    };
    
    this.gameSessions.set(gameId, updatedSession);
    return updatedSession;
  }

  async removePlayerFromGame(gameId: string, playerId: number): Promise<GameSession | undefined> {
    const session = await this.getGameSession(gameId);
    if (!session) return undefined;
    
    const updatedPlayers = session.players.filter(p => p.id !== playerId);
    
    // If no players left, delete the session
    if (updatedPlayers.length === 0) {
      this.gameSessions.delete(gameId);
      return undefined;
    }
    
    // If host leaves, assign a new host
    let updatedHostId = session.hostId;
    if (playerId === session.hostId && updatedPlayers.length > 0) {
      updatedHostId = updatedPlayers[0].id;
    }
    
    const updatedSession = {
      ...session,
      players: updatedPlayers,
      hostId: updatedHostId
    };
    
    this.gameSessions.set(gameId, updatedSession);
    return updatedSession;
  }

  async getAllActiveSessions(): Promise<GameSession[]> {
    return Array.from(this.gameSessions.values()).filter(
      session => session.status !== "completed"
    );
  }
}

import { db } from './db';
import { eq } from 'drizzle-orm';

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result.length > 0 ? result[0] : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result.length > 0 ? result[0] : undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Ensure nullable fields have explicit values
    const userToInsert = {
      ...insertUser,
      score: 0,
      isGuest: insertUser.isGuest ?? null,
      isTeacher: insertUser.isTeacher ?? null,
      createdAt: new Date()
    };
    
    const result = await db.insert(users).values(userToInsert).returning();
    return result[0];
  }
  
  async updateUserScore(userId: number, score: number): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;
    
    // Handle null scores by treating them as 0
    const currentScore = user.score || 0;
    const newScore = currentScore + score;
    
    const result = await db
      .update(users)
      .set({ score: newScore })
      .where(eq(users.id, userId))
      .returning();
    
    return result.length > 0 ? result[0] : undefined;
  }
  
  // Game session methods are still in memory for now - will implement in database later
  private gameSessions: Map<string, GameSession> = new Map();
  
  async createGameSession(hostId: number, isMultiplayer: boolean, maxPlayers: number, roomId?: number): Promise<GameSession> {
    const player: Player = {
      id: hostId,
      username: (await this.getUser(hostId))?.username || 'Unknown',
      score: 0,
      progress: 0,
      attemptsLeft: 3
    };
    
    const session: GameSession = {
      id: nanoid(),
      stage: 'waiting',
      hostId,
      players: [player],
      currentQuestionIndex: 0,
      questions: [],
      maxPlayers,
      isMultiplayer,
      status: 'waiting',
      roomId
    };
    
    this.gameSessions.set(session.id, session);
    return session;
  }
  
  async getGameSession(id: string): Promise<GameSession | undefined> {
    return this.gameSessions.get(id);
  }
  
  async updateGameSession(id: string, updates: Partial<GameSession>): Promise<GameSession | undefined> {
    const session = this.gameSessions.get(id);
    if (!session) return undefined;
    
    const updatedSession = { ...session, ...updates };
    this.gameSessions.set(id, updatedSession);
    return updatedSession;
  }
  
  async addPlayerToGame(gameId: string, player: Player): Promise<GameSession | undefined> {
    const session = this.gameSessions.get(gameId);
    if (!session) return undefined;
    
    // Check if player already exists in the session
    if (session.players.some(p => p.id === player.id)) {
      return session;
    }
    
    // Add player to session
    const updatedSession = { 
      ...session, 
      players: [...session.players, player] 
    };
    
    this.gameSessions.set(gameId, updatedSession);
    return updatedSession;
  }
  
  async removePlayerFromGame(gameId: string, playerId: number): Promise<GameSession | undefined> {
    const session = this.gameSessions.get(gameId);
    if (!session) return undefined;
    
    const updatedSession = { 
      ...session, 
      players: session.players.filter(p => p.id !== playerId) 
    };
    
    this.gameSessions.set(gameId, updatedSession);
    return updatedSession;
  }
  
  async getAllActiveSessions(): Promise<GameSession[]> {
    return Array.from(this.gameSessions.values())
      .filter(session => session.status !== 'completed');
  }
}

export const storage = new DatabaseStorage();
