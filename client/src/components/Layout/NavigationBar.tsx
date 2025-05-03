import { useGameStore } from '@/lib/game/gameState';
import { useLocation } from 'wouter';
import { soundService } from '@/lib/soundService';

export default function NavigationBar() {
  const [_, navigate] = useLocation();
  const { toggleSound, isSoundEnabled, resetGameState, currentGame } = useGameStore();
  
  const handleExit = () => {
    // تشغيل صوت النقر
    if (isSoundEnabled) {
      soundService.play('click');
    }
    
    // طباعة معلومات إنهاء المهمة
    console.log('تم النقر على زر "إلغاء المهمة"...');
    
    // إعادة ضبط حالة اللعبة بشكل كامل قبل التوجيه
    resetGameState();
    
    // يتم التوجيه للصفحة الرئيسية بعد مسح البيانات
    console.log('تم مسح بيانات اللعبة، جاري العودة للصفحة الرئيسية...');
    navigate('/');
  };
  
  return (
    <nav className="relative z-50 space-container px-6 py-3 flex justify-between items-center shadow-lg border-b-2" style={{ borderColor: 'var(--space-bright)' }}>
      <div className="flex items-center">
        <div className="space-title text-2xl md:text-3xl" style={{ fontFamily: 'Orbitron, sans-serif' }}>
          <span className="text-purple-400">رحلة</span>
          <span className="text-pink-500">الرياضيات</span>
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <button 
          className="space-button text-white font-bold py-2 px-4 rounded-full transition"
          onClick={handleExit}
          style={{
            background: 'linear-gradient(45deg, var(--space-pink), var(--space-purple))',
            fontFamily: 'Orbitron, sans-serif'
          }}
        >
          <i className="fas fa-door-open ml-2"></i>إلغاء المهمة
        </button>
        
        <div 
          className="p-2 rounded-full relative"
          style={{
            background: isSoundEnabled 
              ? 'rgba(0, 245, 212, 0.3)' 
              : 'rgba(229, 0, 164, 0.3)',
            border: `1px solid ${isSoundEnabled ? 'var(--space-bright)' : 'var(--space-pink)'}`,
            boxShadow: `0 0 10px ${isSoundEnabled ? 'var(--space-bright)' : 'var(--space-pink)'}`
          }}
        >
          <button 
            className="focus:outline-none"
            onClick={toggleSound}
          >
            <i className={`fas ${isSoundEnabled ? 'fa-volume-up' : 'fa-volume-mute'} text-white text-xl`}></i>
          </button>
        </div>
      </div>
    </nav>
  );
}
