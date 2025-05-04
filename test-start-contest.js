import WebSocket from 'ws';
import readline from 'readline';

// تعديل هذا ليناسب عنوان الخادم لديك
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
});

ws.on('message', (data) => {
  console.log('استلام رسالة من الخادم:');
  try {
    const parsed = JSON.parse(data);
    console.log(JSON.stringify(parsed, null, 2));
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
