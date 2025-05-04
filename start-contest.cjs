const WebSocket = require('ws');

// تعديل عنوان الخادم حسب الحاجة
const serverUrl = 'ws://localhost:5000/ws';
const ws = new WebSocket(serverUrl);

ws.on('open', () => {
  console.log('تم الاتصال بالخادم بنجاح! 🎉');
  
  // بدء المسابقة في الغرفة
  const startContest = {
    type: "start_contest",
    payload: {
      roomId: 1,
      teacherId: 1,
      difficulty: "easy"
    }
  };
  
  ws.send(JSON.stringify(startContest));
  console.log('تم إرسال طلب بدء المسابقة! 🚀');
  
  // أغلق بعد 5 ثواني
  setTimeout(() => {
    ws.close();
    console.log('تم إنهاء الاتصال');
    process.exit(0);
  }, 5000);
});

ws.on('message', (data) => {
  console.log('استلام رسالة من الخادم:');
  try {
    const parsed = JSON.parse(data.toString());
    console.log(JSON.stringify(parsed, null, 2));
  } catch (e) {
    console.log('رسالة غير قابلة للتحليل:', data);
  }
});

ws.on('error', (error) => {
  console.error('حدث خطأ في الاتصال:', error);
  process.exit(1);
});
