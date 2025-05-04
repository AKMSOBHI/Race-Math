import WebSocket from 'ws';
import readline from 'readline';

// تعديل هذا ليناسب عنوان الخادم لديك
const serverUrl = 'ws://localhost:5000/ws';
const ws = new WebSocket(serverUrl);

ws.on('open', () => {
  console.log('تم الاتصال بالخادم بنجاح! 🎉');
  
  // إنشاء حساب ضيف
  fetch('http://localhost:5000/api/users/guest', {
    method: 'POST',
  })
  .then(response => response.json())
  .then(user => {
    console.log('تم إنشاء حساب ضيف:', user);
    
    // الانضمام إلى الغرفة
    const joinRoom = {
      type: "join_room",
      payload: {
        roomCode: "TBJ42M",
        userId: user.id,
        fullName: "طالبة اختبار"
      }
    };
    
    ws.send(JSON.stringify(joinRoom));
    console.log('تم إرسال طلب الانضمام للغرفة! 🚀');
  })
  .catch(error => {
    console.error('خطأ في إنشاء حساب ضيف:', error);
  });
});

ws.on('message', (data) => {
  console.log('استلام رسالة من الخادم:');
  try {
    const parsed = JSON.parse(data);
    console.log(JSON.stringify(parsed, null, 2));
    
    // إذا تلقينا رسالة الانضمام للغرفة بنجاح
    if (parsed.type === 'room_joined') {
      console.log('تم الانضمام للغرفة بنجاح! 🎉');
      console.log('معرف الغرفة:', parsed.payload.roomId);
      console.log('معرف المستخدم:', parsed.payload.userId);
      console.log('اسم المستخدم:', parsed.payload.username);
      
      if (parsed.payload.currentGameId) {
        console.log('معرف اللعبة النشطة:', parsed.payload.currentGameId);
        
        // الانضمام للعبة
        const joinGame = {
          type: "join_game",
          payload: {
            gameId: parsed.payload.currentGameId,
            playerId: parsed.payload.userId
          }
        };
        
        ws.send(JSON.stringify(joinGame));
        console.log('تم إرسال طلب الانضمام للعبة! 🚀');
      } else {
        console.log('لا يوجد لعبة نشطة متاحة حاليًا.');
      }
    }
    
    // إذا تلقينا تحديث حالة اللعبة
    if (parsed.type === 'game_state_update') {
      console.log('تم تحديث حالة اللعبة! 🎮');
      console.log('معرف اللعبة:', parsed.payload.id);
      console.log('حالة اللعبة:', parsed.payload.status);
      console.log('المرحلة:', parsed.payload.stage);
      console.log('عدد الأسئلة:', parsed.payload.questions.length);
      
      if (parsed.payload.questions.length > 0) {
        console.log('السؤال الحالي:', parsed.payload.questions[parsed.payload.currentQuestionIndex]);
      }
    }
  } catch (e) {
    console.log('رسالة غير قابلة للتحليل:', data);
  }
});

ws.on('close', () => {
  console.log('تم إغلاق الاتصال بالخادم');
  process.exit(0);
});

ws.on('error', (error) => {
  console.error('حدث خطأ في الاتصال:', error);
});

// إنشاء واجهة القراءة من سطر الأوامر للتفاعل
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.on('line', (input) => {
  if (input === 'exit') {
    ws.close();
    rl.close();
  }
});

console.log('اكتب "exit" للخروج من البرنامج');
