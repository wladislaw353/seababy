class UI {
    constructor(game) {
        this.game = game;
        this.startScreen = document.getElementById('start-screen');
        this.waitingScreen = document.getElementById('waiting-screen');
        this.gameScreen = document.getElementById('game-screen');
        this.endScreen = document.getElementById('end-screen');
        this.playerBoard = document.getElementById('player-board');
        this.opponentBoard = document.getElementById('opponent-board');
        this.turnInfo = document.getElementById('turn-info');
        this.turnArrow = document.getElementById('turn-arrow');
        this.endScreenShown = false;
    }

    showWaitingScreen(gameCode) {
        this.startScreen.style.display = 'none';
        this.waitingScreen.style.display = 'block';
        this.gameScreen.style.display = 'none';
        this.endScreen.style.display = 'none';
        document.getElementById('waiting-game-code').textContent = gameCode;
    }

    hideWaitingScreen() {
        this.waitingScreen.style.display = 'none';
    }

    updateGameScreen() {
        this.startScreen.style.display = 'none';
        this.waitingScreen.style.display = 'none';
        this.gameScreen.style.display = 'block';
        this.endScreen.style.display = 'none';
    }

    showGameCode(code) {
        alert(`Ваш код игры: ${code}`);
    }

    showError(message) {
        alert(message);
    }

    renderBoards() {
        this.renderBoard(this.playerBoard, this.game.playerBoard.grid, true);
        this.renderBoard(this.opponentBoard, this.game.opponentBoard.grid, false);
    }

    renderBoard(element, board, isPlayerBoard) {
        element.innerHTML = '';
        for (let y = 0; y < board.length; y++) {
            for (let x = 0; x < board[y].length; x++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                const cellState = board[y][x];
                
                if (isPlayerBoard || cellState === 'hit' || cellState === 'miss' || cellState === 'sunk') {
                    cell.classList.add(cellState || 'empty');
                    cell.textContent = this.getCellEmoji(cellState, isPlayerBoard);
                }
                
                if (!isPlayerBoard && cellState !== 'hit' && cellState !== 'miss' && cellState !== 'sunk') {
                    cell.addEventListener('click', () => this.game.makeMove(x, y));
                }
                
                element.appendChild(cell);
            }
        }
    }

    updateCellDisplay(board, x, y, state) {
        const isPlayerBoard = board === this.game.playerBoard;
        const boardElement = isPlayerBoard ? this.playerBoard : this.opponentBoard;
        const index = y * board.size + x;
        if (index >= 0 && index < boardElement.children.length) {
            const cell = boardElement.children[index];
            const emoji = this.getCellEmoji(state, isPlayerBoard);
            cell.textContent = emoji;
            cell.className = 'cell ' + state;
            
            // Форсируем перерисовку
            void cell.offsetWidth;
        }
    }

    getCellEmoji(cellState, isPlayerBoard) {
        switch (cellState) {
            case 'ship':
                return isPlayerBoard ? '🚢' : '';
            case 'miss':
                return '🌊';
            case 'hit':
                return '💥';
            case 'sunk':
                return '❌';
            default:
                return '';
        }
    }

    updateTurnInfo(isPlayerTurn) {
        this.turnInfo.textContent = isPlayerTurn ? 'Ваш ход' : 'Ход противника';
        this.turnArrow.textContent = isPlayerTurn ? '🟢' : '🔴';
    }

    showEndScreen(isWinner) {
        if (this.endScreenShown) return; // Предотвращаем повторный вызов
        this.endScreenShown = true;

        this.gameScreen.style.display = 'none';
        this.endScreen.style.display = 'block';
        const resultElement = document.getElementById('result');
        resultElement.textContent = isWinner ? 'Вы победили!' : 'Вы проиграли!';
        resultElement.style.color = isWinner ? 'green' : 'red';
        
        const countdownElement = document.getElementById('countdown');
        if (!countdownElement) {
            const newCountdownElement = document.createElement('div');
            newCountdownElement.id = 'countdown';
            this.endScreen.appendChild(newCountdownElement);
        }
        
        let countdown = 3;
        const updateCountdown = () => {
            const element = document.getElementById('countdown');
            if (element) {
                element.textContent = `Перенаправление через ${countdown} секунды...`;
                if (countdown <= 0) {
                    clearInterval(countdownInterval);
                    window.location.href = '/';
                }
                countdown--;
            } else {
                clearInterval(countdownInterval);
            }
        };
        
        updateCountdown();
        const countdownInterval = setInterval(updateCountdown, 1000);
    }
}