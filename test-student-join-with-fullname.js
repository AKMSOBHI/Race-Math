import { WebSocket } from 'ws';

// 1. إنشاء اتصال WebSocket للمعلم
const teacherWs = new WebSocket('ws://localhost:5000/ws');

// 2. عند الاتصال، إنشاء غرفة جديدة
teacherWs.on('open', function open() {
  console.log('تم فتح الاتصال للمعلم');
  
  // إنشاء غرفة جديدة
  const createRoomMessage = {
    type: "create_room",
    payload: {
      name: "غرفة اختبار الاسم الكامل",
      teacherId: 1,
      maxPlayers: 10
    }
  };
  
  teacherWs.send(JSON.stringify(createRoomMessage));
  console.log('تم إرسال طلب إنشاء الغرفة');
});

// متغيرات عالمية للاستخدام في كافة الدوال
let roomId;
let studentWs;

// 3. استقبال الرسائل للمعلم
teacherWs.on('message', function incoming(data) {
  const message = JSON.parse(data.toString());
  console.log('رسالة للمعلم:', message.type);
  
  // إذا تم إنشاء الغرفة، نبدأ مسابقة
  if (message.type === 'room_created') {
    roomId = message.payload.id;
    console.log(`تم إنشاء غرفة برقم: ${roomId} ورمز: ${message.payload.code}`);
    
    // بدء مسابقة
    const startContestMessage = {
      type: "start_contest",
      payload: {
        roomId: roomId,
        teacherId: 1,
        difficulty: "easy"
      }
    };
    
    // نبدأ المسابقة بعد ثانية
    setTimeout(() => {
      teacherWs.send(JSON.stringify(startContestMessage));
      console.log('تم إرسال طلب بدء المسابقة');
    }, 1000);
  }
  
  // إذا بدأت المسابقة، نقوم بربط طالب جديد
  if (message.type === 'contest_started') {
    console.log('تم بدء المسابقة، سيتم ربط طالب جديد');
    
    // إنشاء اتصال WebSocket للطالب
    studentWs = new WebSocket('ws://localhost:5000/ws');
    
    // عند اتصال الطالب
    studentWs.on('open', function open() {
      console.log('تم فتح الاتصال للطالب');
      
      // رسالة انضمام الطالب للغرفة
      const joinRoomMessage = {
        type: "join_room",
        payload: {
          roomCode: message.payload.gameSession.roomId === 3 ? "SF9HNF" : message.payload.gameSession.roomId.toString(),
          userId: 199, // استخدام مستخدم من النظام
          fullName: "علي خالد المنصوري" // الاسم الكامل المراد عرضه في اللعبة
        }
      };
      console.log(`سيتم استخدام رمز الغرفة: ${joinRoomMessage.payload.roomCode}`);
      
      studentWs.send(JSON.stringify(joinRoomMessage));
      console.log('تم إرسال طلب انضمام الطالب للغرفة');
    });
    
    // استقبال رسائل الطالب
    studentWs.on('message', function incoming(studentData) {
      const studentMessage = JSON.parse(studentData.toString());
      console.log('رسالة للطالب:', studentMessage.type);
      
      // معالجة رد الانضمام للغرفة
      if (studentMessage.type === 'room_joined') {
        console.log('تم انضمام الطالب للغرفة، معرف اللعبة:', studentMessage.payload.currentGameId);
        console.log('اسم المستخدم المعروض:', studentMessage.payload.username);
      }
      
      // معالجة تحديث حالة اللعبة
      if (studentMessage.type === 'game_state_update') {
        // عرض قائمة اللاعبين مع أسمائهم
        console.log('تحديث حالة اللعبة، قائمة اللاعبين:');
        studentMessage.payload.players.forEach(player => {
          console.log(`- لاعب برقم ${player.id}: ${player.username}`);
        });
      }
    });
    
    // معالجة الأخطاء للطالب
    studentWs.on('error', function error(err) {
      console.error('حدث خطأ للطالب:', err);
    });
  }
});

// معالجة الأخطاء للمعلم
teacherWs.on('error', function error(err) {
  console.error('حدث خطأ للمعلم:', err);
});

// عند الإغلاق
teacherWs.on('close', function close() {
  console.log('تم إغلاق اتصال المعلم');
});

// إغلاق الاتصال بعد 15 ثانية
setTimeout(() => {
  if (studentWs) {
    studentWs.close();
    console.log('تم إغلاق اتصال الطالب');
  }
  teacherWs.close();
  console.log('تم إغلاق اتصال المعلم');
}, 15000);
