import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { GameManager } from "./game/gameManager";
import { RoomManager } from "./room/roomManager";
import { z } from "zod";
import { insertUserSchema, type ServerMessage, type ClientMessage } from "@shared/schema";
import { log } from "./vite";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Initialize WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Initialize game manager
  const gameManager = new GameManager(storage);
  
  // Initialize room manager
  const roomManager = new RoomManager(gameManager);
  
  // Store active connections with user IDs
  const connections = new Map<number, WebSocket>();
  
  // User API Routes
  app.post("/api/users/register", async (req, res) => {
    try {
      const validatedUser = insertUserSchema.parse(req.body);
      
      // Check if username is already taken
      const existingUser = await storage.getUserByUsername(validatedUser.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already taken" });
      }
      
      const user = await storage.createUser(validatedUser);
      // Don't return password in response
      const { password, ...userWithoutPassword } = user;
      
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });
  
  app.post("/api/users/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      // Don't return password in response
      const { password: _, ...userWithoutPassword } = user;
      
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Login failed" });
    }
  });
  
  app.post("/api/users/guest", async (req, res) => {
    try {
      const guestName = `Guest-${Math.floor(Math.random() * 10000)}`;
      
      const guestUser = await storage.createUser({
        username: guestName,
        password: "guest-password", // Not used for authentication
        isGuest: true
      });
      
      // Don't return password in response
      const { password, ...userWithoutPassword } = guestUser;
      
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Failed to create guest user" });
    }
  });
  
  app.get("/api/games", async (req, res) => {
    try {
      const sessions = await storage.getAllActiveSessions();
      res.status(200).json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Failed to get game sessions" });
    }
  });

  // WebSocket Connection Handling
  wss.on('connection', (ws) => {
    let userId: number | null = null;
    
    ws.on('message', async (message) => {
      try {
        let data: ClientMessage;
        
        try {
          data = JSON.parse(message.toString()) as ClientMessage;
        } catch (parseError) {
          log(`Invalid message format: ${message.toString().substring(0, 100)}`, 'ws-error');
          sendToClient(ws, {
            type: 'error',
            payload: {
              message: 'Invalid message format'
            }
          });
          return;
        }
        
        switch (data.type) {
          case 'join_game': {
            try {
              userId = data.payload.playerId;
              connections.set(userId, ws);
              
              const result = await gameManager.joinGame(
                data.payload.gameId,
                data.payload.playerId
              );
              
              // Notify all players in the game
              if (result.game) {
                notifyGamePlayers(result.game);
              }
            } catch (error) {
              log(`Error joining game: ${error instanceof Error ? error.message : String(error)}`, 'ws-error');
              sendToClient(ws, {
                type: 'error',
                payload: {
                  message: error instanceof Error ? error.message : 'Failed to join game'
                }
              });
            }
            break;
          }
          
          case 'create_game': {
            try {
              userId = data.payload.playerId;
              connections.set(userId, ws);
              
              const game = await gameManager.createGame(
                data.payload.playerId,
                data.payload.isMultiplayer,
                data.payload.maxPlayers
              );
              
              sendToClient(ws, {
                type: 'game_state_update',
                payload: game
              });
            } catch (error) {
              log(`Error creating game: ${error instanceof Error ? error.message : String(error)}`, 'ws-error');
              sendToClient(ws, {
                type: 'error',
                payload: {
                  message: error instanceof Error ? error.message : 'Failed to create game'
                }
              });
            }
            break;
          }
          
          case 'start_game': {
            try {
              const game = await gameManager.startGame(
                data.payload.gameId,
                data.payload.difficulty || 'easy'
              );
              
              if (game) {
                // Notify all players the game has started
                notifyGamePlayers(game, {
                  type: 'game_started',
                  payload: game
                });
              }
            } catch (error) {
              log(`Error starting game: ${error instanceof Error ? error.message : String(error)}`, 'ws-error');
              sendToClient(ws, {
                type: 'error',
                payload: {
                  message: error instanceof Error ? error.message : 'Failed to start game'
                }
              });
            }
            break;
          }
          
          case 'submit_answer': {
            try {
              if (!userId) {
                sendToClient(ws, {
                  type: 'error',
                  payload: {
                    message: 'User not authenticated'
                  }
                });
                break;
              }
              
              const result = await gameManager.submitAnswer(
                data.payload.gameId,
                data.payload.playerId,
                data.payload.answer
              );
              
              if (result) {
                // Notify the player who submitted the answer
                sendToClient(ws, {
                  type: 'answer_result',
                  payload: {
                    correct: result.correct,
                    playerId: data.payload.playerId,
                    points: result.points,
                    gameId: data.payload.gameId
                  }
                });
                
                // Update all players with new game state
                if (result.game) {
                  notifyGamePlayers(result.game);
                }
                
                // Check if all players completed current question
                const allCompleted = await gameManager.checkAllPlayersCompleted(data.payload.gameId);
                if (allCompleted) {
                  const game = await storage.getGameSession(data.payload.gameId);
                  if (game) {
                    notifyGamePlayers(game);
                  }
                }
              }
            } catch (error) {
              log(`Error submitting answer: ${error instanceof Error ? error.message : String(error)}`, 'ws-error');
              sendToClient(ws, {
                type: 'error',
                payload: {
                  message: error instanceof Error ? error.message : 'Failed to submit answer'
                }
              });
            }
            break;
          }
          
          case 'next_question': {
            try {
              const result = await gameManager.nextQuestion(data.payload.gameId);
              
              if (result.game) {
                if (result.completed) {
                  notifyGamePlayers(result.game, {
                    type: 'stage_completed',
                    payload: {
                      gameId: data.payload.gameId,
                      nextStage: result.nextStage
                    }
                  });
                } else {
                  notifyGamePlayers(result.game);
                }
              }
            } catch (error) {
              log(`Error moving to next question: ${error instanceof Error ? error.message : String(error)}`, 'ws-error');
              sendToClient(ws, {
                type: 'error',
                payload: {
                  message: error instanceof Error ? error.message : 'Failed to move to next question'
                }
              });
            }
            break;
          }
          
          case 'next_stage': {
            try {
              const game = await gameManager.nextStage(data.payload.gameId);
              
              if (game) {
                notifyGamePlayers(game, {
                  type: 'game_started',
                  payload: game
                });
              }
            } catch (error) {
              log(`Error moving to next stage: ${error instanceof Error ? error.message : String(error)}`, 'ws-error');
              sendToClient(ws, {
                type: 'error',
                payload: {
                  message: error instanceof Error ? error.message : 'Failed to move to next stage'
                }
              });
            }
            break;
          }
          
          // Room management cases
          case 'create_room': {
            try {
              userId = data.payload.teacherId;
              connections.set(userId, ws);
              
              log(`Creating room: ${data.payload.name} by teacher ${userId}`, 'room');
              
              const room = await roomManager.createRoom(
                data.payload.name,
                data.payload.teacherId,
                data.payload.maxPlayers || 100,
                data.payload.contestMode || 'synchronized',
                data.payload.endTime
              );
              
              if (room) {
                sendToClient(ws, {
                  type: 'room_created',
                  payload: room
                });
                
                // Also refresh room list for the teacher
                const rooms = await roomManager.getActiveRooms(data.payload.teacherId);
                sendToClient(ws, {
                  type: 'room_list',
                  payload: rooms
                });
              } else {
                sendToClient(ws, {
                  type: 'error',
                  payload: { message: 'Could not create room' }
                });
              }
            } catch (error) {
              log(`Error creating room: ${error instanceof Error ? error.message : String(error)}`, 'ws-error');
              sendToClient(ws, {
                type: 'error',
                payload: {
                  message: error instanceof Error ? error.message : 'Failed to create room'
                }
              });
            }
            break;
          }
          
          case 'get_room_list': {
            try {
              if (data.payload.teacherId) {
                userId = data.payload.teacherId;
                connections.set(userId, ws);
              }
              
              const rooms = await roomManager.getActiveRooms(data.payload.teacherId);
              
              sendToClient(ws, {
                type: 'room_list',
                payload: rooms
              });
            } catch (error) {
              log(`Error getting room list: ${error instanceof Error ? error.message : String(error)}`, 'ws-error');
              sendToClient(ws, {
                type: 'error',
                payload: {
                  message: error instanceof Error ? error.message : 'Failed to get room list'
                }
              });
            }
            break;
          }
          
          case 'join_room': {
            try {
              userId = data.payload.userId;
              connections.set(userId, ws);
              
              log(`Join room request received with code: ${data.payload.roomCode} by user: ${data.payload.userId}`, 'room');
              
              const room = await roomManager.getRoomByCode(data.payload.roomCode);
              
              if (!room) {
                log(`Room not found with code: ${data.payload.roomCode}`, 'room');
                sendToClient(ws, {
                  type: 'error',
                  payload: { message: 'Room not found with the provided code' }
                });
                break;
              }
              
              log(`Room found: ${room.name} (ID: ${room.id}) - attempting to join...`, 'room');
              const result = await roomManager.joinRoom(room.id, data.payload.userId);
              
              if (result.success) {
                // إرسال إشعار للطالب المنضم
                sendToClient(ws, {
                  type: 'room_joined',
                  payload: {
                    roomId: room.id,
                    userId: data.payload.userId,
                    username: result.username || 'Unknown'
                  }
                });
                
                // إرسال إشعار للمعلمة (صاحبة الغرفة)
                const teacherConnection = connections.get(room.teacherId);
                if (teacherConnection && teacherConnection.readyState === WebSocket.OPEN) {
                  log(`Notifying teacher ${room.teacherId} about new student ${data.payload.userId} joining room ${room.id}`, 'room');
                  sendToClient(teacherConnection, {
                    type: 'student_joined_room',
                    payload: {
                      roomId: room.id,
                      roomName: room.name,
                      studentId: data.payload.userId,
                      studentName: result.username || 'Unknown',
                      timestamp: new Date().toISOString()
                    }
                  });
                } else {
                  log(`Teacher ${room.teacherId} is not connected to receive notification about student joining`, 'room');
                  // هنا يمكن إضافة آلية حفظ الإشعارات غير المستلمة لعرضها لاحقًا
                }
              } else {
                sendToClient(ws, {
                  type: 'error',
                  payload: { message: 'Could not join the room' }
                });
              }
            } catch (error) {
              log(`Error joining room: ${error instanceof Error ? error.message : String(error)}`, 'ws-error');
              sendToClient(ws, {
                type: 'error',
                payload: {
                  message: error instanceof Error ? error.message : 'Failed to join room'
                }
              });
            }
            break;
          }
          
          case 'start_contest': {
            try {
              userId = data.payload.teacherId;
              connections.set(userId, ws);
              
              const result = await roomManager.startContest(
                data.payload.roomId,
                data.payload.teacherId,
                data.payload.difficulty || 'easy'
              );
              
              if (result.success && result.gameSession) {
                // نرسل إشعار لجميع اللاعبين بالغرفة
                sendToClient(ws, {
                  type: 'contest_started',
                  payload: {
                    roomId: data.payload.roomId,
                    gameSession: result.gameSession
                  }
                });
              } else {
                sendToClient(ws, {
                  type: 'error',
                  payload: { message: 'Could not start the contest' }
                });
              }
            } catch (error) {
              log(`Error starting contest: ${error instanceof Error ? error.message : String(error)}`, 'ws-error');
              sendToClient(ws, {
                type: 'error',
                payload: {
                  message: error instanceof Error ? error.message : 'Failed to start contest'
                }
              });
            }
            break;
          }
          
          case 'get_dashboard_data': {
            try {
              userId = data.payload.teacherId;
              connections.set(userId, ws);
              
              const result = await roomManager.getTeacherDashboardData(
                data.payload.roomId,
                data.payload.teacherId
              );
              
              if (result.success) {
                sendToClient(ws, {
                  type: 'teacher_dashboard_data',
                  payload: {
                    roomId: result.dashboard?.roomId || data.payload.roomId,
                    activeStudents: (result.dashboard?.activeStudents || []).map(student => ({
                      id: student.id,
                      username: student.username,
                      status: student.status,
                      score: student.score || 0,  // تحويل null إلى 0
                      progress: student.progress || 0  // تحويل null إلى 0
                    })),
                    gameStats: result.dashboard?.gameStats || {
                      questionsAnswered: 0,
                      correctAnswers: 0,
                      averageScore: 0
                    }
                  }
                });
              } else {
                sendToClient(ws, {
                  type: 'error',
                  payload: { message: 'Could not get dashboard data' }
                });
              }
            } catch (error) {
              log(`Error getting dashboard data: ${error instanceof Error ? error.message : String(error)}`, 'ws-error');
              sendToClient(ws, {
                type: 'error',
                payload: {
                  message: error instanceof Error ? error.message : 'Failed to get dashboard data'
                }
              });
            }
            break;
          }

          case 'send_message': {
            try {
              userId = data.payload.teacherId;
              connections.set(userId, ws);
              
              log(`Teacher ${userId} sending message: ${data.payload.type}`, 'message');
              
              // الحصول على اسم المعلم
              const teacher = await storage.getUser(userId);
              const teacherName = teacher?.username || 'معلمة';
              
              // إنشاء رسالة بالتنسيق المناسب
              const messagePayload: any = {
                teacherId: userId,
                teacherName: teacherName,
                message: data.payload.message,
                timestamp: new Date().toISOString()
              };
              
              if (data.payload.type === 'room' && data.payload.roomId) {
                // إرسال للطلاب في غرفة محددة
                const roomId = parseInt(data.payload.roomId.toString());
                const rooms = await roomManager.getActiveRooms();
                const room = rooms.find(r => r.id === roomId);
                
                if (room) {
                  messagePayload.roomId = room.id; // يستخدم كرقم
                  messagePayload.roomName = room.name;
                  
                  // إرسال لجميع الطلاب في الغرفة
                  // طريقة بديلة للتكرار على Map
                  Array.from(connections.entries()).forEach(([studentId, studentWs]) => {
                    if (studentId !== userId && studentWs.readyState === WebSocket.OPEN) {
                      sendToClient(studentWs, {
                        type: 'teacher_message',
                        payload: messagePayload
                      });
                    }
                  });
                  
                  // إرسال تأكيد للمعلم
                  sendToClient(ws, {
                    type: 'teacher_message',
                    payload: messagePayload
                  });
                }
              } else {
                // إرسال لجميع المستخدمين المتصلين
                // طريقة بديلة للتكرار على Map
                Array.from(connections.entries()).forEach(([studentId, studentWs]) => {
                  if (studentId !== userId && studentWs.readyState === WebSocket.OPEN) {
                    sendToClient(studentWs, {
                      type: 'teacher_message',
                      payload: messagePayload
                    });
                  }
                });
                
                // إرسال تأكيد للمعلم
                sendToClient(ws, {
                  type: 'teacher_message',
                  payload: messagePayload
                });
              }
              
              log(`Message sent successfully by teacher ${userId}`, 'message');
            } catch (error) {
              log(`Error sending message: ${error instanceof Error ? error.message : String(error)}`, 'ws-error');
              sendToClient(ws, {
                type: 'error',
                payload: {
                  message: error instanceof Error ? error.message : 'Failed to send message'
                }
              });
            }
            break;
          }
        }
      } catch (error) {
        log(`WebSocket error: ${error instanceof Error ? error.message : String(error)}`, 'ws-error');
        
        // Send error message back to client
        sendToClient(ws, {
          type: 'error',
          payload: { 
            message: error instanceof Error ? error.message : 'An unknown error occurred'
          }
        });
      }
    });
    
    ws.on('close', () => {
      if (userId) {
        // Remove connection
        connections.delete(userId);
        
        // Remove player from any active games
        gameManager.removePlayerFromAllGames(userId).then(updatedGames => {
          // Notify remaining players in each game
          updatedGames.forEach(game => {
            if (game) {
              notifyGamePlayers(game);
            }
          });
        }).catch(err => {
          log(`Error removing player ${userId} from games: ${err.message}`, 'ws-error');
        });
      }
    });
  });
  
  function sendToClient(client: WebSocket, message: ServerMessage) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }
  
  function notifyGamePlayers(game: any, message?: ServerMessage) {
    const msg = message || {
      type: 'game_state_update',
      payload: game
    };
    
    game.players.forEach((player: any) => {
      const connection = connections.get(player.id);
      if (connection && connection.readyState === WebSocket.OPEN) {
        connection.send(JSON.stringify(msg));
      }
    });
  }

  return httpServer;
}
