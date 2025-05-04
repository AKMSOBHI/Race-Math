import { WebSocket } from 'ws';
import { nanoid } from 'nanoid';

// Conexión al servidor WebSocket
const protocol = 'ws:';
const host = 'localhost:5000';
const wsUrl = `${protocol}//${host}/ws`;

const studentId = 105; // ID del estudiante de prueba - asegúrate de que este ID exista en tu base de datos
const roomCode = 'TBJ42M'; // Código de sala de prueba - asegúrate de que exista en tu base de datos
const studentFullName = 'طالبة اختبار ' + nanoid(4); // Nombre de prueba único

// Conectar al servidor WebSocket
const socket = new WebSocket(wsUrl);

socket.on('open', () => {
  console.log('Conexión WebSocket establecida');
  console.log(`Probando unirse a la sala con código: ${roomCode} como estudiante ${studentId} (${studentFullName})`);
  
  // Enviar mensaje para unirse a la sala
  const joinRoomMessage = {
    type: 'join_room',
    payload: {
      roomCode: roomCode,
      userId: studentId,
      fullName: studentFullName
    }
  };
  
  socket.send(JSON.stringify(joinRoomMessage));
  console.log('Mensaje enviado: join_room');
});

socket.on('message', (data) => {
  const message = JSON.parse(data.toString());
  console.log('Mensaje recibido:', message);
  
  // Verificar si recibimos la respuesta room_joined con un currentGameId
  if (message.type === 'room_joined') {
    console.log('✅ ÉXITO: Unido a la sala correctamente');
    
    if (message.payload.currentGameId) {
      console.log(`✅ ÉXITO: ID de juego actual recibido: ${message.payload.currentGameId}`);
      console.log(`Ahora el cliente navegaría a: /game?id=${message.payload.currentGameId}`);
    } else {
      console.log('❌ FALLO: No se recibió ID de juego activo');
    }
    
    // Cerrar después de unos segundos para dar tiempo a recibir cualquier mensaje adicional
    setTimeout(() => {
      socket.close();
      console.log('Prueba completada, conexión cerrada');
    }, 2000);
  }
  
  // Verificar mensaje de error
  if (message.type === 'error') {
    console.log(`❌ FALLO: Error al unirse a la sala: ${message.payload.message}`);
    
    // Cerrar después de unos segundos
    setTimeout(() => {
      socket.close();
      console.log('Prueba completada con error, conexión cerrada');
    }, 2000);
  }
  
  // Verificar si se recibió contestCountdown
  if (message.type === 'contest_countdown') {
    console.log(`ℹ️ INFO: Cuenta regresiva de concurso recibida: ${message.payload.countdown} segundos restantes`);
  }
  
  // Verificar si se recibió gameStarted
  if (message.type === 'game_started') {
    console.log(`✅ ÉXITO: Mensaje de juego iniciado recibido con ID: ${message.payload.id}`);
    console.log('Detalles del juego:', message.payload);
    
    // Cerrar después de unos segundos
    setTimeout(() => {
      socket.close();
      console.log('Prueba completada con éxito, conexión cerrada');
    }, 2000);
  }
});

socket.on('close', () => {
  console.log('Conexión cerrada');
});

socket.on('error', (error) => {
  console.error('Error en la conexión WebSocket:', error);
});
