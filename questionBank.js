const fs = require('fs');
const { parse } = require('csv-parse');

class QuestionBank {
    constructor() {
        this.questions = [];
        this.currentQuestionIndex = -1;
    }

    // 讀取 CSV 題庫
    async loadQuestions(filePath) {
        try {
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            return new Promise((resolve, reject) => {
                parse(fileContent, {
                    columns: true,
                    skip_empty_lines: true
                }, (err, records) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    this.questions = records;
                    this.shuffleQuestions();
                    resolve(records);
                });
            });
        } catch (error) {
            console.error('Error loading questions:', error);
            throw error;
        }
    }

    // 打亂題目順序
    shuffleQuestions() {
        for (let i = this.questions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.questions[i], this.questions[j]] = [this.questions[j], this.questions[i]];
        }
    }

    // 取得下一題
    getNextQuestion() {
        this.currentQuestionIndex++;
        if (this.currentQuestionIndex >= this.questions.length) {
            return null; // 題目已用完
        }
        
        const question = this.questions[this.currentQuestionIndex];
        return {
            question: question.question,
            options: {
                A: question.optionA,
                B: question.optionB,
                C: question.optionC,
                D: question.optionD
            }
        };
    }

    // 檢查答案
    checkAnswer(answer) {
        if (this.currentQuestionIndex < 0 || this.currentQuestionIndex >= this.questions.length) {
            return false;
        }
        return this.questions[this.currentQuestionIndex].correctAnswer === answer;
    }
}

module.exports = QuestionBank;