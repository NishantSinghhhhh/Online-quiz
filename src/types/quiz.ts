export interface QuizOption {
  text: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  type: "mcq" | "true_false";
  options: string[];
  correctAnswer: number; // index of correct option
  explanation?: string;
  marks?: number;
}

export interface QuizData {
  title: string;
  description?: string;
  timeLimit: number; // minutes
  questions: QuizQuestion[];
}

export interface AttemptAnswer {
  [questionIndex: number]: number | null; // null = skipped
}

export interface AttemptResult {
  id: string;
  quizId: string;
  quizTitle: string;
  answers: AttemptAnswer;
  score: number;
  totalScore: number;
  timeTaken: number;
  completedAt: string;
  startedAt: string;
  questions: QuizQuestion[];
}
