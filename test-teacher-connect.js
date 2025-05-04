import { WebSocket } from 'ws';

// إنشاء اتصال WebSocket للمعلمة
const ws = new WebSocket('ws://localhost:5000/ws');

// عند الاتصال
ws.on('open', function open() {
  console.log('تم فتح الاتصال للمعلمة');
  
  // طلب قائمة الغرف كمعلمة
  const message = {
    type: "get_room_list",
    payload: {
      teacherId: 1
    }
  };
  
  ws.send(JSON.stringify(message));
  console.log('تم إرسال طلب قائمة الغرف');
});

// استقبال الرسائل
ws.on('message', function incoming(data) {
  const message = JSON.parse(data.toString());
  console.log('تم استقبال رسالة من النوع:', message.type);
  
  if (message.type === 'student_joined_room') {
    console.log('\n\n=== إشعار انضمام طالبة ===');
    console.log('الغرفة:', message.payload.roomName);
    console.log('اسم الطالبة:', message.payload.studentName);
    console.log('التاريخ:', new Date(message.payload.timestamp).toLocaleString());
    console.log('======================\n\n');
  } else {
    console.log(JSON.stringify(message, null, 2));
  }
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