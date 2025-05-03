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

// مخزن للأصوات النشطة
const activeSounds: Record<string, HTMLAudioElement[]> = {
  click: [],
  correct: [],
  wrong: [],
  success: [],
  countdown: [],
  gameOver: [],
  levelComplete: [],
  backgroundMusic: []
};

// عنصر الموسيقى الخلفية
let backgroundMusicElement: HTMLAudioElement | null = null;

// هل تم تفاعل المستخدم مع الصفحة
let userInteracted = false;

// إدارة الأصوات
class SoundService {
  private muted: boolean = false;
  
  constructor() {
    // إضافة مستمع للنقر على الصفحة لتفعيل الصوت
    this.setupUserInteractionListener();
  }
  
  // إضافة مستمع للنقر على الصفحة لتفعيل الصوت
  private setupUserInteractionListener() {
    try {
      const handleInteraction = () => {
        userInteracted = true;
        console.log('تم التفاعل مع الصفحة - تمكين الصوت');
        
        // تشغيل الموسيقى الخلفية
        this.initSounds();
        
        // إزالة المستمعين بعد التفاعل الأول
        document.removeEventListener('click', handleInteraction);
        document.removeEventListener('touchstart', handleInteraction);
        document.removeEventListener('keydown', handleInteraction);
      };
      
      // إضافة مستمعين للتفاعل
      document.addEventListener('click', handleInteraction);
      document.addEventListener('touchstart', handleInteraction);
      document.addEventListener('keydown', handleInteraction);
      
      console.log('تمت إضافة مستمعي التفاعل لتمكين الصوت');
    } catch (error) {
      console.error('خطأ في إعداد مستمعي التفاعل:', error);
    }
  }
  
  private initSounds() {
    try {
      console.log('تهيئة الأصوات');
      
      // إنشاء قناصر صوت مسبقًا لتجنب مشكلات التأخير
      this.preloadSound('click');
      this.preloadSound('correct');
      this.preloadSound('wrong');
      
      // إعداد الموسيقى الخلفية
      if (!backgroundMusicElement) {
        console.log('تهيئة الموسيقى الخلفية');
        backgroundMusicElement = document.createElement('audio');
        backgroundMusicElement.src = soundPaths.backgroundMusic;
        backgroundMusicElement.loop = true;
        backgroundMusicElement.volume = 0.3;
        backgroundMusicElement.setAttribute('playsinline', '');
        
        // إضافة مستمع لأي أخطاء
        backgroundMusicElement.addEventListener('error', (error) => {
          console.error('خطأ في تحميل الموسيقى الخلفية:', error);
        });
        
        // محاولة تشغيل الموسيقى
        this.playBackgroundMusic();
      }
    } catch (error) {
      console.error('خطأ في تهيئة الأصوات:', error);
    }
  }
  
  // تحميل صوت مسبقًا
  private preloadSound(soundName: keyof typeof soundPaths) {
    try {
      const audio = document.createElement('audio');
      audio.src = soundPaths[soundName];
      audio.setAttribute('preload', 'auto');
      audio.setAttribute('playsinline', '');
      audio.volume = soundName === 'click' ? 0.8 : 0.6;
      
      // إضافة مستمع لأي أخطاء
      audio.addEventListener('error', (error) => {
        console.error(`خطأ في تحميل الصوت ${soundName}:`, error);
      });
      
      // إضافة مستمع للتحميل الناجح
      audio.addEventListener('canplaythrough', () => {
        console.log(`تم تحميل الصوت ${soundName} بنجاح`);
      });
      
      // تخزين الصوت في مخزن الأصوات النشطة
      activeSounds[soundName].push(audio);
      
      return audio;
    } catch (error) {
      console.error(`خطأ في تحميل الصوت ${soundName}:`, error);
      return null;
    }
  }
  
  // تشغيل صوت محدد
  play(soundName: keyof typeof soundPaths) {
    if (this.muted) return null;
    
    try {
      // إنشاء عنصر صوت جديد لكل تشغيل
      const audio = document.createElement('audio');
      audio.src = soundPaths[soundName];
      audio.volume = soundName === 'click' ? 0.8 : 0.6;
      
      // تعيين خيارات الصوت
      audio.setAttribute('playsinline', '');
      
      
      // تشغيل الصوت
      audio.addEventListener('canplay', () => {
        console.log(`الصوت ${soundName} جاهز للتشغيل`);
        audio.play()
          .then(() => {
            console.log(`تم تشغيل الصوت ${soundName} بنجاح`);
          })
          .catch(error => {
            console.error(`فشل تشغيل الصوت ${soundName}:`, error);
          });
      });
      
      // تنظيف الصوت بعد الانتهاء
      audio.addEventListener('ended', () => {
        audio.remove();
      });
      
      // إضافة الصوت إلى مصفوفة الأصوات النشطة
      activeSounds[soundName].push(audio);
      
      // محاولة تشغيل الصوت قبل جاهزيته
      audio.play().catch(() => {
        // تتم معالجة الخطأ في مستمع canplay
      });
      
      return audio;
    } catch (error) {
      console.error('خطأ في تشغيل الصوت:', soundName, error);
      return null;
    }
  }
  
  // تشغيل الموسيقى الخلفية
  playBackgroundMusic() {
    if (this.muted || !userInteracted) return;
    
    try {
      console.log('محاولة تشغيل الموسيقى الخلفية');
      
      if (!backgroundMusicElement) {
        backgroundMusicElement = document.createElement('audio');
        backgroundMusicElement.src = soundPaths.backgroundMusic;
        backgroundMusicElement.loop = true;
        backgroundMusicElement.volume = 0.3;
        backgroundMusicElement.setAttribute('playsinline', '');
        document.body.appendChild(backgroundMusicElement);
      }
      
      // إذا كانت الموسيقى متوقفة، قم بتشغيلها
      if (backgroundMusicElement.paused) {
        backgroundMusicElement.currentTime = 0;
        backgroundMusicElement.play()
          .then(() => {
            console.log('تم تشغيل الموسيقى الخلفية بنجاح');
          })
          .catch(error => {
            console.error('فشل تشغيل الموسيقى الخلفية:', error);
          });
      }
    } catch (error) {
      console.error('خطأ في تشغيل الموسيقى الخلفية:', error);
    }
  }
  
  // إيقاف الموسيقى الخلفية
  stopBackgroundMusic() {
    try {
      if (backgroundMusicElement) {
        backgroundMusicElement.pause();
        backgroundMusicElement.currentTime = 0;
        console.log('تم إيقاف الموسيقى الخلفية');
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
        if (!this.muted && backgroundMusicElement.paused && userInteracted) {
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
        if (!this.muted && backgroundMusicElement.paused && userInteracted) {
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
      // إيقاف الموسيقى الخلفية
      if (backgroundMusicElement) {
        backgroundMusicElement.pause();
        backgroundMusicElement.currentTime = 0;
      }
      
      // إيقاف جميع الأصوات الأخرى
      Object.keys(activeSounds).forEach(soundType => {
        activeSounds[soundType].forEach(audio => {
          audio.pause();
          audio.currentTime = 0;
        });
        
        // مسح مصفوفة الأصوات
        activeSounds[soundType] = [];
      });
      
      console.log('تم إيقاف جميع الأصوات');
    } catch (error) {
      console.error('خطأ في إيقاف جميع الأصوات:', error);
    }
  }
}

// إنشاء نسخة واحدة من خدمة الصوت
export const soundService = new SoundService();