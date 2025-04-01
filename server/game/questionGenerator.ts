import { GameStage, Question, QuestionType } from "@shared/schema";
import { nanoid } from "nanoid";

// Define difficulty levels
type Difficulty = "easy" | "medium" | "hard";

// Random number generator within range
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generate question text based on numbers and operation
function formatQuestion(num1: number, num2: number, type: QuestionType): string {
  switch (type) {
    case "ADDITION":
      return `${num1} + ${num2}`;
    case "SUBTRACTION":
      return `${num1} - ${num2}`;
    case "MULTIPLICATION":
      return `${num1} × ${num2}`;
    case "DIVISION":
      return `${num1} ÷ ${num2}`;
  }
}

// Calculate answer based on numbers and operation
function calculateAnswer(num1: number, num2: number, type: QuestionType): number {
  switch (type) {
    case "ADDITION":
      return num1 + num2;
    case "SUBTRACTION":
      return num1 - num2;
    case "MULTIPLICATION":
      return num1 * num2;
    case "DIVISION":
      return num1 / num2;
  }
}

// Generate a single question based on type and difficulty
function generateQuestion(type: QuestionType, difficulty: Difficulty): Question {
  let num1: number, num2: number;
  
  switch (type) {
    case "ADDITION":
      if (difficulty === "easy") {
        num1 = randomInt(1, 10);
        num2 = randomInt(1, 10);
      } else if (difficulty === "medium") {
        num1 = randomInt(10, 50);
        num2 = randomInt(10, 50);
      } else {
        num1 = randomInt(50, 100);
        num2 = randomInt(50, 100);
      }
      break;
    
    case "SUBTRACTION":
      if (difficulty === "easy") {
        num2 = randomInt(1, 10);
        num1 = randomInt(num2, 20); // Ensure num1 > num2 for positive result
      } else if (difficulty === "medium") {
        num2 = randomInt(10, 50);
        num1 = randomInt(num2, 100);
      } else {
        num2 = randomInt(50, 100);
        num1 = randomInt(num2, 200);
      }
      break;
    
    case "MULTIPLICATION":
      if (difficulty === "easy") {
        num1 = randomInt(1, 5);
        num2 = randomInt(1, 5);
      } else if (difficulty === "medium") {
        num1 = randomInt(2, 10);
        num2 = randomInt(2, 10);
      } else {
        num1 = randomInt(5, 12);
        num2 = randomInt(5, 12);
      }
      break;
    
    case "DIVISION":
      if (difficulty === "easy") {
        num2 = randomInt(1, 5);
        num1 = num2 * randomInt(1, 5); // Ensure clean division
      } else if (difficulty === "medium") {
        num2 = randomInt(2, 10);
        num1 = num2 * randomInt(2, 10);
      } else {
        num2 = randomInt(2, 12);
        num1 = num2 * randomInt(5, 12);
      }
      break;
      
    default:
      num1 = 1;
      num2 = 1;
  }
  
  const text = formatQuestion(num1, num2, type);
  const answer = calculateAnswer(num1, num2, type);
  
  return {
    id: nanoid(),
    text,
    answer,
    type
  };
}

// Generate a set of questions for a specific stage
export function generateQuestionsForStage(stage: GameStage, difficulty: Difficulty): Question[] {
  try {
    const questions: Question[] = [];
    
    // Generate 5 questions per stage
    switch (stage) {
      case "BASIC_ADDITION_SUBTRACTION":
        // 3 addition, 2 subtraction
        for (let i = 0; i < 3; i++) {
          questions.push(generateQuestion("ADDITION", difficulty));
        }
        for (let i = 0; i < 2; i++) {
          questions.push(generateQuestion("SUBTRACTION", difficulty));
        }
        break;
      
      case "COMPLEX_ADDITION_SUBTRACTION":
        // 2 addition, 3 subtraction with higher difficulty
        for (let i = 0; i < 2; i++) {
          questions.push(generateQuestion("ADDITION", 
            difficulty === "easy" ? "medium" : "hard"));
        }
        for (let i = 0; i < 3; i++) {
          questions.push(generateQuestion("SUBTRACTION", 
            difficulty === "easy" ? "medium" : "hard"));
        }
        break;
      
      case "MULTIPLICATION":
        // 5 multiplication questions
        for (let i = 0; i < 5; i++) {
          questions.push(generateQuestion("MULTIPLICATION", difficulty));
        }
        break;
      
      case "DIVISION":
        // 5 division questions
        for (let i = 0; i < 5; i++) {
          questions.push(generateQuestion("DIVISION", difficulty));
        }
        break;
      
      default:
        // If we somehow get an invalid stage, default to basic addition
        console.error(`Unknown stage: ${stage}, defaulting to basic addition`);
        for (let i = 0; i < 5; i++) {
          questions.push(generateQuestion("ADDITION", "easy"));
        }
        break;
    }
    
    // Ensure we have at least 5 questions
    if (questions.length < 5) {
      console.warn(`Generated only ${questions.length} questions for stage ${stage}, adding more basic questions`);
      // Add some basic addition questions to fill the gap
      for (let i = questions.length; i < 5; i++) {
        questions.push(generateQuestion("ADDITION", "easy"));
      }
    }
    
    // Shuffle the questions
    return questions.sort(() => Math.random() - 0.5);
  } catch (error) {
    console.error("Error generating questions:", error);
    // Return a set of fallback questions if generation fails
    const fallbackQuestions: Question[] = [];
    for (let i = 0; i < 5; i++) {
      fallbackQuestions.push({
        id: `fallback-${i}`,
        text: `${i + 1} + ${i + 2}`,
        answer: (i + 1) + (i + 2),
        type: "ADDITION"
      });
    }
    return fallbackQuestions;
  }
}
