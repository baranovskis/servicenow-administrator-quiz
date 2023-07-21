import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Model, Question } from "survey-core";
import { HttpClient } from "@angular/common/http";
import { take } from "rxjs";
import { QuestionRaw, SurveyPage } from "./app.model";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title: string = 'ServiceNow Administrator Quiz';
  model: Model = new Model();
  questions: QuestionRaw[] = new Array<QuestionRaw>();

  constructor(private readonly changeDetector: ChangeDetectorRef, private readonly httpClient: HttpClient) {}

  ngOnInit(): void {
    this.httpClient.get<QuestionRaw[]>('/assets/data.json')
      .pipe(take(1))
      .subscribe(response => {
        this.questions = response;
        this.startQuiz();
      });
  }

  startQuiz(): void {
    if (!this.questions) return;

    const pages = new Array<SurveyPage>();
    pages.push({
      elements: [{
        type: "html",
        html: "You are about to start a quiz on ServiceNow Administrator.<br>You will have 60 minutes for 30 questions to end the quiz.<br>Click <b>Start Quiz</b> to begin."
      }]
    });

    const shuffled = [...this.questions].sort(() => 0.5 - Math.random());
    shuffled.slice(0, 30).forEach(question => {
      pages.push({
        elements: [{
          "name": question.id.toString(),
          "type": question.correctAnswers.length > 1 ? "checkbox" : "radiogroup",
          "title":  question.title,
          "choicesOrder": "random",
          "correctAnswer": question.correctAnswers.length > 1 ? question.correctAnswers : question.correctAnswers[0],
          "choices":  question.choices
        }]
      });
    });

    const quizModel = new Model({pages: pages});
    quizModel.showCompletedPage = false;
    quizModel.showProgressBar = "bottom";
    quizModel.showTimerPanel = "top";
    quizModel.maxTimeToFinish = 60 * 60;
    quizModel.firstPageIsStarted = true;
    quizModel.startSurveyText = "Start Quiz";

    quizModel.onComplete.add((sender, _) => {
      sender.clear(false, true);

      sender.mode = "display";
      sender.questionsOnPageMode = "singlePage";
      sender.showNavigationButtons = "none";
      sender.showProgressBar = "off";
      sender.showTimerPanel = "none";
      sender.maxTimeToFinishPage = 0;
      sender.maxTimeToFinish = 0;

      const correctStr = "Correct";
      const inCorrectStr = "Incorrect";

      function getTextHtml(text: string, str: string, isCorrect: boolean) {
        if (text.indexOf(str) < 0) return undefined;
        return text.substring(0, text.indexOf(str)) + "<span style='color:" + (isCorrect ? "green" : "red") + "'>" + str + "</span>";
      }

      function isAnswerCorrect(q: Question) {
        const right = q.correctAnswer;
        if (!right || q.isEmpty()) return undefined;
        let left = q.value;
        if (!Array.isArray(right)) return right == left;
        if (!Array.isArray(left)) left = [left];
        for (let i = 0; i < right.length; i++) {
          if (left.indexOf(right[i]) < 0) return false;
        }
        return true;
      }

      function renderCorrectAnswer(q: Question) {
        if (!q) return;
        const isCorrect = isAnswerCorrect(q);
        if (!q['prevTitle']) {
          q['prevTitle'] = q.title;
        }
        q.title = q['prevTitle'] + ' ' + (isCorrect ? correctStr : inCorrectStr);
      }

      sender.onValueChanged.add((sender, options) => {
        renderCorrectAnswer(options.question);
      });

      sender.onTextMarkdown.add((sender, options) => {
        let text = options.text;
        let html = getTextHtml(text, correctStr, true);
        if (!html) {
          html = getTextHtml(text, inCorrectStr, false);
        }

        if (options.element instanceof Question) {
          const correctAnswers = options.element.correctAnswer;

          if (Array.isArray(correctAnswers)) {
            for (let i = 0; i < correctAnswers.length; i++) {
              if (correctAnswers[i] === options.text) {
                html = '<strong>' + options.text + '</strong>';
              }
            }
          } else {
            if (correctAnswers === options.text) {
              html = '<strong>' + options.text + '</strong>';
            }
          }
        }

        if (!!html) {
          options.html = html;
        }
      });

      sender.getAllQuestions().forEach(q => renderCorrectAnswer(q));

      this.model = sender;
      this.changeDetector.detectChanges();
    });

    this.model = quizModel;
    this.changeDetector.detectChanges();
  }
}
