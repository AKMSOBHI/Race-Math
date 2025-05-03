import { useLocation } from 'wouter';
import { Home, UserCircle, LogOut } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { soundService } from '@/lib/soundService';
import { useGameStore } from '@/lib/game/gameState';
import { useRoute } from 'wouter';

export function NavigationBar() {
  const [_, navigate] = useLocation();
  const [isGamePage] = useRoute('/game/:gameId');
  const { currentUser, resetGameState } = useGameStore();
  
  const goTo = (path: string) => {
    try {
      soundService.play('click');
    } catch (e) {
      console.error("خطأ في تشغيل صوت النقر", e);
    }
    navigate(path);
  };
  
  const handleExitGame = () => {
    try {
      soundService.play('click');
      soundService.stopBackgroundMusic();
      resetGameState();
      navigate('/');
    } catch (e) {
      console.error("خطأ في الخروج من اللعبة", e);
      navigate('/');
    }
  };
  
  return (
    <div className="flex items-center justify-between w-full py-2 px-4 md:px-6 bg-opacity-20 backdrop-blur-md bg-black/10 relative z-10">
      <div className="flex items-center gap-2 md:gap-4">
        <Button 
          variant="ghost" 
          className="rounded-full p-2"
          onClick={() => goTo('/')}
          style={{ 
            background: 'rgba(0, 0, 0, 0.2)', 
            border: '1px solid rgba(255, 255, 255, 0.1)' 
          }}
        >
          <Home size={20} className="text-white" />
        </Button>
        
        {/* إضافة مكون الإشعارات */}
        <NotificationBell />
      </div>
      
      <div className="flex items-center gap-2">
        {/* زر الخروج من اللعبة يظهر فقط في صفحة اللعبة */}
        {isGamePage && (
          <Button 
            variant="ghost"
            className="rounded-full px-2 py-1 flex items-center gap-1 text-sm"
            onClick={handleExitGame}
            style={{ 
              background: 'rgba(255, 0, 0, 0.15)', 
              border: '1px solid rgba(255, 0, 0, 0.3)' 
            }}
          >
            <LogOut size={16} className="text-white" />
            <span className="text-white hidden sm:inline">خروج من اللعبة</span>
          </Button>
        )}
        
        {currentUser && (
          <div className="hidden md:flex items-center gap-2 bg-black/30 px-3 py-1 rounded-full">
            <UserCircle size={20} className="text-white" />
            <span className="text-white text-sm">{currentUser.username}</span>
          </div>
        )}
      </div>
    </div>
  );
}
