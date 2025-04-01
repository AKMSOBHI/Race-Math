import { Question } from '@shared/schema';

// Function to generate 4 wrong answers for a given correct answer
export function generateWrongAnswers(correctAnswer: number, min: number = 0, max: number = 100): number[] {
  const wrongAnswers: number[] = [];
  const range = Math.min(20, max - min);
  
  // Add a close answer (+-1 or +-2)
  const closeOffset = Math.random() > 0.5 ? 1 : 2;
  const closeAnswer = correctAnswer + (Math.random() > 0.5 ? closeOffset : -closeOffset);
  
  if (closeAnswer >= min && closeAnswer <= max && closeAnswer !== correctAnswer) {
    wrongAnswers.push(closeAnswer);
  }
  
  // Generate remaining wrong answers until we have 4 total
  while (wrongAnswers.length < 3) {
    // Generate a random answer within range of the correct answer
    const randomOffset = Math.floor(Math.random() * range) - Math.floor(range / 2);
    const wrongAnswer = correctAnswer + randomOffset;
    
    // Ensure it's different from correct answer and not already added
    if (
      wrongAnswer !== correctAnswer && 
      !wrongAnswers.includes(wrongAnswer) &&
      wrongAnswer >= min &&
      wrongAnswer <= max
    ) {
      wrongAnswers.push(wrongAnswer);
    }
  }
  
  return wrongAnswers;
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
