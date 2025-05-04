import { FC, useEffect } from 'react';
import { useGameStore } from '@/lib/game/gameState';
import { formatStageName } from '@/lib/game/questions';
import { soundService } from '@/lib/soundService';
import { convertToArabicNumerals } from '@/lib/utils';

const StageCompleteModal: FC = () => {
  const { 
    currentGame, 
    currentUser,
    setShowStageCompleteModal,
    nextStage,
    resetGameState,
    setShowGameOverModal,
    isSoundEnabled
  } = useGameStore();
  
  // تشغيل صوت إكمال المرحلة عند ظهور النافذة
  useEffect(() => {
    if (isSoundEnabled) {
      soundService.play('levelComplete');
    }
  }, [isSoundEnabled]);
  
  // Find current player to get score
  const currentPlayer = currentGame?.players.find(
    p => currentUser && p.id === currentUser.id
  );
  
  // ترجمة اسم المرحلة التالية
  const stageTranslation: Record<string, string> = {
    'ADDITION': 'الجمع',
    'SUBTRACTION': 'الطرح',
    'MULTIPLICATION': 'الضرب',
    'DIVISION': 'القسمة',
    'BASIC_ADDITION_SUBTRACTION': 'الجمع والطرح الأساسي',
    'COMPLEX_ADDITION_SUBTRACTION': 'الجمع والطرح المتقدم'
  };
  
  // الحصول على اسم المرحلة التالية وما إذا كانت اللعبة انتهت
  let nextStageName = '';
  let isGameCompleted = false;
  
  if (currentGame) {
    switch (currentGame.stage) {
      case 'BASIC_ADDITION_SUBTRACTION':
        nextStageName = stageTranslation['COMPLEX_ADDITION_SUBTRACTION'];
        break;
      case 'COMPLEX_ADDITION_SUBTRACTION':
        nextStageName = stageTranslation['MULTIPLICATION'];
        break;
      case 'MULTIPLICATION':
        nextStageName = stageTranslation['DIVISION'];
        break;
      case 'DIVISION':
        nextStageName = 'اكتملت اللعبة!';
        isGameCompleted = true;
        break;
    }
  }
  
  const handleNextStage = () => {
    if (!currentGame) return;
    
    if (isSoundEnabled) {
      soundService.play('click');
    }
    
    console.log('تم النقر على زر "المرحلة التالية"...');
    
    // صورة الحالة قبل أي تغييرات
    const gameId = currentGame.id;
    const gameState = useGameStore.getState();
    
    // إظهار مؤشر التحميل لمنع الشاشة السوداء
    gameState.setIsLoading(true);
    
    // إخفاء هذه النافذة أولاً بغض النظر عن الحالة
    setShowStageCompleteModal(false);
    
    try {
      // إذا كانت هذه هي المرحلة الأخيرة، قم بعرض شاشة اكتمال اللعبة بدلاً من الانتقال إلى مرحلة جديدة
      if (isGameCompleted) {
        console.log('اللعبة اكتملت! عرض شاشة انتهاء اللعبة...');
        
        // إظهار نافذة انتهاء اللعبة بعد فترة قصيرة
        setTimeout(() => {
          // إخفاء مؤشر التحميل
          const updatedState = useGameStore.getState();
          updatedState.setIsLoading(false);
          
          // استخدام معلمات دالة setShowGameOverModal المحدثة
          const score = currentPlayer?.score || 0;
          console.log('إظهار شاشة انتهاء اللعبة مع النتيجة النهائية:', score);
          updatedState.setShowGameOverModal(true, 'completed', score);
        }, 500);
      } else {
        // إرسال طلب المرحلة التالية بعد فترة قصيرة
        setTimeout(() => {
          console.log('بدء المرحلة التالية، رقم اللعبة:', gameId);
          
          // الحصول على الحالة المحدثة
          try {
            const { nextStage: nextStageFunc } = useGameStore.getState();
            nextStageFunc(gameId);
            
            // إلغاء حالة التحميل بعد مزيد من الوقت
            setTimeout(() => {
              const finalState = useGameStore.getState();
              if (finalState.isLoading) {
                finalState.setIsLoading(false);
              }
            }, 2000);
          } catch (error) {
            console.error('خطأ في الانتقال للمرحلة التالية:', error);
            // إلغاء حالة التحميل في حالة الخطأ
            const errorState = useGameStore.getState();
            errorState.setIsLoading(false);
          }
        }, 500);
      }
    } catch (error) {
      console.error('خطأ في معالجة المرحلة التالية:', error);
      // إلغاء حالة التحميل عند حدوث خطأ
      const errorState = useGameStore.getState();
      errorState.setIsLoading(false);
    }
  };
  
  // حساب النقاط القصوى لكل مرحلة منفردة (5 أسئلة × 3 نقاط لكل سؤال)
  const pointsPerStage = 5 * 3; // 15 نقطة لكل مرحلة
  
  // حساب النقاط الحالية والنقاط القصوى للمرحلة الحالية فقط
  const score = currentPlayer?.score || 0;
  const stageProgress = currentPlayer?.progress || 0;
  
  // نسبة الإكمال للمرحلة الحالية من 5 أسئلة
  const stageCompletionPercent = Math.min(100, Math.round((stageProgress / 5) * 100));
  
  // هنا نعرض نقاط المرحلة الحالية فقط، وليس إجمالي النقاط
  const currentStageScore = Math.min(pointsPerStage, score - (getStageIndex(currentGame?.stage) * pointsPerStage));
  
  // الوظيفة المساعدة للحصول على ترتيب المرحلة (0 للمرحلة الأولى، 1 للثانية، إلخ)
  function getStageIndex(stage?: string): number {
    switch (stage) {
      case 'BASIC_ADDITION_SUBTRACTION': return 0;
      case 'COMPLEX_ADDITION_SUBTRACTION': return 1;
      case 'MULTIPLICATION': return 2;
      case 'DIVISION': return 3;
      default: return 0;
    }
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="space-container rounded-xl p-6 max-w-md w-full mx-4 text-center">
        <div className="mb-4">
          <div 
            className="w-24 h-24 rounded-full flex items-center justify-center mx-auto"
            style={{
              background: 'linear-gradient(45deg, #ffd700, var(--space-bright))',
              boxShadow: '0 0 30px #ffd700',
              border: '2px solid #ffd700'
            }}
          >
            <i className="fas fa-star text-white text-5xl"></i>
          </div>
        </div>
        <h2 className="text-3xl space-title mb-2" style={{ color: '#ffd700', textShadow: '0 0 10px #ffd700', fontFamily: 'Orbitron, sans-serif' }}>
          ! أكملت المهمة
        </h2>
        <div className="text-xl mb-6" style={{ fontFamily: 'Orbitron, sans-serif' }}>
          <p className="mb-2">
            مجموع النقاط الكلي :<span className="font-bold text-yellow-300">{convertToArabicNumerals(score)}</span>
          </p>
          <p className="mb-2">
            نقاط هذه المرحلة :<span className="font-bold text-yellow-300">{convertToArabicNumerals(currentStageScore)}</span> / {convertToArabicNumerals(pointsPerStage)}
          </p>
          <div className="w-full bg-gray-700 rounded-full h-2.5 mb-2">
            <div className="bg-yellow-300 h-2.5 rounded-full" style={{ width: `${stageCompletionPercent}%` }}></div>
          </div>
          <p className="text-sm text-yellow-200">
            {convertToArabicNumerals(stageProgress)} من ٥ أسئلة مكتملة
          </p>
        </div>
        
        {!isGameCompleted ? (
          <div 
            className="p-4 rounded-lg mb-6"
            style={{
              background: 'rgba(123, 44, 191, 0.3)',
              border: '1px solid var(--space-purple)',
              boxShadow: '0 0 15px rgba(123, 44, 191, 0.4)'
            }}
          >
            <h3 className="font-bold mb-2 text-purple-300" style={{ fontFamily: 'Orbitron, sans-serif' }}>المهمة التالية :</h3>
            <p className="text-2xl space-title text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>{nextStageName}</p>
          </div>
        ) : (
          <div 
            className="p-4 rounded-lg mb-6"
            style={{
              background: 'rgba(0, 200, 83, 0.3)',
              border: '1px solid #00c853',
              boxShadow: '0 0 15px rgba(0, 200, 83, 0.4)'
            }}
          >
            <h3 className="font-bold mb-2 text-green-300" style={{ fontFamily: 'Orbitron, sans-serif' }}>تهانينا !</h3>
            <p className="text-2xl space-title text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>لقد أكملت جميع المهام بنجاح !</p>
          </div>
        )}
        
        <button 
          className="space-button text-white font-bold py-3 px-6 rounded-lg transition"
          onClick={handleNextStage}
          style={{
            background: isGameCompleted
              ? 'linear-gradient(45deg, #00c853, #69f0ae)'
              : 'linear-gradient(45deg, #ffd700, var(--space-bright))',
            boxShadow: isGameCompleted
              ? '0 0 20px rgba(0, 200, 83, 0.5)'
              : '0 0 20px rgba(255, 215, 0, 0.5)',
            fontFamily: 'Orbitron, sans-serif'
          }}
        >
          <i className={`fas ${isGameCompleted ? 'fa-trophy' : 'fa-rocket'} ml-2`}></i>
          {isGameCompleted ? 'عرض النتائج النهائية' : 'إطلاق المهمة التالية'}
        </button>
      </div>
    </div>
  );
};

export default StageCompleteModal;
