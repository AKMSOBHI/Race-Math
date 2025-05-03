import { Howl, Howler } from 'howler';

// كائن يحمل مسارات الأصوات
const soundPaths = {
  correct: 'https://www.FreeSound.org/data/previews/443/443129_5356256-lq.mp3', // صوت الإجابة الصحيحة
  wrong: 'https://www.FreeSound.org/data/previews/131/131657_2398403-lq.mp3', // صوت الإجابة الخاطئة
  click: 'https://www.FreeSound.org/data/previews/242/242501_4414130-lq.mp3', // صوت الضغط على الأزرار
  countdown: 'https://www.FreeSound.org/data/previews/254/254316_4404-lq.mp3', // صوت العد التنازلي
  success: 'https://www.FreeSound.org/data/previews/456/456966_9652874-lq.mp3', // صوت النجاح
  gameOver: 'https://www.FreeSound.org/data/previews/277/277401_5354534-lq.mp3', // صوت انتهاء اللعبة
  levelComplete: 'https://www.FreeSound.org/data/previews/270/270402_5123851-lq.mp3', // صوت اكتمال المرحلة
  backgroundMusic: 'https://www.FreeSound.org/data/previews/353/353546_5712554-lq.mp3' // الموسيقى الخلفية
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
    // إنشاء كائنات الأصوات وتهيئتها
    Object.entries(soundPaths).forEach(([name, path]) => {
      try {
        console.log('تهيئة الصوت:', name);
        
        // إعدادات خاصة للموسيقى الخلفية
        if (name === 'backgroundMusic') {
          sounds[name] = new Howl({
            src: [path],
            volume: 0.3,
            loop: true,
            html5: true,
            preload: true,
            onload: () => console.log('تم تحميل الموسيقى الخلفية'),
            onloaderror: (id, err) => console.error('خطأ في تحميل الموسيقى:', err)
          });
        } else {
          // إعدادات للأصوات الأخرى
          sounds[name] = new Howl({
            src: [path],
            volume: 0.6,
            html5: true,
            preload: true,
            onload: () => console.log('تم تحميل الصوت:', name),
            onloaderror: (id, err) => console.error('خطأ في تحميل الصوت:', name, err)
          });
        }
      } catch (error) {
        console.error('خطأ في تهيئة الصوت:', name, error);
      }
    });
  }
  
  // تشغيل صوت محدد
  play(soundName: keyof typeof soundPaths) {
    if (this.muted) return null;
    
    try {
      console.log('تشغيل الصوت:', soundName);
      
      // إذا لم يكن الصوت موجودًا بعد، قم بإنشائه
      if (!sounds[soundName]) {
        console.log('الصوت غير موجود، جاري إنشاؤه:', soundName);
        const path = soundPaths[soundName];
        sounds[soundName] = new Howl({
          src: [path],
          volume: 0.6,
          html5: true,
          preload: true,
          onload: () => {
            console.log('تم تحميل الصوت على الفور:', soundName);
            sounds[soundName].play();
          },
          onloaderror: (id, err) => console.error('خطأ في تحميل الصوت على الفور:', soundName, err)
        });
        return sounds[soundName];
      }
      
      // إيقاف الصوت نفسه إذا كان يعمل بالفعل ثم إعادة تشغيله
      const sound = sounds[soundName];
      sound.stop();
      sound.play();
      console.log('تم تشغيل الصوت بنجاح:', soundName);
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
      
      // إذا لم تكن الموسيقى الخلفية موجودة، قم بإنشائها
      if (!sounds.backgroundMusic) {
        console.log('الموسيقى الخلفية غير موجودة، جاري إنشاؤها');
        sounds.backgroundMusic = new Howl({
          src: [soundPaths.backgroundMusic],
          volume: 0.3,
          loop: true,
          html5: true,
          preload: true,
          onload: () => {
            console.log('تم تحميل الموسيقى الخلفية');
            if (!this.muted) {
              sounds.backgroundMusic.play();
              console.log('تم تشغيل الموسيقى الخلفية بنجاح');
            }
          },
          onloaderror: (id, err) => console.error('خطأ في تحميل الموسيقى الخلفية:', err)
        });
        return;
      }
      
      // إذا كانت موجودة بالفعل، تحقق من أنها تعمل
      if (!sounds.backgroundMusic.playing()) {
        sounds.backgroundMusic.play();
        console.log('تم تشغيل الموسيقى الخلفية بنجاح');
      } else {
        console.log('الموسيقى الخلفية تعمل بالفعل');
      }
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