const WebSocket = require('ws');

// تعديل عنوان الخادم حسب الحاجة
const serverUrl = 'ws://localhost:5000/ws';
const ws = new WebSocket(serverUrl);

let studentId = null;

ws.on('open', async () => {
  console.log('تم الاتصال بالخادم بنجاح! 🎉');
  
  try {
    // 1. إنشاء حساب ضيف
    const guestResponse = await fetch('http://localhost:5000/api/users/guest', {
      method: 'POST'
    });
    const guestData = await guestResponse.json();
    studentId = guestData.id;
    console.log('تم إنشاء حساب ضيف:', guestData);
    
    // 2. انضمام للغرفة
    const joinRoomMessage = {
      type: "join_room",
      payload: {
        roomCode: "TBJ42M",
        userId: studentId,
        fullName: "فاطمة العمودي الشهري"
      }
    };
    
    console.log('إرسال طلب الانضمام للغرفة...');
    ws.send(JSON.stringify(joinRoomMessage));
  } catch (error) {
    console.error('حدث خطأ:', error);
  }
});

ws.on('message', (data) => {
  console.log('استلام رسالة من الخادم:');
  try {
    const message = JSON.parse(data.toString());
    console.log(`نوع الرسالة: ${message.type}`);
    console.log(JSON.stringify(message, null, 2));
    
    // إذا تلقينا رسالة الانضمام للغرفة
    if (message.type === 'room_joined') {
      console.log('\n=== تم الانضمام للغرفة بنجاح ===');
      console.log('معرف الغرفة:', message.payload.roomId);
      console.log('معرف المستخدم:', message.payload.userId);
      console.log('اسم المستخدم:', message.payload.username);
      
      // التحقق من وجود معرف اللعبة النشطة
      if (message.payload.currentGameId) {
        console.log('\n★★★ تم العثور على معرف لعبة نشطة: ' + message.payload.currentGameId + ' ★★★');
        
        // الانضمام للعبة
        const joinGameMessage = {
          type: "join_game",
          payload: {
            gameId: message.payload.currentGameId,
            playerId: message.payload.userId
          }
        };
        
        console.log('إرسال طلب الانضمام للعبة...');
        ws.send(JSON.stringify(joinGameMessage));
      } else {
        console.log('\n⚠️ لم يتم العثور على معرف لعبة نشطة في رسالة الانضمام للغرفة!');
        console.log('هذا يعني أن الطالبة لن تنتقل مباشرة إلى اللعبة.');
      }
    }
    
    // إذا تلقينا تحديث حالة اللعبة
    if (message.type === 'game_state_update') {
      console.log('\n=== تم الانضمام للعبة بنجاح ===');
      console.log('معرف اللعبة:', message.payload.id);
      console.log('المرحلة:', message.payload.stage);
      console.log('الحالة:', message.payload.status);
      console.log('عدد الأسئلة:', message.payload.questions.length);
      
      console.log('\n✓ النظام يعمل بشكل صحيح!');
      console.log('الطالبة انضمت للغرفة ثم انتقلت مباشرة إلى اللعبة.');
      
      // إنهاء الاختبار بعد ثانيتين
      setTimeout(() => {
        ws.close();
        console.log('تم إنهاء الاختبار بنجاح');
        process.exit(0);
      }, 2000);
    }
  } catch (e) {
    console.log('رسالة غير قابلة للتحليل:', data);
  }
});

ws.on('error', (error) => {
  console.error('حدث خطأ في الاتصال:', error);
  process.exit(1);
});

// إنهاء التنفيذ بعد 30 ثانية للتأكد من عدم التعليق
setTimeout(() => {
  console.log('انتهى وقت الاختبار (30 ثانية)');
  process.exit(0);
}, 30000);
