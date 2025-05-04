import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { GameManager } from "./game/gameManager";
import { RoomManager } from "./room/roomManager";
import { z } from "zod";
import { insertUserSchema, type ServerMessage, type ClientMessage, roomParticipants, users, type Room, type User, type GameSession, type Player, gameSessions } from "@shared/schema";
import { log } from "./vite";
import { db } from "./db";
import { and, eq } from "drizzle-orm";

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
  
  // Store pending notifications for users not currently connected
  const pendingNotifications = new Map<number, ServerMessage[]>();
  
  // Store active contest state for rooms
  const activeContests = new Map<number, {
    countdownStarted: boolean;
    approvedStudents: number[];
    secondsRemaining: number | null;
    gameSession: GameSession;
  }>();
  
  // Registro de todas las conexiones activas para depuración
  setInterval(() => {
    log(`Active WebSocket connections: ${connections.size}`, 'ws-info');
    connections.forEach((_, userId) => {
      log(`- User ${userId} is connected`, 'ws-info');
    });
  }, 30000); // Cada 30 segundos
  
  // Function to store notification for later delivery
  const storeNotificationForUser = (userId: number, notification: ServerMessage) => {
    const userNotifications = pendingNotifications.get(userId) || [];
    userNotifications.push(notification);
    pendingNotifications.set(userId, userNotifications);
    log(`Stored notification for user ${userId} for later delivery: ${JSON.stringify(notification)}`, 'notifications');
    log(`Current pending notifications count for user ${userId}: ${userNotifications.length}`, 'notifications');
  };
  
  // Function to send pending notifications to user when they connect
  const sendPendingNotifications = (userId: number, ws: WebSocket) => {
    const notifications = pendingNotifications.get(userId);
    if (notifications && notifications.length > 0) {
      log(`Sending ${notifications.length} pending notifications to user ${userId}`, 'notifications');
      
      notifications.forEach(notification => {
        log(`Sending pending notification: ${JSON.stringify(notification)}`, 'notifications');
        sendToClient(ws, notification);
      });
      
      // Clear the pending notifications after sending
      log(`Clearing pending notifications for user ${userId}`, 'notifications');
      pendingNotifications.delete(userId);
    } else {
      log(`No pending notifications for user ${userId}`, 'notifications');
    }
  };
  
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
  
  // الحصول على حالة مشارك في غرفة
  app.get("/api/rooms/:roomId/participants/:userId", async (req, res) => {
    try {
      const roomId = parseInt(req.params.roomId);
      const userId = parseInt(req.params.userId);
      
      if (isNaN(roomId) || isNaN(userId)) {
        return res.status(400).json({ message: "Invalid room ID or user ID" });
      }
      
      log(`Checking participant status for user ${userId} in room ${roomId}`, 'room');
      
      const participantData = await db.select().from(roomParticipants)
        .where(and(
          eq(roomParticipants.roomId, roomId),
          eq(roomParticipants.userId, userId)
        ));
      
      log(`Found participant data: ${JSON.stringify(participantData)}`, 'room');
      
      if (participantData && participantData.length > 0) {
        res.status(200).json(participantData[0]);
      } else {
        res.status(404).json({ message: "Participant not found" });
      }
    } catch (error) {
      log(`Error getting participant: ${error instanceof Error ? error.message : String(error)}`, 'room-error');
      res.status(500).json({ message: "Failed to get participant data" });
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
    
    // سنحمل الإشعارات غير المستلمة عندما يحدد المستخدم هويته
    
    // Check if this is a student reconnection during an active contest
    const checkActiveContests = (studentId: number) => {
      if (!studentId) return;
      
      // Check each active contest to see if this student is participating
      activeContests.forEach((contestState, roomId) => {
        if (contestState.approvedStudents.includes(studentId)) {
          log(`Student ${studentId} reconnected during active contest in room ${roomId}`, 'contest');
          
          // If countdown is still in progress, send the current countdown
          if (contestState.secondsRemaining !== null && contestState.secondsRemaining > 0) {
            log(`Sending current countdown (${contestState.secondsRemaining}s) to reconnected student ${studentId}`, 'contest');
            sendToClient(ws, {
              type: 'contest_countdown',
              payload: {
                roomId: roomId,
                countdown: contestState.secondsRemaining
              }
            });
          } 
          // If countdown is complete but game session exists, send game_started
          else if (contestState.gameSession) {
            log(`Sending game_started to reconnected student ${studentId}`, 'contest');
            sendToClient(ws, {
              type: 'game_started',
              payload: contestState.gameSession
            });
          }
        }
      });
    };
    
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
              
              // التحقق من وجود اسم مخصص محفوظ في قاعدة البيانات
              const participants = await roomManager.getRoomParticipantsByUserId(data.payload.playerId);
              let customName;
              
              if (participants && participants.length > 0) {
                // الحصول على آخر مشاركة للمستخدم لاستخدام الاسم الكامل
                const latestParticipation = participants.reduce((latest, current) => {
                  return !latest || (current.joinedAt > latest.joinedAt) ? current : latest;
                }, null);
                
                if (latestParticipation && latestParticipation.full_name) {
                  customName = latestParticipation.full_name;
                  log(`استخدام الاسم الكامل من صفحة الانضمام: ${customName}`, 'ws-info');
                }
              }
              
              let result;
              
              if (customName) {
                // استخدام الاسم الكامل للانضمام للعبة
                result = await gameManager.joinGameWithCustomName(
                  data.payload.gameId,
                  data.payload.playerId,
                  customName
                );
              } else {
                // استخدام الانضمام العادي
                result = await gameManager.joinGame(
                  data.payload.gameId,
                  data.payload.playerId
                );
              }
              
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
              
              // إرسال أي إشعارات معلقة للمعلمة
              sendPendingNotifications(userId, ws);
              
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
                
                // إرسال أي إشعارات معلقة للمعلمة
                sendPendingNotifications(userId, ws);
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
              
              // Check if this student is part of an active contest
              checkActiveContests(userId);
              
              // Check if there's an active contest in any room
              if (userId) { // Only proceed if userId is not null
                let isInActiveContest = false;
                activeContests.forEach((contestState, roomId) => {
                  if (contestState.approvedStudents.includes(userId as number)) {
                    isInActiveContest = true;
                    log(`Student ${userId} is reconnecting during active contest in room ${roomId}`, 'room');
                    
                    // Retrieve room details
                    roomManager.getRoomById(roomId).then((room: Room | null) => {
                      if (room) {
                        // Send student directly to room_joined, bypassing the normal flow
                        sendToClient(ws, {
                          type: 'room_joined',
                          payload: {
                            roomId: room.id,
                            userId: userId as number,
                            username: room.name,
                            currentGameId: contestState.gameSession?.id // إضافة معرف اللعبة النشطة
                          }
                        });
                        
                        log(`Sent room_joined to reconnecting student ${userId} for room ${roomId}`, 'room');
                      }
                    }).catch((err: Error) => {
                      log(`Error getting room details for rejoining: ${err.message}`, 'ws-error');
                    });
                  }
                });
              }
              
              log(`Join room request received with code: ${data.payload.roomCode} by user: ${data.payload.userId}`, 'room');
              
              // التحقق من صحة رمز الغرفة (تحويله للأحرف الكبيرة وإزالة المسافات)
              const cleanRoomCode = data.payload.roomCode.trim().toUpperCase();
              log(`Clean room code: ${cleanRoomCode}`, 'room');
              
              const room = await roomManager.getRoomByCode(cleanRoomCode);
              
              if (!room) {
                log(`Room not found with code: ${cleanRoomCode}`, 'room');
                sendToClient(ws, {
                  type: 'error',
                  payload: { message: 'Room not found with the provided code' }
                });
                break;
              }
              
              log(`Room found: ${room.name} (ID: ${room.id}, Code: ${room.code}) - attempting to join...`, 'room');
              // الحصول على الاسم الكامل من طلب الانضمام
              const fullName = data.payload.fullName || '';
              const result = await roomManager.joinRoom(room.id, data.payload.userId, fullName);
              
              if (result.success) {
                // استخدام الاسم الكامل في الإشعارات إذا كان متاحًا
                let displayName = result.username || 'Unknown';
                
                // نحاول الحصول على الاسم الكامل من قاعدة البيانات
                if (fullName && fullName.trim() !== '') {
                  displayName = fullName.trim();
                }
                
                // إرسال إشعار للطالب المنضم
                sendToClient(ws, {
                  type: 'room_joined',
                  payload: {
                    roomId: room.id,
                    userId: data.payload.userId,
                    username: displayName, // استخدام نفس الاسم المعروض في الإشعار
                    currentGameId: result.currentGameId // إضافة معرف اللعبة النشطة إذا وجد
                  }
                });
                
                // إرسال إشعار للمعلمة (صاحبة الغرفة)
                const teacherConnection = connections.get(room.teacherId);
                
                const notification: ServerMessage = {
                  type: 'student_joined_room',
                  payload: {
                    roomId: room.id,
                    roomName: room.name,
                    studentId: data.payload.userId,
                    studentName: displayName,
                    timestamp: new Date().toISOString()
                  }
                };
                
                if (teacherConnection && teacherConnection.readyState === WebSocket.OPEN) {
                  log(`Notifying teacher ${room.teacherId} about new student ${data.payload.userId} (${displayName}) joining room ${room.id}`, 'room');
                  log(`Sending notification: ${JSON.stringify(notification)}`, 'room');
                  sendToClient(teacherConnection, notification);
                } else {
                  log(`Teacher ${room.teacherId} is not connected to receive notification about student ${displayName} joining`, 'room');
                  // تخزين الإشعار لإرساله لاحقًا عندما تتصل المعلمة
                  log(`Storing notification for teacher ${room.teacherId}: ${JSON.stringify(notification)}`, 'room');
                  storeNotificationForUser(room.teacherId, notification);
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
          
          case 'join_room_by_id': {
            try {
              userId = data.payload.userId;
              connections.set(userId, ws);
              
              log(`Join room by ID request received for room ID: ${data.payload.roomId} by user: ${data.payload.userId}`, 'room');
              
              // التحقق من وجود الغرفة بواسطة المعرّف
              const room = await roomManager.getRoomById(data.payload.roomId);
              
              if (!room) {
                log(`Room not found with ID: ${data.payload.roomId}`, 'room');
                sendToClient(ws, {
                  type: 'error',
                  payload: { message: 'Room not found with the provided ID' }
                });
                break;
              }
              
              // Check if this student is part of an active contest
              log(`Checking if student ${userId} is part of an active contest`, 'room');
              checkActiveContests(userId);
              
              let isAlreadyInActiveContest = false;
              if (userId) {
                activeContests.forEach((contestState, roomId) => {
                  if (contestState.approvedStudents.includes(userId as number) && roomId === data.payload.roomId) {
                    isAlreadyInActiveContest = true;
                    log(`Student ${userId} is already part of active contest in room ${roomId}`, 'room');
                  }
                });
              }
              
              // إذا لم يكن الطالب جزءًا من مسابقة نشطة، نقوم بعملية الانضمام العادية
              if (!isAlreadyInActiveContest) {
                log(`Student ${userId} is not part of an active contest, joining room normally`, 'room');
                
                // نتحقق إذا كان الطالب منضماً بالفعل للغرفة
                const result = await roomManager.joinRoom(room.id, data.payload.userId);
                
                if (result.success) {
                  let displayName = result.username || 'Unknown';
                  
                  // إرسال إشعار للطالب المنضم
                  sendToClient(ws, {
                    type: 'room_joined',
                    payload: {
                      roomId: room.id,
                      userId: data.payload.userId,
                      username: displayName,
                      currentGameId: result.currentGameId // إضافة معرف اللعبة النشطة إذا وجد
                    }
                  });
                  
                  log(`Student ${userId} successfully joined room ${room.id} by ID`, 'room');
                } else {
                  sendToClient(ws, {
                    type: 'error',
                    payload: { message: 'Could not join the room' }
                  });
                }
              }
            } catch (error) {
              log(`Error joining room by ID: ${error instanceof Error ? error.message : String(error)}`, 'ws-error');
              sendToClient(ws, {
                type: 'error',
                payload: {
                  message: error instanceof Error ? error.message : 'Failed to join room by ID'
                }
              });
            }
            break;
          }
          
          case 'start_contest': {
            try {
              userId = data.payload.teacherId;
              connections.set(userId, ws);
              
              // إرسال أي إشعارات معلقة للمعلمة
              sendPendingNotifications(userId, ws);
              
              log(`Teacher ${data.payload.teacherId} is starting contest for room ${data.payload.roomId} with difficulty ${data.payload.difficulty || 'easy'}`, 'contest');
              
              const result = await roomManager.startContest(
                data.payload.roomId,
                data.payload.teacherId,
                data.payload.difficulty || 'easy'
              );
              
              log(`Start contest result: ${JSON.stringify(result)}`, 'contest');
              
              if (result.success && result.gameSession) {
                // نبدأ العد التنازلي قبل بدء المسابقة
                log(`Starting countdown for room ${data.payload.roomId}...`, 'contest');
                
                // الحصول على جميع الطلاب المعتمدين في الغرفة
                // الحصول على المشاركين المعتمدين من قاعدة البيانات
                log(`Getting approved students for room ${data.payload.roomId}`, 'contest');
                const roomParticipantsResult = await db.select().from(roomParticipants)
                  .where(and(
                    eq(roomParticipants.roomId, data.payload.roomId),
                    eq(roomParticipants.isApproved, true)
                  ));
                
                log(`Room participants query result: ${JSON.stringify(roomParticipantsResult)}`, 'contest');
                
                const students = roomParticipantsResult.map(participant => participant.userId);
                log(`Found ${students.length} approved students in room: ${JSON.stringify(students)}`, 'contest');
                
                // Verificamos si hay conexiones WebSocket activas para estos estudiantes
                students.forEach(studentId => {
                  const connection = connections.get(studentId);
                  log(`Student ${studentId} connection exists: ${!!connection}, status: ${connection ? connection.readyState : 'N/A'}`, 'contest');
                });
                
                // Verificamos de forma adicional cuántos estudiantes tienen una conexión activa
                let activeStudents = 0;
                students.forEach(studentId => {
                  const conn = connections.get(studentId);
                  if (conn && conn.readyState === WebSocket.OPEN) {
                    activeStudents++;
                  }
                });
                
                log(`Found ${students.length} approved students, of which ${activeStudents} have active connections`, 'contest');
                
                // نرسل إشعار للمعلمة بأن المسابقة ستبدأ بعد عد تنازلي
                sendToClient(ws, {
                  type: 'contest_started',
                  payload: {
                    roomId: data.payload.roomId,
                    gameSession: result.gameSession
                  }
                });
                
                // بدء العد التنازلي لمدة 20 ثانية
                const countdownSeconds = 20;
                let secondsRemaining = countdownSeconds;
                
                // خزن حالة المسابقة لمساعدة الطلاب الذين سيعيدون الاتصال
                activeContests.set(data.payload.roomId, {
                  countdownStarted: true,
                  approvedStudents: students,
                  secondsRemaining: countdownSeconds,
                  gameSession: result.gameSession
                });
                
                // إرسال رسالة العد التنازلي الأولية للطلاب المتصلين
                // هذا سيساعد في عرض العد التنازلي فوراً
                log(`Sending initial countdown message to approved students in room ${data.payload.roomId}`, 'contest');
                
                students.forEach(studentId => {
                  const studentConnection = connections.get(studentId);
                  if (studentConnection && studentConnection.readyState === WebSocket.OPEN) {
                    log(`Sending countdown to student ${studentId}`, 'contest');
                    sendToClient(studentConnection, {
                      type: 'contest_countdown',
                      payload: {
                        roomId: data.payload.roomId,
                        countdown: countdownSeconds
                      }
                    });
                  } else {
                    log(`Student ${studentId} is not connected, cannot send countdown`, 'contest');
                  }
                });
                
                // إرسال تحديث العد التنازلي الأولي للمعلمة
                sendToClient(ws, {
                  type: 'contest_countdown',
                  payload: {
                    roomId: data.payload.roomId,
                    countdown: countdownSeconds
                  }
                });
                
                const countdownInterval = setInterval(async () => {
                  // تناقص العداد أولاً
                  secondsRemaining--;
                  
                  // تحديث الوقت المتبقي في خريطة المسابقات النشطة
                  const contest = activeContests.get(data.payload.roomId);
                  if (contest) {
                    contest.secondsRemaining = secondsRemaining;
                    activeContests.set(data.payload.roomId, contest);
                    log(`Updated contest state for room ${data.payload.roomId}: ${secondsRemaining}s remaining`, 'contest');
                  }
                  
                  // إرسال تحديث العد التنازلي لجميع الطلاب المتواجدين حالياً
                  let connectedStudents = 0;
                  students.forEach(studentId => {
                    const studentConnection = connections.get(studentId);
                    if (studentConnection && studentConnection.readyState === WebSocket.OPEN) {
                      sendToClient(studentConnection, {
                        type: 'contest_countdown',
                        payload: {
                          roomId: data.payload.roomId,
                          countdown: secondsRemaining
                        }
                      });
                      connectedStudents++;
                    }
                  });
                  
                  log(`Sent countdown update (${secondsRemaining}s) to ${connectedStudents} students`, 'contest');
                  
                  // إرسال تحديث للمعلمة أيضاً
                  sendToClient(ws, {
                    type: 'contest_countdown',
                    payload: {
                      roomId: data.payload.roomId,
                      countdown: secondsRemaining
                    }
                  });
                  
                  // إذا انتهى العد التنازلي، نوقف المؤقت ونرسل رسالة بدء اللعبة
                  if (secondsRemaining <= 0) {
                    clearInterval(countdownInterval);
                    log(`Countdown complete, starting game for room ${data.payload.roomId}`, 'contest');
                    
                    // تحديث خريطة المسابقات النشطة للإشارة إلى اكتمال العد التنازلي
                    const contest = activeContests.get(data.payload.roomId);
                    if (contest) {
                      contest.secondsRemaining = null;
                      activeContests.set(data.payload.roomId, contest);
                      log(`Updated active contest state for room ${data.payload.roomId} - countdown complete`, 'contest');
                    }
                    
                    // التأكد من حفظ معلومات جلسة اللعبة في قاعدة البيانات
                    if (result.gameSession) {
                      try {
                        // تحديث حالة اللعبة في قاعدة البيانات إلى 'active'
                        const updateResult = await storage.updateGameSession(result.gameSession.id, { status: 'active' });
                        
                        if (updateResult) {
                          log(`Game session ${result.gameSession.id} status updated to 'active' in database`, 'contest');
                        } else {
                          log(`Failed to update game session status in database`, 'contest');
                        }
                      } catch (dbError) {
                        log(`Error saving game session to database: ${dbError instanceof Error ? dbError.message : String(dbError)}`, 'contest');
                      }
                    }
                    
                    // إرسال رسالة بدء اللعبة لجميع الطلاب المتصلين
                    let startedCount = 0;
                    students.forEach(studentId => {
                      const studentConnection = connections.get(studentId);
                      if (studentConnection && studentConnection.readyState === WebSocket.OPEN) {
                        if (result.gameSession) {
                          log(`Sending game_started to student ${studentId}`, 'contest');
                          sendToClient(studentConnection, {
                            type: 'game_started',
                            payload: result.gameSession
                          });
                          startedCount++;
                        }
                      }
                    });
                    log(`Sent game_started to ${startedCount} students`, 'contest');
                  }
                }, 1000); // تحديث كل ثانية
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
              
              // إرسال أي إشعارات معلقة للمعلمة
              sendPendingNotifications(userId, ws);
              
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
          
          case 'get_waiting_students': {
            try {
              userId = data.payload.teacherId;
              connections.set(userId, ws);
              
              // إرسال أي إشعارات معلقة للمعلمة
              sendPendingNotifications(userId, ws);
              
              const result = await roomManager.getWaitingStudents(
                data.payload.roomId,
                data.payload.teacherId
              );
              
              if (result.success) {
                sendToClient(ws, {
                  type: 'waiting_students_list',
                  payload: {
                    roomId: data.payload.roomId,
                    students: result.students || []
                  }
                });
              } else {
                sendToClient(ws, {
                  type: 'error',
                  payload: { message: 'Could not get waiting students list' }
                });
              }
            } catch (error) {
              log(`Error getting waiting students: ${error instanceof Error ? error.message : String(error)}`, 'ws-error');
              sendToClient(ws, {
                type: 'error',
                payload: {
                  message: error instanceof Error ? error.message : 'Failed to get waiting students'
                }
              });
            }
            break;
          }
          
          case 'approve_student': {
            try {
              userId = data.payload.teacherId;
              connections.set(userId, ws);
              
              // إرسال أي إشعارات معلقة للمعلمة
              sendPendingNotifications(userId, ws);
              
              log(`Teacher ${data.payload.teacherId} is approving student ${data.payload.studentId} for room ${data.payload.roomId}, approve=${data.payload.approve}`, 'approval');
              
              const result = await roomManager.approveStudent(
                data.payload.roomId,
                data.payload.teacherId,
                data.payload.studentId,
                data.payload.approve
              );
              
              log(`Approval result: ${JSON.stringify(result)}`, 'approval');
              
              if (result.success) {
                // Verificamos el estado actual de aprobación en la base de datos
                if (data.payload.approve) {
                  const participantCheck = await db.select().from(roomParticipants).where(and(
                    eq(roomParticipants.roomId, data.payload.roomId),
                    eq(roomParticipants.userId, data.payload.studentId)
                  ));
                  
                  log(`Verification check after approval - participant data: ${JSON.stringify(participantCheck)}`, 'approval');
                  
                  if (participantCheck.length > 0) {
                    log(`Participant found in database, isApproved = ${participantCheck[0].isApproved}`, 'approval');
                  } else {
                    log(`WARNING: Participant not found in database after approval!`, 'approval');
                  }
                }
                
                // إرسال تحديث للمعلم بأن الطالب تمت الموافقة عليه
                sendToClient(ws, {
                  type: 'student_approval_updated',
                  payload: {
                    roomId: data.payload.roomId,
                    studentId: data.payload.studentId,
                    isApproved: data.payload.approve
                  }
                });
                
                // إرسال إشعار للطالب المعني بالموافقة أو الرفض
                const studentConnection = connections.get(data.payload.studentId);
                log(`Sending approval update to student ${data.payload.studentId}, connection exists: ${!!studentConnection}, status: ${studentConnection ? studentConnection.readyState : 'N/A'}`, 'approval');
                
                if (studentConnection && studentConnection.readyState === WebSocket.OPEN) {
                  log(`Sending 'student_approval_updated' message to student ${data.payload.studentId}`, 'approval');
                  sendToClient(studentConnection, {
                    type: 'student_approval_updated',
                    payload: {
                      roomId: data.payload.roomId,
                      studentId: data.payload.studentId,
                      isApproved: data.payload.approve
                    }
                  });
                  log(`Message sent to student ${data.payload.studentId}`, 'approval');
                } else {
                  log(`Could not send approval update to student ${data.payload.studentId} - connection not available or not open`, 'approval');
                }
                
                // إذا تمت الموافقة، سنعيد إرسال قائمة الطلاب المنتظرين لتحديثها
                const waitingStudents = await roomManager.getWaitingStudents(
                  data.payload.roomId,
                  data.payload.teacherId
                );
                
                if (waitingStudents.success) {
                  sendToClient(ws, {
                    type: 'waiting_students_list',
                    payload: {
                      roomId: data.payload.roomId,
                      students: waitingStudents.students || []
                    }
                  });
                }
              } else {
                sendToClient(ws, {
                  type: 'error',
                  payload: { message: 'Could not update student approval status' }
                });
              }
            } catch (error) {
              log(`Error approving student: ${error instanceof Error ? error.message : String(error)}`, 'ws-error');
              sendToClient(ws, {
                type: 'error',
                payload: {
                  message: error instanceof Error ? error.message : 'Failed to approve student'
                }
              });
            }
            break;
          }

          case 'cancel_room': {
            try {
              userId = data.payload.teacherId;
              connections.set(userId, ws);
              
              // إرسال أي إشعارات معلقة للمعلمة
              sendPendingNotifications(userId, ws);
              
              log(`Teacher ${data.payload.teacherId} is cancelling room ${data.payload.roomId}`, 'room');
              
              const result = await roomManager.cancelRoom(
                data.payload.roomId,
                data.payload.teacherId
              );
              
              if (result) {
                log(`Room ${data.payload.roomId} cancelled successfully`, 'room');
                
                // إرسال رسالة تأكيد الإلغاء للمعلم
                sendToClient(ws, {
                  type: 'room_cancelled',
                  payload: {
                    roomId: data.payload.roomId
                  }
                });
                
                // إعادة إرسال قائمة الغرف المحدثة
                const teacherRooms = await roomManager.getActiveRooms(data.payload.teacherId);
                sendToClient(ws, {
                  type: 'room_list',
                  payload: teacherRooms
                });
                
                // إرسال الإشعار لجميع الطلاب في الغرفة أن الغرفة قد تم إلغاؤها
                // الحصول على جميع المشاركين في الغرفة
                const participants = await db.select()
                  .from(roomParticipants)
                  .where(eq(roomParticipants.roomId, data.payload.roomId));
                
                if (participants.length > 0) {
                  log(`Notifying ${participants.length} students about room cancellation`, 'room');
                  
                  // إرسال الإشعار لكل طالب
                  for (const participant of participants) {
                    const studentConnection = connections.get(participant.userId);
                    if (studentConnection && studentConnection.readyState === WebSocket.OPEN) {
                      sendToClient(studentConnection, {
                        type: 'room_cancelled',
                        payload: {
                          roomId: data.payload.roomId
                        }
                      });
                      log(`Notified student ${participant.userId} about room cancellation`, 'room');
                    } else {
                      log(`Student ${participant.userId} not connected or connection not open`, 'room');
                      // يمكن تخزين الإشعار لإرساله لاحقاً عندما يتصل الطالب
                    }
                  }
                }
              } else {
                log(`Failed to cancel room ${data.payload.roomId}`, 'room');
                sendToClient(ws, {
                  type: 'error',
                  payload: { message: 'فشل في إلغاء الغرفة' }
                });
              }
            } catch (error) {
              log(`Error cancelling room: ${error instanceof Error ? error.message : String(error)}`, 'ws-error');
              sendToClient(ws, {
                type: 'error',
                payload: {
                  message: error instanceof Error ? error.message : 'خطأ في إلغاء الغرفة'
                }
              });
            }
            break;
          }

          case 'send_message': {
            try {
              userId = data.payload.teacherId;
              connections.set(userId, ws);
              
              // إرسال أي إشعارات معلقة للمعلمة
              sendPendingNotifications(userId, ws);
              
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
