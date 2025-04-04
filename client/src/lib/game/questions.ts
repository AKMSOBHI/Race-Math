import { Question } from '@shared/schema';

// Function to generate realistic wrong answers for a given correct answer
export function generateWrongAnswers(correctAnswer: number, min: number = 0, max: number = 100): number[] {
  const wrongAnswers: Set<number> = new Set();
  const maxAttempts = 20; // حد أقصى لمحاولات التوليد لتجنب الحلقات الغير منتهية
  let attempts = 0;
  
  // استراتيجية 1: إضافة إجابة قريبة جداً (+-1 أو +-2)
  const closeOffset = Math.random() > 0.5 ? 1 : 2;
  const closeAnswer = correctAnswer + (Math.random() > 0.5 ? closeOffset : -closeOffset);
  
  if (closeAnswer >= min && closeAnswer <= max && closeAnswer !== correctAnswer) {
    wrongAnswers.add(closeAnswer);
  }
  
  // استراتيجية 2: خطأ شائع في الجمع/الطرح - تبديل الأرقام أو نسيان الحمل
  if (correctAnswer >= 10) {
    // تبديل أرقام العشرات والآحاد
    const tensDigit = Math.floor(correctAnswer / 10);
    const onesDigit = correctAnswer % 10;
    const swappedAnswer = onesDigit * 10 + tensDigit;
    
    if (swappedAnswer >= min && swappedAnswer <= max && swappedAnswer !== correctAnswer && !wrongAnswers.has(swappedAnswer)) {
      wrongAnswers.add(swappedAnswer);
    }
    
    // نسيان الحمل (مثلاً: ٦٨ - ١٠ = ٥٨)
    const carryMistake = correctAnswer - 10;
    if (carryMistake >= min && !wrongAnswers.has(carryMistake)) {
      wrongAnswers.add(carryMistake);
    }
  }
  
  // استراتيجية 3: توليد إجابة شبه عشوائية
  while (wrongAnswers.size < 3 && attempts < maxAttempts) {
    attempts++;
    
    // إنشاء إجابة خاطئة بناءً على الإجابة الصحيحة
    // نستخدم نطاق أصغر للأرقام الصغيرة
    const range = correctAnswer < 20 ? 10 : Math.min(30, max - min);
    const randomOffset = Math.floor(Math.random() * range) - Math.floor(range / 2);
    const wrongAnswer = correctAnswer + randomOffset;
    
    // تأكد من أن الإجابة ضمن النطاق المسموح وغير مكررة وليست هي الإجابة الصحيحة
    if (
      wrongAnswer !== correctAnswer && 
      !wrongAnswers.has(wrongAnswer) &&
      wrongAnswer >= min &&
      wrongAnswer <= max
    ) {
      wrongAnswers.add(wrongAnswer);
    }
  }
  
  // التأكد من وجود 3 إجابات خاطئة على الأقل
  const fillerAnswers = [correctAnswer + 5, correctAnswer - 7, correctAnswer + 10, correctAnswer - 4];
  
  for (const filler of fillerAnswers) {
    if (wrongAnswers.size >= 3) break;
    
    if (
      filler !== correctAnswer && 
      !wrongAnswers.has(filler) &&
      filler >= min &&
      filler <= max
    ) {
      wrongAnswers.add(filler);
    }
  }
  
  return Array.from(wrongAnswers).slice(0, 3);
}

// Function to format the stage name for display
export function formatStageName(stage: string): string {
  switch (stage) {
    case 'BASIC_ADDITION_SUBTRACTION':
      return 'Basic Addition & Subtraction';
    case 'COMPLEX_ADDITION_SUBTRACTION':
      return 'Complex Addition & Subtraction';
    case 'MULTIPLICATION':
      return 'Multiplication';
    case 'DIVISION':
      return 'Division';
    default:
      return stage;
  }
}

// Function to get emoji for the current stage
export function getStageEmoji(stage: string): string {
  switch (stage) {
    case 'BASIC_ADDITION_SUBTRACTION':
      return '➕';
    case 'COMPLEX_ADDITION_SUBTRACTION':
      return '➖';
    case 'MULTIPLICATION':
      return '✖️';
    case 'DIVISION':
      return '➗';
    default:
      return '🔢';
  }
}

// Function to get a random position for the bubble
export function getRandomBubblePosition(): { top: string; left: string } {
  // Avoid positions too close to the edges
  const top = `${10 + Math.random() * 60}%`;
  const left = `${10 + Math.random() * 80}%`;
  
  return { top, left };
}

// Functions to handle different animation delays for bubbles
export function getRandomAnimationDelay(): string {
  const delayOptions = ['animate-float', 'animate-float-delay-1', 'animate-float-delay-2'];
  return delayOptions[Math.floor(Math.random() * delayOptions.length)];
}
