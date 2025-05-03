import { IStorage } from "../storage";
import { GameStage, Player, Question, GameSession } from "@shared/schema";
import { generateQuestionsForStage } from "./questionGenerator";

export class GameManager {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  async createGame(hostId: number, isMultiplayer: boolean, maxPlayers: number, roomId?: number): Promise<GameSession> {
    return this.storage.createGameSession(hostId, isMultiplayer, maxPlayers, roomId);
  }

  async joinGame(gameId: string, playerId: number): Promise<{ game: GameSession | undefined; joined: boolean }> {
    const game = await this.storage.getGameSession(gameId);
    
    if (!game) {
      throw new Error("Game not found");
    }
    
    if (game.status !== "waiting") {
      throw new Error("Cannot join a game that has already started");
    }
    
    if (game.players.length >= game.maxPlayers) {
      throw new Error("Game is full");
    }
    
    const user = await this.storage.getUser(playerId);
    if (!user) {
      throw new Error("Player not found");
    }
    
    // Check if player is already in the game
    if (game.players.some(p => p.id === playerId)) {
      return { game, joined: false };
    }
    
    const player: Player = {
      id: playerId,
      username: user.username,
      score: 0,
      progress: 0,
      attemptsLeft: 3
    };
    
    const updatedGame = await this.storage.addPlayerToGame(gameId, player);
    return { game: updatedGame, joined: true };
  }

  async startGame(gameId: string, difficulty: "easy" | "medium" | "hard" = "easy"): Promise<GameSession | undefined> {
    try {
      const game = await this.storage.getGameSession(gameId);
      
      if (!game) {
        throw new Error("Game not found");
      }
      
      if (game.status !== "waiting") {
        throw new Error("Game has already started");
      }
      
      // Generate questions for the first stage
      const questions = generateQuestionsForStage(game.stage, difficulty);
      
      if (!questions || questions.length === 0) {
        throw new Error("Failed to generate questions for the game");
      }
      
      // Reset player attempt counts
      const updatedPlayers = game.players.map(player => ({
        ...player,
        attemptsLeft: 3,
        progress: 0
      }));
      
      return this.storage.updateGameSession(gameId, {
        status: "active",
        questions,
        currentQuestionIndex: 0,
        players: updatedPlayers,
        difficulty // إضافة مستوى الصعوبة لجلسة اللعب
      });
    } catch (error) {
      console.error(`Error starting game ${gameId}:`, error);
      throw error; // Re-throw to be handled by the caller
    }
  }

  async submitAnswer(gameId: string, playerId: number, answer: number): Promise<{ 
    correct: boolean; 
    points: number; 
    game: GameSession | undefined 
  } | undefined> {
    const game = await this.storage.getGameSession(gameId);
    
    if (!game) {
      throw new Error("Game not found");
    }
    
    if (game.status !== "active") {
      throw new Error("Game is not active");
    }
    
    const playerIndex = game.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) {
      throw new Error("Player not in game");
    }
    
    const currentQuestion = game.questions[game.currentQuestionIndex];
    if (!currentQuestion) {
      throw new Error("No current question");
    }
    
    const player = game.players[playerIndex];
    if (player.attemptsLeft <= 0) {
      throw new Error("No attempts left");
    }
    
    const correct = answer === currentQuestion.answer;
    let points = 0;
    
    // Calculate points based on attempts
    if (correct) {
      // 3 points for first attempt, 2 for second, 1 for third
      points = player.attemptsLeft;
      
      // Update player's data
      const updatedPlayers = [...game.players];
      updatedPlayers[playerIndex] = {
        ...player,
        score: player.score + points,
        progress: player.progress + 1,
        attemptsLeft: 3 // Reset attempts for next question
      };
      
      // Update player's global score in database
      await this.storage.updateUserScore(playerId, points);
      
      // Update game session
      const updatedGame = await this.storage.updateGameSession(gameId, {
        players: updatedPlayers
      });
      
      return { correct, points, game: updatedGame };
    } else {
      // Wrong answer, reduce attempts
      const updatedPlayers = [...game.players];
      updatedPlayers[playerIndex] = {
        ...player,
        attemptsLeft: player.attemptsLeft - 1
      };
      
      // If no attempts left, move to the next question automatically
      if (player.attemptsLeft === 1) { // This is the last attempt
        updatedPlayers[playerIndex] = {
          ...updatedPlayers[playerIndex],
          progress: player.progress + 1,
          attemptsLeft: 3 // Reset attempts for next question
        };
      }
      
      // Update game session
      const updatedGame = await this.storage.updateGameSession(gameId, {
        players: updatedPlayers
      });
      
      return { correct, points, game: updatedGame };
    }
  }

  async nextQuestion(gameId: string): Promise<{ 
    game: GameSession | undefined; 
    completed: boolean;
    nextStage: GameStage | null;
  }> {
    const game = await this.storage.getGameSession(gameId);
    
    if (!game) {
      throw new Error("Game not found");
    }
    
    if (game.status !== "active") {
      throw new Error("Game is not active");
    }
    
    // Check if we've completed all questions in this stage
    const isLastQuestion = game.currentQuestionIndex === game.questions.length - 1;
    
    if (isLastQuestion) {
      // Stage completed, determine next stage
      let nextStage: GameStage | null = null;
      
      switch (game.stage) {
        case "BASIC_ADDITION_SUBTRACTION":
          nextStage = "COMPLEX_ADDITION_SUBTRACTION";
          break;
        case "COMPLEX_ADDITION_SUBTRACTION":
          nextStage = "MULTIPLICATION";
          break;
        case "MULTIPLICATION":
          nextStage = "DIVISION";
          break;
        case "DIVISION":
          // Game fully completed
          nextStage = null;
          break;
      }
      
      if (nextStage === null) {
        // Game completed
        await this.storage.updateGameSession(gameId, {
          status: "completed"
        });
      }
      
      const updatedGame = await this.storage.getGameSession(gameId);
      return { game: updatedGame, completed: true, nextStage };
    } else {
      // Move to next question
      const updatedGame = await this.storage.updateGameSession(gameId, {
        currentQuestionIndex: game.currentQuestionIndex + 1
      });
      
      return { game: updatedGame, completed: false, nextStage: null };
    }
  }

  async nextStage(gameId: string): Promise<GameSession | undefined> {
    const game = await this.storage.getGameSession(gameId);
    
    if (!game) {
      throw new Error("Game not found");
    }
    
    // Determine next stage
    let nextStage: GameStage | null = null;
    
    switch (game.stage) {
      case "BASIC_ADDITION_SUBTRACTION":
        nextStage = "COMPLEX_ADDITION_SUBTRACTION";
        break;
      case "COMPLEX_ADDITION_SUBTRACTION":
        nextStage = "MULTIPLICATION";
        break;
      case "MULTIPLICATION":
        nextStage = "DIVISION";
        break;
      case "DIVISION":
        // Game fully completed
        nextStage = null;
        break;
    }
    
    if (!nextStage) {
      // Game completed
      return this.storage.updateGameSession(gameId, {
        status: "completed"
      });
    }
    
    // Generate questions for the next stage
    const questions = generateQuestionsForStage(nextStage, "easy");
    
    // Reset player attempt counts
    const updatedPlayers = game.players.map(player => ({
      ...player,
      attemptsLeft: 3,
      progress: 0
    }));
    
    return this.storage.updateGameSession(gameId, {
      stage: nextStage,
      questions,
      currentQuestionIndex: 0,
      players: updatedPlayers
    });
  }

  async checkAllPlayersCompleted(gameId: string): Promise<boolean> {
    const game = await this.storage.getGameSession(gameId);
    
    if (!game || game.status !== "active") {
      return false;
    }
    
    // Check if all players have completed the current question
    return game.players.every(player => player.attemptsLeft === 3);
  }

  async removePlayerFromAllGames(playerId: number): Promise<(GameSession | undefined)[]> {
    const games = await this.storage.getAllActiveSessions();
    const updatedGames: (GameSession | undefined)[] = [];
    
    for (const game of games) {
      if (game.players.some(p => p.id === playerId)) {
        const updatedGame = await this.storage.removePlayerFromGame(game.id, playerId);
        updatedGames.push(updatedGame);
      }
    }
    
    return updatedGames;
  }
}
