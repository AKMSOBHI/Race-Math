import { WebSocket } from 'ws';

// أولاً نقوم بإنشاء اتصال للطالب
const studentWs = new WebSocket('ws://localhost:5000/ws');

studentWs.on('open', async function open() {
  console.log('تم فتح الاتصال للطالب');
  
  // انضمام الطالب لغرفة معروفة مسبقاً باستخدام الرمز
  const joinMessage = {
    type: "join_room",
    payload: {
      roomCode: "SF9HNF", // رمز غرفة نشطة
      userId: 199,
      fullName: "أحمد سعيد العمري"
    }
  };
  
  // إرسال طلب الانضمام
  studentWs.send(JSON.stringify(joinMessage));
  console.log('تم إرسال طلب الانضمام للغرفة');
});

// استقبال الرسائل
studentWs.on('message', function incoming(data) {
  const message = JSON.parse(data.toString());
  console.log(`رسالة مستلمة: ${message.type}`);
  
  // إذا تم الانضمام للغرفة بنجاح
  if (message.type === 'room_joined') {
    console.log(`تم الانضمام بنجاح للغرفة باستخدام الاسم: ${message.payload.username}`);
    
    if (message.payload.currentGameId) {
      console.log(`هناك لعبة نشطة بمعرف: ${message.payload.currentGameId}`);
    }
  }
  
  // إذا كان هناك تحديث لحالة اللعبة
  if (message.type === 'game_state_update') {
    console.log('تحديث حالة اللعبة:');
    console.log('قائمة اللاعبين:');
    message.payload.players.forEach(player => {
      console.log(`- ${player.username} (المعرف: ${player.id}, النقاط: ${player.score})`);
    });
  }
});

// معالجة الأخطاء
studentWs.on('error', function error(err) {
  console.error('حدث خطأ:', err);
});

// إغلاق الاتصال بعد 10 ثواني
setTimeout(() => {
  studentWs.close();
  console.log('تم إغلاق الاتصال');
  process.exit(0); // إنهاء البرنامج
}, 10000);
