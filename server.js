const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');
const QuestionBank = require('./questionBank');

// 設置靜態文件目錄
app.use(express.static('public'));

// 初始化題庫
const questionBank = new QuestionBank();

// 載入題目
questionBank.loadQuestions(path.join(__dirname, 'questions.csv'))
    .then(() => console.log('Question bank loaded successfully'))
    .catch(error => console.error('Failed to load question bank:', error));

// 遊戲狀態管理
const games = new Map();

// Socket.IO 連接處理
io.on('connection', (socket) => {
    // 創建新遊戲
    socket.on('createGame', () => {
        const gameId = generateGameId();
        games.set(gameId, {
            host: socket.id,
            players: new Map(),
            currentQuestion: null,
            buzzerEnabled: false,
            scores: new Map()
        });
        socket.join(gameId);
        socket.emit('gameCreated', gameId);
    });

    // 玩家加入遊戲
    socket.on('joinGame', (data) => {
        const { gameId, playerName } = data;
        const game = games.get(gameId);
        
        if (game && game.players.size < 2) {
            game.players.set(socket.id, playerName);
            game.scores.set(socket.id, 0);
            socket.join(gameId);
            
            socket.emit('joinedGame', {
                playerName,
                playerId: socket.id
            });
            
            io.to(game.host).emit('playerJoined', {
                playerId: socket.id,
                playerName,
                playerNumber: game.players.size
            });
        }
    });

    // 主持人請求下一題
    socket.on('requestNextQuestion', (gameId) => {
        const game = games.get(gameId);
        if (game && game.host === socket.id) {
            const nextQuestion = questionBank.getNextQuestion();
            if (nextQuestion) {
                game.currentQuestion = nextQuestion;
                game.buzzerEnabled = false;
                io.to(gameId).emit('newQuestion', {
                    question: nextQuestion.question,
                    options: nextQuestion.options
                });
            } else {
                io.to(gameId).emit('gameOver');
            }
        }
    });

    // 開放搶答
    socket.on('enableBuzzer', (gameId) => {
        const game = games.get(gameId);
        if (game && game.host === socket.id) {
            game.buzzerEnabled = true;
            io.to(gameId).emit('buzzerEnabled');
        }
    });

    // 玩家搶答
    socket.on('buzz', (gameId) => {
        const game = games.get(gameId);
        if (game && game.buzzerEnabled && game.players.has(socket.id)) {
            game.buzzerEnabled = false;
            io.to(gameId).emit('playerBuzzed', {
                playerId: socket.id,
                playerName: game.players.get(socket.id)
            });
        }
    });

    // 提交答案
    socket.on('submitAnswer', (data) => {
        const { gameId, answer } = data;
        const game = games.get(gameId);
        
        if (game && game.currentQuestion) {
            const isCorrect = questionBank.checkAnswer(answer);
            if (isCorrect) {
                // 確保當前分數是數字
                const currentScore = parseInt(game.scores.get(socket.id) || 0);
                // 加 1 分並儲存
                game.scores.set(socket.id, currentScore + 1);
                console.log(`Player ${socket.id} score updated to: ${currentScore + 1}`);
            }
            
            // 將分數轉換為陣列並發送
            const scoresArray = Array.from(game.scores.entries());
            console.log('Current scores:', scoresArray);
            
            io.to(gameId).emit('answerResult', {
                playerId: socket.id,
                playerName: game.players.get(socket.id),
                isCorrect,
                scores: scoresArray
            });
        }
    });

    // 重置搶答狀態
    socket.on('resetBuzzer', (gameId) => {
        const game = games.get(gameId);
        if (game && game.host === socket.id) {
            game.buzzerEnabled = false;
            io.to(gameId).emit('buzzerReset');
        }
    });

    // 斷開連接處理
    socket.on('disconnect', () => {
        for (const [gameId, game] of games) {
            if (game.host === socket.id) {
                io.to(gameId).emit('hostLeft');
                games.delete(gameId);
            } else if (game.players.has(socket.id)) {
                game.players.delete(socket.id);
                game.scores.delete(socket.id);
                io.to(game.host).emit('playerLeft', {
                    playerId: socket.id
                });
            }
        }
    });
});

// 生成遊戲ID的輔助函數
function generateGameId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// 啟動服務器
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});