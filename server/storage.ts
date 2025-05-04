import { users, gameSessions, type User, type InsertUser, type GameSession, type Player, type Question, type GameStage } from "@shared/schema";
import { nanoid } from "nanoid";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserName(userId: number, username: string): Promise<User | undefined>;
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
      id,
      username: insertUser.username,
      password: insertUser.password,
      score: 0,
      isGuest: insertUser.isGuest ?? null,
      isTeacher: insertUser.isTeacher ?? null,
      createdAt: new Date() 
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserName(userId: number, username: string): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;
    
    const updatedUser = {
      ...user,
      username: username
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async updateUserScore(userId: number, score: number): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;
    
    // Handle null scores by treating them as 0
    const currentScore = user.score || 0;
    
    const updatedUser = {
      ...user,
      score: currentScore + score
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
import { eq, and, or } from 'drizzle-orm';

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
  
  async updateUserName(userId: number, username: string): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;
    
    const result = await db
      .update(users)
      .set({ username: username })
      .where(eq(users.id, userId))
      .returning();
    
    return result.length > 0 ? result[0] : undefined;
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
  
  // Ahora implementamos sesiones de juego en la base de datos
  async createGameSession(hostId: number, isMultiplayer: boolean, maxPlayers: number, roomId?: number): Promise<GameSession> {
    try {
      const user = await this.getUser(hostId);
      if (!user) {
        throw new Error(`User with ID ${hostId} not found`);
      }
      
      const player: Player = {
        id: hostId,
        username: user.username,
        score: 0,
        progress: 0,
        attemptsLeft: 3
      };
      
      // Crear una sesión con un ID único
      const sessionId = nanoid();
      const initialStage = 'BASIC_ADDITION_SUBTRACTION';
      
      // Generamos preguntas desde el principio para evitar el problema de juegos sin preguntas
      // Importamos directamente la función para evitar problemas de dependencias circulares
      const { generateQuestionsForStage } = await import('./game/questionGenerator');
      const initialQuestions = generateQuestionsForStage(initialStage, 'easy');
      
      if (!initialQuestions || initialQuestions.length === 0) {
        console.error('Error generating initial questions for game session');
      }
      
      const session: GameSession = {
        id: sessionId,
        stage: initialStage,
        hostId,
        players: [player],
        currentQuestionIndex: 0,
        questions: initialQuestions || [], // Asignamos las preguntas generadas o array vacío si falló
        maxPlayers,
        isMultiplayer,
        status: 'waiting',
        roomId,
        difficulty: 'easy' // Valor predeterminado
      };
      
      // Guardar en la base de datos - necesitamos serializar manualmente las preguntas
      // مسار بديل لإدراج البيانات
      const queryText = `
        INSERT INTO game_sessions 
        (id, host_id, room_id, max_players, is_multiplayer, status, stage, current_question_index, questions, difficulty, created_at) 
        VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `;
      
      const values = [
        sessionId,
        session.hostId,
        session.roomId || null,
        session.maxPlayers,
        session.isMultiplayer,
        session.status,
        session.stage,
        session.currentQuestionIndex,
        JSON.stringify(session.questions),
        session.difficulty || 'easy',
        new Date()
      ];
      
      await pool.query(queryText, values);
      
      console.log(`Game session ${sessionId} created with ${session.questions.length} questions and saved to database`);
      return session;
    } catch (error) {
      console.error('Error creating game session:', error);
      throw error;
    }
  }
  
  async getGameSession(id: string): Promise<GameSession | undefined> {
    try {
      const result = await db.select().from(gameSessions).where(eq(gameSessions.id, id));
      
      if (result.length === 0) {
        return undefined;
      }
      
      const dbSession = result[0];
      // Convertir a un objeto GameSession
      let questions = [];
      try {
        // Intenta parsear las preguntas si vienen como string
        if (typeof dbSession.questions === 'string') {
          questions = JSON.parse(dbSession.questions);
        } else {
          // Si no es string, asumimos que ya es un array
          questions = dbSession.questions || [];
        }
      } catch (error) {
        console.error('Error parsing questions:', error);
        // Si hay error, usamos un array vacío
        questions = [];
      }

      const session: GameSession = {
        id: dbSession.id,
        stage: dbSession.stage as GameStage,
        hostId: dbSession.hostId,
        players: [], // Cargar jugadores si es necesario
        currentQuestionIndex: dbSession.currentQuestionIndex ?? 0,
        questions: questions,
        maxPlayers: dbSession.maxPlayers ?? 100,
        isMultiplayer: dbSession.isMultiplayer ?? true,
        status: dbSession.status as "waiting" | "active" | "completed",
        roomId: dbSession.roomId ?? undefined,
        difficulty: dbSession.difficulty ?? undefined
      };
      
      return session;
    } catch (error) {
      console.error('Error getting game session:', error);
      return undefined;
    }
  }
  
  async updateGameSession(id: string, updates: Partial<GameSession>): Promise<GameSession | undefined> {
    try {
      // Primero verificamos que la sesión exista
      const existingSession = await this.getGameSession(id);
      if (!existingSession) {
        return undefined;
      }
      
      // Preparamos los datos para actualizar en la base de datos
      const updateData: any = {};
      
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.stage !== undefined) updateData.stage = updates.stage;
      if (updates.currentQuestionIndex !== undefined) updateData.currentQuestionIndex = updates.currentQuestionIndex;
      if (updates.questions !== undefined) updateData.questions = updates.questions;
      if (updates.difficulty !== undefined) updateData.difficulty = updates.difficulty;
      
      // Actualizamos la sesión en la base de datos
      const result = await db.update(gameSessions)
                            .set(updateData)
                            .where(eq(gameSessions.id, id))
                            .returning();
      
      if (result.length === 0) {
        return undefined;
      }
      
      // Obtenemos la sesión actualizada
      const updatedSession = await this.getGameSession(id);
      return updatedSession;
    } catch (error) {
      console.error('Error updating game session:', error);
      return undefined;
    }
  }
  
  async addPlayerToGame(gameId: string, player: Player): Promise<GameSession | undefined> {
    try {
      // Como no tenemos tabla para jugadores todavía, obtenemos la sesión
      // actualizamos en memoria y luego guardamos de nuevo
      const session = await this.getGameSession(gameId);
      if (!session) return undefined;
      
      // Check if player already exists in the session
      if (session.players.some(p => p.id === player.id)) {
        return session;
      }
      
      // Check if game is full
      if (session.players.length >= session.maxPlayers) {
        return undefined;
      }
      
      // Add player to session in memory
      session.players.push(player);
      return session;
    } catch (error) {
      console.error('Error adding player to game:', error);
      return undefined;
    }
  }
  
  async removePlayerFromGame(gameId: string, playerId: number): Promise<GameSession | undefined> {
    try {
      const session = await this.getGameSession(gameId);
      if (!session) return undefined;
      
      // Remove player from memory
      session.players = session.players.filter(p => p.id !== playerId);
      return session;
    } catch (error) {
      console.error('Error removing player from game:', error);
      return undefined;
    }
  }
  
  async getAllActiveSessions(): Promise<GameSession[]> {
    try {
      console.log('Getting all active game sessions from database...');
      const result = await db.select().from(gameSessions)
        .where(or(
          eq(gameSessions.status, 'active'),
          eq(gameSessions.status, 'waiting')
        ));
      
      console.log(`Found ${result.length} active game sessions in database`);
      
      // Convertir los resultados a objetos GameSession
      const sessions = result.map(dbSession => {
        let questions = [];
        try {
          // Intenta parsear las preguntas si vienen como string
          if (typeof dbSession.questions === 'string') {
            questions = JSON.parse(dbSession.questions);
          } else {
            // Si no es string, asumimos que ya es un array
            questions = dbSession.questions || [];
          }
        } catch (error) {
          console.error(`Error parsing questions for session ${dbSession.id}:`, error);
          // Si hay error, usamos un array vacío
          questions = [];
        }

        return {
          id: dbSession.id,
          stage: dbSession.stage as GameStage,
          hostId: dbSession.hostId,
          players: [], // Cargar jugadores si es necesario
          currentQuestionIndex: dbSession.currentQuestionIndex ?? 0,
          questions: questions,
          maxPlayers: dbSession.maxPlayers ?? 100,
          isMultiplayer: dbSession.isMultiplayer ?? true,
          status: dbSession.status as "waiting" | "active" | "completed",
          roomId: dbSession.roomId ?? undefined,
          difficulty: dbSession.difficulty ?? undefined
        };
      });
      
      return sessions;
    } catch (error) {
      console.error('Error getting active game sessions:', error);
      return [];
    }
  }
}

export const storage = new DatabaseStorage();
