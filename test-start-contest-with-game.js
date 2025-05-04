import { WebSocket } from 'ws';

// Conexión al servidor WebSocket
const protocol = 'ws:';
const host = 'localhost:5000';
const wsUrl = `${protocol}//${host}/ws`;

const teacherId = 1; // ID del profesor de prueba - asegúrate de que este ID exista en tu base de datos
const roomId = 1; // ID de sala de prueba - asegúrate de que exista en tu base de datos
const difficulty = "easy"; // Dificultad de la competencia

// Conectar al servidor WebSocket
const socket = new WebSocket(wsUrl);

socket.on('open', () => {
  console.log('Conexión WebSocket establecida');
  console.log(`Probando iniciar una competencia en sala: ${roomId} como profesor ${teacherId} con dificultad ${difficulty}`);
  
  // Enviar mensaje para iniciar la competencia
  const startContestMessage = {
    type: 'start_contest',
    payload: {
      roomId: roomId,
      teacherId: teacherId,
      difficulty: difficulty
    }
  };
  
  socket.send(JSON.stringify(startContestMessage));
  console.log('Mensaje enviado: start_contest');
});

socket.on('message', (data) => {
  const message = JSON.parse(data.toString());
  console.log('Mensaje recibido:', message);
  
  // Verificar si se inició la cuenta regresiva
  if (message.type === 'contest_countdown') {
    console.log(`✅ ÉXITO: Cuenta regresiva iniciada: ${message.payload.countdown} segundos restantes`);
    // Mantenemos la conexión abierta para recibir actualizaciones de la cuenta regresiva
  }
  
  // Verificar si se inició correctamente
  if (message.type === 'contest_started') {
    console.log('✅ ÉXITO: Competencia iniciada correctamente');
    console.log('Detalles:', message.payload);
  }
  
  // Verificar si se recibió un error
  if (message.type === 'error') {
    console.log(`❌ FALLO: Error al iniciar la competencia: ${message.payload.message}`);
    
    // Cerrar después de unos segundos
    setTimeout(() => {
      socket.close();
      console.log('Prueba completada con error, conexión cerrada');
    }, 2000);
  }
  
  // Verificar si se recibió gameStarted (esto sucederá al final de la cuenta regresiva)
  if (message.type === 'game_started') {
    console.log(`✅ ÉXITO: Juego iniciado con ID: ${message.payload.id}`);
    console.log('Verificar que el juego se ha guardado correctamente en la base de datos');
    
    // Mostrar algunos detalles del juego para verificación
    console.log(`- ID del juego: ${message.payload.id}`);
    console.log(`- Estado: ${message.payload.status}`);
    console.log(`- ID de sala: ${message.payload.roomId}`);
    console.log(`- Dificultad: ${message.payload.difficulty}`);
    console.log(`- Número de preguntas: ${message.payload.questions.length}`);
    console.log(`- Máximo de jugadores: ${message.payload.maxPlayers}`);
    
    // Cerrar después de unos segundos
    setTimeout(() => {
      socket.close();
      console.log('Prueba completada con éxito, conexión cerrada');
    }, 2000);
  }
});

// Si no recibimos ninguna respuesta después de 30 segundos, cerrar la conexión
setTimeout(() => {
  if (socket.readyState === WebSocket.OPEN) {
    console.log('❌ TIMEOUT: No se recibió respuesta completa después de 30 segundos');
    socket.close();
  }
}, 30000);

socket.on('close', () => {
  console.log('Conexión cerrada');
});

socket.on('error', (error) => {
  console.error('Error en la conexión WebSocket:', error);
});
