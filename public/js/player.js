const socket = io();

// DOM 元素
const joinForm = document.getElementById('joinForm');
const gameArea = document.getElementById('gameArea');
const gameCodeInput = document.getElementById('gameCodeInput');
const playerNameInput = document.getElementById('playerNameInput');
const joinGameBtn = document.getElementById('joinGameBtn');
const buzzerButton = document.getElementById('buzzerButton');
const currentQuestionDisplay = document.getElementById('currentQuestion');
const optionsDisplay = document.getElementById('options');
const answerSection = document.getElementById('answerSection');
const playerInfo = document.getElementById('playerInfo');
const scoreDisplay = document.getElementById('score');
const statusDisplay = document.getElementById('status');

let gameId = null;
let playerName = null;

// 加入遊戲
joinGameBtn.addEventListener('click', () => {
    gameId = gameCodeInput.value.trim();
    playerName = playerNameInput.value.trim();
    
    if (gameId && playerName) {
        socket.emit('joinGame', { gameId, playerName });
    }
});

// 搶答按鈕
buzzerButton.addEventListener('click', () => {
    if (gameId) {
        socket.emit('buzz', gameId);
        buzzerButton.disabled = true;
    }
});

// 提交答案
function submitAnswer(answer) {
    if (gameId) {
        socket.emit('submitAnswer', { gameId, answer });
        answerSection.style.display = 'none';
    }
}

// 加入遊戲確認
socket.on('joinedGame', (data) => {
    joinForm.style.display = 'none';
    gameArea.style.display = 'block';
    playerInfo.textContent = `玩家: ${data.playerName}`;
    document.body.setAttribute('data-player-id', data.playerId);
});

// 接收新題目
socket.on('newQuestion', (data) => {
    currentQuestionDisplay.textContent = data.question;
    optionsDisplay.innerHTML = '';
    Object.entries(data.options).forEach(([key, value]) => {
        optionsDisplay.innerHTML += `<div>${key}: ${value}</div>`;
    });
    buzzerButton.disabled = true;
    answerSection.style.display = 'none';
    statusDisplay.textContent = '等待開放搶答...';
});

// 開放搶答
socket.on('buzzerEnabled', () => {
    buzzerButton.disabled = false;
    statusDisplay.textContent = '可以搶答!';
});

// 有人搶答
socket.on('playerBuzzed', (data) => {
    buzzerButton.disabled = true;
    if (data.playerId === socket.id) {
        answerSection.style.display = 'block';
        statusDisplay.textContent = '請選擇答案';
    } else {
        statusDisplay.textContent = `${data.playerName} 搶答中...`;
    }
});

// 答案結果
socket.on('answerResult', (data) => {
    const resultText = data.isCorrect ? '答對了!' : '答錯了!';
    statusDisplay.textContent = `${data.playerName} ${resultText}`;
    
    // 更新自己的分數
    const myScore = data.scores.find(([playerId]) => playerId === socket.id);
    if (myScore) {
        scoreDisplay.textContent = `分數: ${myScore[1]}`;
    }
});

// 搶答重置
socket.on('buzzerReset', () => {
    buzzerButton.disabled = false;
    answerSection.style.display = 'none';
    statusDisplay.textContent = '可以搶答!';
});

// 主持人離開
socket.on('hostLeft', () => {
    statusDisplay.textContent = '主持人已離開，遊戲結束';
    buzzerButton.disabled = true;
    answerSection.style.display = 'none';
});