import { WebSocket } from 'ws';

// إنشاء اتصال WebSocket لطالبة جديدة
const ws = new WebSocket('ws://localhost:5000/ws');

// عند الاتصال
ws.on('open', function open() {
  console.log('تم فتح الاتصال للطالبة');
  
  // إرسال طلب انضمام غرفة
  const message = {
    type: "join_room",
    payload: {
      roomCode: "TBJ42M",
      userId: 62, // رقم الطالبة الجديدة
      fullName: "سارة عبدالله القحطاني" // اسم مختلف للاختبار
    }
  };
  
  ws.send(JSON.stringify(message));
  console.log('تم إرسال طلب الانضمام');
});

// استقبال الرسائل
ws.on('message', function incoming(data) {
  console.log('تم استقبال رسالة:');
  console.log(data.toString());
});

// معالجة الأخطاء
ws.on('error', function error(err) {
  console.error('حدث خطأ:', err);
});

// عند الإغلاق
ws.on('close', function close() {
  console.log('تم إغلاق الاتصال');
});

// إغلاق الاتصال بعد 5 ثواني
setTimeout(() => {
  ws.close();
  console.log('إغلاق الاتصال');
}, 5000);