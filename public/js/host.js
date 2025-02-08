const socket = io();
let gameId = null;

// DOM 元素
const createGameBtn = document.getElementById('createGameBtn');
const gameCodeDisplay = document.getElementById('gameCode');
const nextQuestionBtn = document.getElementById('nextQuestionBtn');
const startBuzzerBtn = document.getElementById('startBuzzerBtn');
const resetBuzzerBtn = document.getElementById('resetBuzzerBtn');
const currentQuestionDisplay = document.getElementById('currentQuestion');
const optionsDisplay = document.getElementById('options');
const buzzerStatusDisplay = document.getElementById('buzzerStatus');
const player1Status = document.getElementById('player1Status');
const player2Status = document.getElementById('player2Status');

// 遊戲狀態
let playerScores = new Map();

// 創建遊戲
createGameBtn.addEventListener('click', () => {
    console.log('Creating new game...');
    socket.emit('createGame');
});

// 接收遊戲創建確認
socket.on('gameCreated', (receivedGameId) => {
    console.log('Game created with ID:', receivedGameId);
    gameId = receivedGameId;
    gameCodeDisplay.textContent = `遊戲代碼: ${gameId}`;
    createGameBtn.disabled = true;
});

// 下一題
nextQuestionBtn.addEventListener('click', () => {
    if (gameId) {
        console.log('Requesting next question for game:', gameId);
        socket.emit('requestNextQuestion', gameId);
        startBuzzerBtn.disabled = false;
        resetBuzzerBtn.disabled = true;
        buzzerStatusDisplay.textContent = '';
    }
});

// 開放搶答
startBuzzerBtn.addEventListener('click', () => {
    if (gameId) {
        console.log('Enabling buzzer for game:', gameId);
        socket.emit('enableBuzzer', gameId);
        startBuzzerBtn.disabled = true;
        resetBuzzerBtn.disabled = false;
    }
});

// 重置搶答
resetBuzzerBtn.addEventListener('click', () => {
    if (gameId) {
        console.log('Resetting buzzer for game:', gameId);
        socket.emit('resetBuzzer', gameId);
        startBuzzerBtn.disabled = false;
        buzzerStatusDisplay.textContent = '';
    }
});

// 接收新題目
socket.on('newQuestion', (data) => {
    console.log('Received new question:', data);
    currentQuestionDisplay.textContent = data.question;
    optionsDisplay.innerHTML = '';
    Object.entries(data.options).forEach(([key, value]) => {
        optionsDisplay.innerHTML += `<div>${key}: ${value}</div>`;
    });
});

// 玩家加入
socket.on('playerJoined', (data) => {
    console.log('Player joined:', data);
    const playerStatus = data.playerNumber === 1 ? player1Status : player2Status;
    
    // 初始化玩家分數
    playerScores.set(data.playerId, 0);
    
    // 設置玩家資訊
    playerStatus.setAttribute('data-player-id', data.playerId);
    playerStatus.innerHTML = `
        玩家${data.playerNumber}: ${data.playerName}
        <div class="score" id="score-${data.playerId}">分數: 0</div>
    `;
    
    console.log('Updated player status element:', playerStatus.outerHTML);
    console.log('Current player scores:', playerScores);
});

// 玩家搶答
socket.on('playerBuzzed', (data) => {
    console.log('Player buzzed:', data);
    buzzerStatusDisplay.textContent = `${data.playerName} 搶答!`;
    startBuzzerBtn.disabled = true;
    resetBuzzerBtn.disabled = false;
});

// 答案結果
socket.on('answerResult', (data) => {
    console.log('Received answer result:', data);
    const resultText = data.isCorrect ? '答對了!' : '答錯了!';
    buzzerStatusDisplay.textContent = `${data.playerName} ${resultText}`;
    
    // 更新分數
    data.scores.forEach(([playerId, score]) => {
        console.log(`Updating score for player ${playerId}: ${score}`);
        
        // 更新本地分數記錄
        playerScores.set(playerId, score);
        
        // 更新 UI 顯示
        const playerElement = document.querySelector(`[data-player-id="${playerId}"]`);
        if (playerElement) {
            const scoreElement = playerElement.querySelector('.score');
            if (scoreElement) {
                scoreElement.textContent = `分數: ${score}`;
                console.log(`Score updated for player ${playerId} to ${score}`);
            } else {
                console.error(`Score element not found for player ${playerId}`);
            }
        } else {
            console.error(`Player element not found for ID ${playerId}`);
        }
    });
    
    console.log('Current player scores after update:', playerScores);
});

// 玩家離開
socket.on('playerLeft', (data) => {
    console.log('Player left:', data);
    const playerElement = document.querySelector(`[data-player-id="${data.playerId}"]`);
    if (playerElement) {
        playerElement.innerHTML = '玩家: 未加入<div class="score">分數: 0</div>';
        playerElement.removeAttribute('data-player-id');
        playerScores.delete(data.playerId);
        console.log('Updated player scores after leave:', playerScores);
    }
});

// 遊戲結束
socket.on('gameOver', () => {
    console.log('Game over');
    currentQuestionDisplay.textContent = '遊戲結束!';
    optionsDisplay.innerHTML = '';
    startBuzzerBtn.disabled = true;
    resetBuzzerBtn.disabled = true;
});