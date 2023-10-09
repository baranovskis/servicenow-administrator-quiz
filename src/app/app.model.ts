export interface QuestionRaw {
  id: number;
  title: string;
  category: string;
  choices: string[];
  correctAnswers: string[];
}

export interface SurveyPage {
  elements: any[];
}
