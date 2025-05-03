import { FC, useEffect, useState } from 'react';
import { useGameStore } from '@/lib/game/gameState';
import { useLocation } from 'wouter';
import { soundService } from '@/lib/soundService';
import { convertToArabicNumerals } from '@/lib/utils';

interface GameOverModalProps {
  reason: 'time' | 'completed' | 'failed' | 'cancelled';
  finalScore?: number;
}

// بيانات طلاب وهمية للمقارنة - ستكون هذه البيانات من الخادم في التطبيق الحقيقي
// الحد الأقصى للنقاط هو 60 نقطة
const MAX_SCORE = 60;

const mockLeaderboard = [
  { name: "أحمد", score: 60, time: "3:24" },
  { name: "سارة", score: 57, time: "4:12" },
  { name: "محمد", score: 52, time: "3:45" },
  { name: "نورة", score: 48, time: "5:10" }
];

const GameOverModal: FC<GameOverModalProps> = ({ reason, finalScore = 0 }) => {
  const [_, navigate] = useLocation();
  const { resetGameState, isSoundEnabled, currentUser, currentGame } = useGameStore();
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [elapsedTime, setElapsedTime] = useState("3:52"); // سيتم احتسابه من الوقت الفعلي في التطبيق الكامل
  
  // تشغيل صوت انتهاء اللعبة عند ظهور النافذة
  useEffect(() => {
    console.log('GameOverModal rendered, reason:', reason);
    
    try {
      if (isSoundEnabled) {
        if (reason === 'completed') {
          console.log('تشغيل صوت إكمال اللعبة');
          soundService.play('levelComplete');
        } else {
          console.log('تشغيل صوت انتهاء اللعبة');
          soundService.play('gameOver');
        }
      }
    } catch (error) {
      console.error('Error playing sound:', error);
    }
    
    // بعد 1 ثانية نظهر اللوحة
    const timer = setTimeout(() => {
      setShowLeaderboard(true);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [isSoundEnabled, reason]);
  
  // Get title and message based on reason
  const getContent = () => {
    switch (reason) {
      case 'time':
        return {
          title: 'انتهى الوقت!',
          message: 'لقد انتهى الوقت المخصص للإجابة على السؤال.',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          color: '#ef4444'
        };
      case 'completed':
        return {
          title: 'أحسنت! 🎉',
          message: 'لقد أكملت جميع المراحل بنجاح!',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          color: '#10b981'
        };
      case 'failed':
        return {
          title: 'انتهت اللعبة!',
          message: 'لقد استنفذت جميع المحاولات الخاصة بك.',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          color: '#ef4444'
        };
      case 'cancelled':
        return {
          title: 'تم إلغاء المهمة',
          message: 'لقد ألغيت المهمة الحالية. يمكنك العودة للمهام لاحقاً.',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ),
          color: '#6366f1' // Indigo color
        };
      default:
        return {
          title: 'انتهت اللعبة',
          message: 'شكراً للعب معنا!',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          color: '#6d28d9'
        };
    }
  };
  
  const content = getContent();
  
  const handlePlayAgain = () => {
    // تشغيل صوت النقر
    if (isSoundEnabled) {
      soundService.play('click');
    }
    
    // Reset game state and close modal
    resetGameState();
    navigate('/');
  };
  
  const handleExit = () => {
    // تشغيل صوت النقر
    if (isSoundEnabled) {
      soundService.play('click');
    }
    
    // Reset game state and navigate to home
    resetGameState();
    navigate('/');
  };
  
  // إنشاء جدول مقارنة بإضافة اللاعب الحالي
  const generateLeaderboard = () => {
    // تأكد من أن النتيجة لا تتجاوز الحد الأقصى
    const cappedScore = Math.min(finalScore, MAX_SCORE);
    console.log('إظهار شاشة انتهاء اللعبة مع النتيجة النهائية:', cappedScore);
    
    // نسخة من اللوحة مع إضافة اللاعب الحالي
    const newLeaderboard = [
      ...mockLeaderboard,
      { 
        name: currentUser?.username || 'أنت', 
        score: cappedScore, 
        time: elapsedTime 
      }
    ];
    
    // ترتيب اللوحة حسب النقاط
    return newLeaderboard.sort((a, b) => b.score - a.score);
  };
  
  const leaderboard = generateLeaderboard();
  const currentPlayerIndex = leaderboard.findIndex(player => 
    player.name === (currentUser?.username || 'أنت')
  );
  
  // حساب المستوى بناءً على النقاط (من أصل 60 نقطة كحد أقصى)
  const getLevel = (score: number) => {
    // ضمان أن النقاط لا تتجاوز الحد الأقصى
    const cappedScore = Math.min(score, MAX_SCORE);
    
    if (cappedScore >= 54) return "ممتاز"; // 90% من 60 = 54
    if (cappedScore >= 45) return "جيد جداً"; // 75% من 60 = 45
    if (cappedScore >= 36) return "جيد"; // 60% من 60 = 36
    return "مقبول";
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div 
        className="rounded-xl p-5 max-w-md w-full mx-4 text-center overflow-y-auto max-h-[90vh]"
        style={{
          background: 'linear-gradient(135deg, rgba(109, 40, 217, 0.9), rgba(76, 29, 149, 0.9))',
          border: '3px solid var(--space-bright)',
          boxShadow: '0 0 20px rgba(0, 245, 212, 0.7)'
        }}
      >
        {/* قسم العنوان والملخص */}
        <div className="mb-4">
          <div 
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
            style={{
              background: `linear-gradient(45deg, ${content.color}, ${content.color}dd)`,
              boxShadow: `0 0 20px ${content.color}`,
              border: `2px solid ${content.color}88`
            }}
          >
            {content.icon}
          </div>
        </div>
        
        <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
          {content.title}
        </h2>
        
        <p className="text-lg mb-3">
          {content.message}
        </p>
        
        {/* قسم النتيجة النهائية */}
        <div className="bg-purple-900/40 rounded-lg p-3 mb-5 border border-purple-500/50">
          <div className="text-xl font-bold mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            النقاط النهائية: {convertToArabicNumerals(Math.min(finalScore, MAX_SCORE))}
            {finalScore > MAX_SCORE && <span className="text-xs block">
              (الحد الأقصى {convertToArabicNumerals(MAX_SCORE)} نقطة)  
            </span>}
          </div>
          
          <div className="flex justify-between text-sm">
            <div>المستوى: <span className="font-bold">{getLevel(finalScore)}</span></div>
            <div>الوقت المستغرق: <span className="font-bold">{elapsedTime}</span></div>
          </div>
        </div>
        
        {/* جدول المقارنة */}
        {showLeaderboard && (
          <div className="mb-5 animate-fade-in">
            <h3 className="text-lg font-bold mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              ترتيبك بين الطلاب
            </h3>
            
            <div className="bg-purple-900/30 rounded-lg border border-purple-500/50 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-purple-800/50 border-b border-purple-600/50">
                    <th className="py-2">#</th>
                    <th className="py-2">الطالب</th>
                    <th className="py-2">النقاط</th>
                    <th className="py-2">الوقت</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((player, index) => (
                    <tr 
                      key={index} 
                      className={
                        index === currentPlayerIndex 
                          ? "bg-purple-600/40 border-b border-purple-500/30" 
                          : "border-b border-purple-500/20"
                      }
                    >
                      <td className="py-2">{convertToArabicNumerals(index + 1)}</td>
                      <td className="py-2">
                        {index === currentPlayerIndex ? (
                          <span className="font-bold">{player.name}</span>
                        ) : player.name}
                      </td>
                      <td className="py-2">{convertToArabicNumerals(player.score)}</td>
                      <td className="py-2">{player.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* أزرار العمل */}
        <div className="grid grid-cols-2 gap-3">
          <button 
            className="font-bold py-3 px-4 rounded-lg transition"
            onClick={handlePlayAgain}
            style={{
              background: 'linear-gradient(45deg, #10b981, #059669)',
              border: '2px solid #34d399',
              boxShadow: '0 0 15px rgba(16, 185, 129, 0.5)'
            }}
          >
            لعب مرة أخرى
          </button>
          
          <button 
            className="font-bold py-3 px-4 rounded-lg transition"
            onClick={handleExit}
            style={{
              background: 'linear-gradient(45deg, #6d28d9, #4c1d95)',
              border: '2px solid #8b5cf6',
              boxShadow: '0 0 15px rgba(139, 92, 246, 0.5)'
            }}
          >
            الخروج
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameOverModal;