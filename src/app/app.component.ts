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
  questions!: QuestionRaw[];

  constructor(private readonly changeDetector: ChangeDetectorRef, private readonly httpClient: HttpClient) {}

  ngOnInit() {
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
        html: "You are about to start a quiz on American history. <br>You will have 90 minutes to end the quiz.<br>Click <b>Start Quiz</b> to begin."
      }]
    });

    const shuffled = [...this.questions].sort(() => 0.5 - Math.random());
    shuffled.slice(0, 60).forEach(question => {
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
    quizModel.maxTimeToFinish = 5400;
    quizModel.firstPageIsStarted = true;
    quizModel.startSurveyText = "Start Quiz";

    quizModel.onComplete.add((sender, options) => {
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
        if (!!html) {
          options.html = html;
        }

        // TODO: Find best way how to highlight the correct answer
        sender.getAllQuestions().forEach(q => {
          if (!Array.isArray(q.correctAnswer)) {
            if (q.correctAnswer === options.text) {
              options.html = '<strong>' + options.text + '</strong>';
              return;
            }
          } else {
            for (let i = 0; i < q.correctAnswer.length; i++) {
              if (q.correctAnswer[i] === options.text) {
                options.html = '<strong>' + options.text + '</strong>';
                return;
              }
            }
          }
        })
      });

      sender.getAllQuestions().forEach(q => renderCorrectAnswer(q));

      this.model = sender;
      this.changeDetector.detectChanges();
    });

    this.model = quizModel;
    this.changeDetector.detectChanges();
  }
}
