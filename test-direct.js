import WebSocket from 'ws';

// تعديل عنوان الخادم حسب الحاجة
const serverUrl = 'ws://localhost:5000/ws';
const ws = new WebSocket(serverUrl);

let studentId = null;

ws.on('open', async () => {
  console.log('تم الاتصال بالخادم بنجاح');
  
  // 1. إنشاء حساب ضيف
  try {
    const guestResponse = await fetch('http://localhost:5000/api/users/guest', {
      method: 'POST'
    });
    const guestData = await guestResponse.json();
    studentId = guestData.id;
    console.log('تم إنشاء حساب ضيف:', guestData);
    
    // 2. بدء مسابقة من قبل المعلمة
    const startContestMsg = {
      type: "start_contest",
      payload: {
        roomId: 1,
        teacherId: 1,
        difficulty: "easy"
      }
    };
    
    console.log('إرسال طلب بدء المسابقة...');
    ws.send(JSON.stringify(startContestMsg));
    
    // 3. انتظار قليلاً ثم اطلب الانضمام كطالبة
    setTimeout(() => {
      if (studentId) {
        console.log('محاولة انضمام الطالبة للغرفة برمز TBJ42M...');
        const joinRoomMsg = {
          type: "join_room",
          payload: {
            roomCode: "TBJ42M",
            userId: studentId,
            fullName: "طالبة اختبار"
          }
        };
        
        ws.send(JSON.stringify(joinRoomMsg));
      }
    }, 3000);
  } catch (error) {
    console.error('حدث خطأ:', error);
  }
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.log('رسالة واردة:', message.type);
    
    // طباعة تفاصيل الرسالة بتنسيق مناسب
    console.log(JSON.stringify(message, null, 2));
    
    // التحقق من وصول رسالة الانضمام للغرفة بنجاح
    if (message.type === 'room_joined') {
      console.log('\n=== تم الانضمام للغرفة بنجاح ===');
      console.log('معرف الغرفة:', message.payload.roomId);
      console.log('معرف المستخدم:', message.payload.userId);
      console.log('اسم المستخدم:', message.payload.username);
      
      // التحقق من وجود معرف لعبة نشطة في الرسالة
      if (message.payload.currentGameId) {
        console.log('\n★★★ وجدنا معرف لعبة نشطة: ' + message.payload.currentGameId + ' ★★★');
        console.log('هذا يعني أن الطالبة ستنتقل مباشرة إلى صفحة اللعبة!\n');
        
        // الانضمام للعبة تلقائياً 
        const joinGameMsg = {
          type: "join_game",
          payload: {
            gameId: message.payload.currentGameId,
            playerId: message.payload.userId
          }
        };
        
        console.log('جاري الانضمام للعبة...');
        ws.send(JSON.stringify(joinGameMsg));
      } else {
        console.log('\n⚠️ لم يتم العثور على معرف لعبة نشطة في الرسالة');
        console.log('يجب التأكد من أن المسابقة بدأت بالفعل\n');
      }
    }
    
    // التحقق من استلام حالة اللعبة
    if (message.type === 'game_state_update') {
      console.log('\n=== تم استلام حالة اللعبة ===');
      console.log('معرف اللعبة:', message.payload.id);
      console.log('المرحلة:', message.payload.stage);
      console.log('حالة اللعبة:', message.payload.status);
      console.log('\nاختبار ناجح! ✓ الطالبة انضمت للغرفة ثم انتقلت مباشرة إلى اللعبة\n');
    }
  } catch (error) {
    console.error('خطأ في تحليل الرسالة:', error);
  }
});

ws.on('error', (error) => {
  console.error('خطأ في الاتصال:', error);
});

process.on('SIGINT', () => {
  console.log('إنهاء الاختبار...');
  if (ws.readyState === WebSocket.OPEN) {
    ws.close();
  }
  process.exit(0);
});

console.log('بدء الاختبار - اضغط Ctrl+C للخروج');
