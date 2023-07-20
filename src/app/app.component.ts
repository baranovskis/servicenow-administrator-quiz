import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Model, Question } from "survey-core";

const quizPages = {
  pages: [{
    elements: [{
      type: "html",
      html: "You are about to start a quiz on American history. <br>You will have 90 minutes to end the quiz.<br>Click <b>Start Quiz</b> to begin."
    }]
  }, {
    elements: [{
      type: "radiogroup",
      name: "civilwar",
      title: "When was the American Civil War?",
      choices: [
        "1796-1803", "1810-1814", "1861-1865", "1939-1945"
      ],
      correctAnswer: "1861-1865"
    }]
  }, {
    elements: [{
      type: "radiogroup",
      name: "libertyordeath",
      title: "Whose quote is this: \"Give me liberty, or give me death\"?",
      choicesOrder: "random",
      choices: [
        "John Hancock", "James Madison", "Patrick Henry", "Samuel Adams"
      ],
      correctAnswer: "Patrick Henry"
    }]
  }, {
    elements: [{
      type: "radiogroup",
      name: "magnacarta",
      title: "What is Magna Carta?",
      choicesOrder: "random",
      choices: [
        "The foundation of the British parliamentary system",
        "The Great Seal of the monarchs of England",
        "The French Declaration of the Rights of Man",
        "The charter signed by the Pilgrims on the Mayflower"
      ],
      correctAnswer: "The foundation of the British parliamentary system"
    }]
  }]
};

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title: string = 'ServiceNow Administrator Quiz';
  model!: Model

  constructor(private readonly changeDetector: ChangeDetectorRef) {}

  ngOnInit() {
    this.startQuiz();
  }

  startQuiz(): void {
    const quizModel = new Model(quizPages);
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
        for (let i = 0; i < left.length; i++) {
          if (right.indexOf(left[i]) < 0) return false;
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
          if (q.correctAnswer === options.text) {
            options.html = '<strong>' + options.text + '</strong>';
            return;
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
