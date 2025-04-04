import { Howl, Howler } from 'howler';

// أصوات اللعبة الأساسية
const sounds = {
  // أصوات الإجابات
  correct: new Howl({
    src: ['https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3'],
    volume: 0.6,
    preload: true
  }),
  wrong: new Howl({
    src: ['https://assets.mixkit.co/sfx/preview/mixkit-wrong-electricity-buzz-955.mp3'],
    volume: 0.6,
    preload: true
  }),
  
  // أصوات النظام
  click: new Howl({
    src: ['https://assets.mixkit.co/sfx/preview/mixkit-video-game-retro-click-237.mp3'],
    volume: 0.4,
    preload: true
  }),
  countdown: new Howl({
    src: ['https://assets.mixkit.co/sfx/preview/mixkit-game-ball-tap-2073.mp3'],
    volume: 0.4,
    preload: true
  }),
  success: new Howl({
    src: ['https://assets.mixkit.co/sfx/preview/mixkit-unlock-game-notification-253.mp3'],
    volume: 0.6,
    preload: true
  }),
  gameOver: new Howl({
    src: ['https://assets.mixkit.co/sfx/preview/mixkit-retro-arcade-game-over-470.mp3'],
    volume: 0.6,
    preload: true
  }),
  levelComplete: new Howl({
    src: ['https://assets.mixkit.co/sfx/preview/mixkit-game-level-completed-2059.mp3'],
    volume: 0.6,
    preload: true
  }),
  
  // الموسيقى الخلفية
  backgroundMusic: new Howl({
    src: ['https://assets.mixkit.co/sfx/preview/mixkit-game-show-electronic-waiting-music-loop-955.mp3'],
    volume: 0.3,
    loop: true,
    preload: true
  })
};

// إدارة الأصوات
class SoundService {
  private muted: boolean = false;
  
  constructor() {
    // تهيئة الأصوات عند بداية التطبيق
    this.preloadSounds();
  }
  
  private preloadSounds() {
    // محاولة تحميل جميع الأصوات مسبقاً
    Object.values(sounds).forEach(sound => {
      sound.load();
    });
  }
  
  // تشغيل صوت محدد
  play(soundName: keyof typeof sounds) {
    if (this.muted) return;
    
    const sound = sounds[soundName];
    if (sound) {
      // إيقاف الصوت نفسه إذا كان يعمل بالفعل ثم إعادة تشغيله
      sound.stop();
      sound.play();
    }
    
    return sound;
  }
  
  // تشغيل الموسيقى الخلفية
  playBackgroundMusic() {
    if (this.muted) return;
    
    if (!sounds.backgroundMusic.playing()) {
      sounds.backgroundMusic.play();
    }
  }
  
  // إيقاف الموسيقى الخلفية
  stopBackgroundMusic() {
    sounds.backgroundMusic.stop();
  }
  
  // التحكم في كتم/تشغيل الصوت
  toggleMute(): boolean {
    this.muted = !this.muted;
    Howler.mute(this.muted);
    
    // إيقاف/تشغيل الموسيقى الخلفية وفقًا لحالة كتم الصوت
    if (this.muted) {
      sounds.backgroundMusic.stop();
    } else if (!sounds.backgroundMusic.playing()) {
      sounds.backgroundMusic.play();
    }
    
    return this.muted;
  }
  
  // ضبط حالة كتم الصوت بشكل محدد
  setMute(muted: boolean) {
    this.muted = muted;
    Howler.mute(this.muted);
    
    // إيقاف/تشغيل الموسيقى الخلفية وفقًا لحالة كتم الصوت
    if (this.muted) {
      sounds.backgroundMusic.stop();
    } else if (!sounds.backgroundMusic.playing()) {
      sounds.backgroundMusic.play();
    }
  }
  
  // الحصول على حالة كتم الصوت الحالية
  isMuted(): boolean {
    return this.muted;
  }
  
  // إيقاف جميع الأصوات
  stopAll() {
    Object.values(sounds).forEach(sound => {
      sound.stop();
    });
  }
}

// إنشاء نسخة واحدة من خدمة الصوت
export const soundService = new SoundService();