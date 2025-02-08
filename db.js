// db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// 確保 data 目錄存在
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

// 創建資料庫連接
const db = new sqlite3.Database(path.join(dataDir, 'quiz.db'));

// 初始化資料庫
function initializeDatabase() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // 創建遊戲表
            db.run(`CREATE TABLE IF NOT EXISTS games (
                code TEXT PRIMARY KEY,
                current_question INTEGER DEFAULT 0,
                buzzer_enabled BOOLEAN DEFAULT FALSE,
                buzzer_pressed INTEGER DEFAULT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // 創建玩家表
            db.run(`CREATE TABLE IF NOT EXISTS players (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                game_code TEXT,
                player_number INTEGER,
                name TEXT,
                score INTEGER DEFAULT 0,
                FOREIGN KEY (game_code) REFERENCES games(code)
            )`);

            // 創建題目表
            db.run(`CREATE TABLE IF NOT EXISTS questions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content TEXT,
                option_a TEXT,
                option_b TEXT,
                option_c TEXT,
                option_d TEXT,
                correct_answer TEXT,
                points INTEGER
            )`);

            // 檢查是否需要導入預設題目
            db.get("SELECT COUNT(*) as count FROM questions", (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                // 如果沒有題目，導入預設題目
                if (row.count === 0) {
                    const defaultQuestions = [
                        ['1+1=?', '1', '2', '3', '4', 'B', 20],
                        ['1+2=?', '2', '3', '4', '5', 'B', 20],
                        ['2+2=?', '4', '5', '6', '7', 'A', 20]
                    ];

                    const stmt = db.prepare(`INSERT INTO questions 
                        (content, option_a, option_b, option_c, option_d, correct_answer, points) 
                        VALUES (?, ?, ?, ?, ?, ?, ?)`);

                    defaultQuestions.forEach(q => stmt.run(q));
                    stmt.finalize();
                }
            });
        });

        resolve();
    });
}

// 遊戲相關操作
const gameOperations = {
    // 創建新遊戲
    createGame(gameCode) {
        return new Promise((resolve, reject) => {
            db.run('INSERT INTO games (code) VALUES (?)', [gameCode], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    },

    // 獲取遊戲資訊
    getGame(gameCode) {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM games WHERE code = ?', [gameCode], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    },

    // 更新搶答狀態
    updateBuzzerStatus(gameCode, enabled, pressed = null) {
        return new Promise((resolve, reject) => {
            db.run(
                'UPDATE games SET buzzer_enabled = ?, buzzer_pressed = ? WHERE code = ?',
                [enabled ? 1 : 0, pressed, gameCode],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    },

    // 更新目前題目編號
    updateCurrentQuestion(gameCode, questionNumber) {
        return new Promise((resolve, reject) => {
            db.run(
                'UPDATE games SET current_question = ? WHERE code = ?',
                [questionNumber, gameCode],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }
};

// 玩家相關操作
const playerOperations = {
    // 添加玩家
    addPlayer(gameCode, playerNumber, name) {
        return new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO players (game_code, player_number, name) VALUES (?, ?, ?)',
                [gameCode, playerNumber, name],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    },

    // 獲取遊戲中的玩家
    getPlayers(gameCode) {
        return new Promise((resolve, reject) => {
            db.all('SELECT * FROM players WHERE game_code = ?', [gameCode], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },

    // 更新玩家分數
    updateScore(gameCode, playerNumber, points) {
        return new Promise((resolve, reject) => {
            db.run(
                'UPDATE players SET score = score + ? WHERE game_code = ? AND player_number = ?',
                [points, gameCode, playerNumber],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    },

    // 獲取玩家分數
    getScores(gameCode) {
        return new Promise((resolve, reject) => {
            db.all(
                'SELECT player_number, score FROM players WHERE game_code = ?',
                [gameCode],
                (err, rows) => {
                    if (err) reject(err);
                    else {
                        const scores = {};
                        rows.forEach(row => {
                            scores[`player${row.player_number}`] = row.score;
                        });
                        resolve(scores);
                    }
                }
            );
        });
    }
};

// 題目相關操作
const questionOperations = {
    // 獲取所有題目
    getAllQuestions() {
        return new Promise((resolve, reject) => {
            db.all('SELECT * FROM questions', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },

    // 獲取特定題目
    getQuestion(id) {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM questions WHERE id = ?', [id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    },

    // 添加新題目
    addQuestion(content, options, correctAnswer, points) {
        return new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO questions 
                (content, option_a, option_b, option_c, option_d, correct_answer, points) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [content, options.A, options.B, options.C, options.D, correctAnswer, points],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }
};

// 關閉資料庫連接
function closeDatabase() {
    return new Promise((resolve, reject) => {
        db.close((err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

module.exports = {
    initializeDatabase,
    closeDatabase,
    gameOperations,
    playerOperations,
    questionOperations
};