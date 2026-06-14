export interface VocabWord {
  id: string;
  word: string;
  meaning: string;
  example?: string | null;
  mnemonic?: string | null;
  tips?: string | null;
  partOfSpeech?: string | null;
}

export interface VocabSet {
  id: string;
  title: string;
  description?: string | null;
  createdAt: string;
  words: VocabWord[];
  _count?: { attempts: number };
}

export interface GrammarExamples {
  correct: string[];
  wrong: string[];
}

export interface GrammarRule {
  id: string;
  title: string;
  topic: string;
  rule: string;
  memoryTrick?: string | null;
  examples: GrammarExamples;
  examTraps?: string | null;
  questions?: import("./quiz").QuizQuestion[] | null;
  createdAt: string;
}
