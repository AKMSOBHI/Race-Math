// خدمة الأصوات المبسطة باستخدام HTML5 Audio

// كائن يحمل مسارات الأصوات
const soundPaths = {
  correct: '/sounds/correct.mp3', // صوت الإجابة الصحيحة
  wrong: '/sounds/wrong.mp3', // صوت الإجابة الخاطئة
  click: '/sounds/click.mp3', // صوت الضغط على الأزرار
  countdown: '/sounds/countdown.mp3', // صوت العد التنازلي
  success: '/sounds/success.mp3', // صوت النجاح
  gameOver: '/sounds/game-over.mp3', // صوت انتهاء اللعبة
  levelComplete: '/sounds/level-complete.mp3', // صوت اكتمال المرحلة
  backgroundMusic: '/sounds/background-music.mp3' // الموسيقى الخلفية
};

// مخزن لعناصر الصوت
const audioElements: Record<string, HTMLAudioElement> = {};

// عنصر الموسيقى الخلفية
let backgroundMusicElement: HTMLAudioElement | null = null;

// إدارة الأصوات
class SoundService {
  private muted: boolean = false;
  
  constructor() {
    // تهيئة الأصوات عند بداية التطبيق
    this.initSounds();
  }
  
  private initSounds() {
    try {
      // إعداد الموسيقى الخلفية
      console.log('تهيئة الموسيقى الخلفية');
      
      // إنشاء عنصر الموسيقى الخلفية
      backgroundMusicElement = new Audio(soundPaths.backgroundMusic);
      backgroundMusicElement.loop = true;
      backgroundMusicElement.volume = 0.3;
      
      // تجربة تشغيل مباشرة
      this.playBackgroundMusic();
      
      // تجربة تشغيل صوت النقر
      this.play('click');
    } catch (error) {
      console.error('خطأ في تهيئة الأصوات:', error);
    }
  }
  
  // تشغيل صوت محدد
  play(soundName: keyof typeof soundPaths) {
    if (this.muted) return null;
    
    try {
      console.log('تشغيل الصوت:', soundName);
      
      // إنشاء عنصر صوت جديد في كل مرة (لتجنب مشكلة تشغيل نفس الصوت مرة أخرى قبل انتهائه)
      const audio = new Audio(soundPaths[soundName]);
      audio.volume = soundName === 'click' ? 0.8 : 0.6;
      
      // تشغيل الصوت
      const playPromise = audio.play();
      
      // التعامل مع الوعد الذي يعيده التشغيل
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('تم تشغيل الصوت بنجاح:', soundName);
          })
          .catch((error) => {
            console.error('فشل تشغيل الصوت:', soundName, error);
          });
      }
      
      // إزالة الصوت من الذاكرة بعد الانتهاء
      audio.onended = () => {
        // تنظيف المرجع
        audio.src = '';
      };
      
      return audio;
    } catch (error) {
      console.error('خطأ في تشغيل الصوت:', soundName, error);
      return null;
    }
  }
  
  // تشغيل الموسيقى الخلفية
  playBackgroundMusic() {
    if (this.muted) return;
    
    try {
      console.log('محاولة تشغيل الموسيقى الخلفية');
      
      // إنشاء عنصر صوت جديد للموسيقى إذا لم يكن موجودًا
      if (!backgroundMusicElement) {
        backgroundMusicElement = new Audio(soundPaths.backgroundMusic);
        backgroundMusicElement.loop = true;
        backgroundMusicElement.volume = 0.3;
      }
      
      // تشغيل الموسيقى
      const playPromise = backgroundMusicElement.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('تم تشغيل الموسيقى الخلفية بنجاح');
          })
          .catch((error) => {
            console.error('فشل تشغيل الموسيقى الخلفية:', error);
            
            // محاولة إعادة إنشاء عنصر الموسيقى وتشغيله مرة أخرى
            setTimeout(() => {
              backgroundMusicElement = new Audio(soundPaths.backgroundMusic);
              backgroundMusicElement.loop = true;
              backgroundMusicElement.volume = 0.3;
              backgroundMusicElement.play().catch(err => console.error('فشلت المحاولة الثانية:', err));
            }, 1000);
          });
      }
    } catch (error) {
      console.error('خطأ في تشغيل الموسيقى الخلفية:', error);
    }
  }
  
  // إيقاف الموسيقى الخلفية
  stopBackgroundMusic() {
    try {
      console.log('إيقاف الموسيقى الخلفية...');
      if (backgroundMusicElement) {
        backgroundMusicElement.pause();
        backgroundMusicElement.currentTime = 0;
      }
    } catch (error) {
      console.error('خطأ في إيقاف الموسيقى الخلفية:', error);
    }
  }
  
  // التحكم في كتم/تشغيل الصوت
  toggleMute(): boolean {
    this.muted = !this.muted;
    
    try {
      // ضبط كتم الصوت للموسيقى الخلفية
      if (backgroundMusicElement) {
        backgroundMusicElement.muted = this.muted;
        
        // إذا تم إلغاء كتم الصوت والموسيقى متوقفة، قم بتشغيلها
        if (!this.muted && backgroundMusicElement.paused) {
          this.playBackgroundMusic();
        }
      }
    } catch (error) {
      console.error('خطأ في تبديل حالة الصوت:', error);
    }
    
    return this.muted;
  }
  
  // ضبط حالة كتم الصوت بشكل محدد
  setMute(muted: boolean) {
    this.muted = muted;
    
    try {
      // ضبط كتم الصوت للموسيقى الخلفية
      if (backgroundMusicElement) {
        backgroundMusicElement.muted = this.muted;
        
        // إذا تم إلغاء كتم الصوت والموسيقى متوقفة، قم بتشغيلها
        if (!this.muted && backgroundMusicElement.paused) {
          this.playBackgroundMusic();
        }
      }
    } catch (error) {
      console.error('خطأ في ضبط حالة كتم الصوت:', error);
    }
  }
  
  // الحصول على حالة كتم الصوت الحالية
  isMuted(): boolean {
    return this.muted;
  }
  
  // إيقاف جميع الأصوات
  stopAll() {
    try {
      console.log('إيقاف جميع الأصوات...');
      
      // إيقاف الموسيقى الخلفية
      if (backgroundMusicElement) {
        backgroundMusicElement.pause();
        backgroundMusicElement.currentTime = 0;
      }
      
      // إيقاف جميع الأصوات الأخرى المخزنة
      Object.entries(audioElements).forEach(([name, audio]) => {
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
          console.log('تم إيقاف الصوت:', name);
        }
      });
    } catch (error) {
      console.error('خطأ في إيقاف جميع الأصوات:', error);
    }
  }
}

// إنشاء نسخة واحدة من خدمة الصوت
export const soundService = new SoundService();