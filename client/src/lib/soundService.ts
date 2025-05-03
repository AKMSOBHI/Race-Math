import { Howl, Howler } from 'howler';

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

// تهيئة كائن يحمل جميع الأصوات
const sounds: Record<string, Howl> = {};

// إدارة الأصوات
class SoundService {
  private muted: boolean = false;
  
  constructor() {
    // تهيئة الأصوات عند بداية التطبيق
    this.initSounds();
  }
  
  private initSounds() {
    // فقط تهيئة الموسيقى الخلفية مسبقًا - بقية الأصوات يتم تحميلها عند الحاجة
    try {
      console.log('تهيئة الموسيقى الخلفية');
      sounds['backgroundMusic'] = new Howl({
        src: [soundPaths.backgroundMusic],
        volume: 0.3,
        loop: true,
        html5: false,
        preload: true,
        onload: () => {
          console.log('تم تحميل الموسيقى الخلفية');
          // تشغيل الموسيقى فور تحميلها
          if (!this.muted) {
            sounds['backgroundMusic'].play();
            console.log('تم تشغيل الموسيقى الخلفية فور تحميلها');
          }
        },
        onloaderror: (id, err) => console.error('خطأ في تحميل الموسيقى:', err)
      });
      
      // تجربة تشغيل مباشرة
      sounds['backgroundMusic']?.play();
      
    } catch (error) {
      console.error('خطأ في تهيئة الموسيقى الخلفية:', error);
    }
    
    // تجربة تشغيل صوت النقر
    this.play('click');
  }
  
  // تشغيل صوت محدد
  play(soundName: keyof typeof soundPaths) {
    if (this.muted) return null;
    
    try {
      console.log('تشغيل الصوت:', soundName);
      
      // إعادة إنشاء الصوت في كل مرة
      const path = soundPaths[soundName];
      const sound = new Howl({
        src: [path],
        volume: soundName === 'click' ? 0.8 : 0.6,
        html5: false,  // عدم استخدام HTML5 Audio لزيادة التوافق
        preload: false,  // تحميل الصوت عند الحاجة فقط
        autoplay: true,  // تشغيل تلقائي
        onend: () => {
          // حذف الصوت من الذاكرة بعد الانتهاء
          if (soundName !== 'backgroundMusic') {
            sound.unload();
          }
        },
        onplay: () => console.log('تم تشغيل الصوت بنجاح:', soundName),
        onloaderror: (id, err) => console.error('خطأ في تحميل الصوت:', soundName, err)
      });
      
      return sound;
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
      
      // تأكد من إيقاف أي موسيقى سابقة
      if (sounds.backgroundMusic) {
        sounds.backgroundMusic.stop();
        console.log('تم إيقاف الموسيقى الخلفية السابقة');
      }
      
      // تشغيل الموسيقى الخلفية بشكل مباشر
      const music = new Howl({
        src: [soundPaths.backgroundMusic],
        volume: 0.3,
        loop: true,
        html5: false,  // عدم استخدام HTML5 Audio لزيادة التوافق
        autoplay: true,  // تشغيل تلقائي
        onplay: () => {
          console.log('تم تشغيل الموسيقى الخلفية بنجاح');
        },
        onloaderror: (id, err) => console.error('خطأ في تحميل الموسيقى الخلفية:', err)
      });
      
      // تخزين مرجع الموسيقى الخلفية
      sounds.backgroundMusic = music;
      
    } catch (error) {
      console.error('خطأ في تشغيل الموسيقى الخلفية:', error);
    }
  }
  
  // إيقاف الموسيقى الخلفية
  stopBackgroundMusic() {
    try {
      console.log('إيقاف الموسيقى الخلفية...');
      if (sounds.backgroundMusic) {
        sounds.backgroundMusic.stop();
      }
    } catch (error) {
      console.error('خطأ في إيقاف الموسيقى الخلفية:', error);
    }
  }
  
  // التحكم في كتم/تشغيل الصوت
  toggleMute(): boolean {
    this.muted = !this.muted;
    Howler.mute(this.muted);
    
    try {
      // إيقاف/تشغيل الموسيقى الخلفية وفقًا لحالة كتم الصوت
      if (sounds.backgroundMusic) {
        if (this.muted) {
          sounds.backgroundMusic.stop();
        } else if (!sounds.backgroundMusic.playing()) {
          sounds.backgroundMusic.play();
        }
      } else if (!this.muted) {
        // إذا لم تكن موجودة وتم تشغيل الصوت، قم بتشغيل الموسيقى
        this.playBackgroundMusic();
      }
    } catch (error) {
      console.error('خطأ في تبديل حالة الصوت:', error);
    }
    
    return this.muted;
  }
  
  // ضبط حالة كتم الصوت بشكل محدد
  setMute(muted: boolean) {
    this.muted = muted;
    Howler.mute(this.muted);
    
    try {
      // إيقاف/تشغيل الموسيقى الخلفية وفقًا لحالة كتم الصوت
      if (sounds.backgroundMusic) {
        if (this.muted) {
          sounds.backgroundMusic.stop();
        } else if (!sounds.backgroundMusic.playing()) {
          sounds.backgroundMusic.play();
        }
      } else if (!this.muted) {
        // إذا لم تكن موجودة وتم تفعيل الصوت، قم بتشغيل الموسيقى
        this.playBackgroundMusic();
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
      // إيقاف كل صوت بشكل امن باستخدام التحقق من وجوده
      Object.entries(sounds).forEach(([name, sound]) => {
        if (sound && typeof sound.stop === 'function') {
          sound.stop();
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