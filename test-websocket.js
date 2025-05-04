import { WebSocket } from 'ws';

// إنشاء اتصال WebSocket
const ws = new WebSocket('ws://localhost:5000/ws');

// عند الاتصال
ws.on('open', function open() {
  console.log('تم فتح الاتصال');
  
  // صمري المعلمة تطلب قائمة الغرف والإشعارات
  const message = {
    type: "get_room_list",
    payload: {
      teacherId: 1
    }
  };
  
  ws.send(JSON.stringify(message));
  console.log('تم إرسال الطلب');
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

// إغلاق الاتصال بعد 10 ثواني
setTimeout(() => {
  ws.close();
  console.log('إغلاق الاتصال');
}, 10000);
